const { ipcMain } = require("electron");
const Store = require("electron-store");
const keytar = require("keytar");
const fs = require("fs");

const { S3Client, ListBucketsCommand, ListObjectsV2Command, DeleteObjectCommand, PutObjectCommand, GetBucketLocationCommand, GetObjectCommand, HeadObjectCommand, GetBucketCorsCommand, PutBucketCorsCommand, GetBucketPolicyCommand, PutBucketPolicyCommand, } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { Upload } = require("@aws-sdk/lib-storage");

const store = new Store({ name: "prefs", defaults: { region: "eu-west-2" } });
const SERVICE = "stash3.io";

const clientCache = new Map();

async function ensureDirForFile(filePath) {
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
}

async function s3ClientForUser(accountHandle) {
    try {
        const region = store.get("region") || "eu-west-2";

        // Check cache first
        if (clientCache.has(`${region}_${accountHandle}`)) {
            const cachedClient = clientCache.get(accountHandle);
            if (cachedClient) return cachedClient;
            clientCache.delete(`${region}_${accountHandle}`); // cleanup
        }
        
        const accessKeyId = await keytar.getPassword(`${SERVICE}:akid`, accountHandle);
        const secretAccessKey = await keytar.getPassword(`${SERVICE}:secret`, accountHandle);
        if (!accessKeyId || !secretAccessKey) {
            console.error("Missing AWS credentials");
            return null;
        }
        const client = new S3Client({region, credentials: {accessKeyId, secretAccessKey}});
        if (!client) {
            console.error("[s3ClientForUser]", err);
            return null;
        }
        clientCache.set(`${region}_${accountHandle}`, client);
        return client;
    } catch (err) {
        console.error("[s3ClientForUser]", err);
        return null;
    }
}

async function resolveBucketRegion(client, bucket) {
    try {
        if (bucket === null || bucket === undefined || bucket === "") return "eu-west-2";
        const {LocationConstraint} = await client.send(new GetBucketLocationCommand({Bucket: bucket}));
        return LocationConstraint || "us-east-1";
    } catch (err) {
        console.error("[resolveBucketRegion]", err);
        return "eu-west-2";
    }
}

async function GetClientForBucket(accountHandle, bucket){
    try {
        const s3 = await s3ClientForUser(accountHandle);
        const bucketRegion = await resolveBucketRegion(s3, bucket);
        store.set('region', bucketRegion);
        return await s3ClientForUser(accountHandle);
    } catch (err) {
        console.error("[GetClientForBucket]", err);
        return null;
    }
}

// IPC handlers
ipcMain.handle("s3:listBuckets", async (e, accountHandle) => {
    const s3 = await s3ClientForUser(accountHandle);
    const { Buckets } = await s3.send(new ListBucketsCommand({}));
    return Buckets ?? [];
});

ipcMain.handle("s3:listObjects", async (_e, accountHandle, bucket, prefix = "") => {
    try {
        const s3 = await GetClientForBucket(accountHandle, bucket);
        
        if (!s3) {
            return {files: [], folders: [], error: "No S3 client" };
        }
        const {Contents, CommonPrefixes} = await s3.send(
            new ListObjectsV2Command({Bucket: bucket, Prefix: prefix, Delimiter: "/"})
        );
        return {files: Contents ?? [], folders: CommonPrefixes ?? [], error: null};
    } catch (err) {
        console.error(err);
        return {files: [], folders: [], error: err.message};
    }
});

ipcMain.handle("s3:upload", async (e, accountHandle, { bucket, key, filePath }) => {
    try {
        const s3 = await s3ClientForUser(accountHandle);
        if (!s3) {
            e.sender.send("s3:uploadEnd", { key, status: false });
            return { ok: false, error: "No S3 client" };
        }

        // derive content type from extension
        let contentType = '';
        const ext = (key.split(".").pop() || "").toLowerCase();
        if (ext === "pdf") {
            contentType = "application/pdf";
        }
        if (ext === "txt") {
            contentType = "text/plain";
        }
        if (ext === "jpg" || ext === "jpeg") {
            contentType = "image/jpeg";
        }
        if (ext === "gif") {
            contentType = "image/gif";
        }
        if (ext === "mp4") {
            contentType = "video/mp4";
        }
        if (ext === "mp3") {
            contentType = "audio/mpeg";
        }
        if (ext === "json") {
            contentType = "application/json";
        }
        if (ext === "csv") {
            contentType = "text/csv";
        }
        if (ext === "html" || ext === "htm") {
            contentType = "text/html";
        }
        // you can expand this mapping if you want (png → image/png, etc.)
        
        const body = {
            Bucket: bucket,
            Key: key,
            Body: fs.createReadStream(filePath),
            ...(contentType ? { ContentType: contentType } : {}),
        };

        const upload = new Upload({
            client: s3,
            params: body,
            queueSize: 4,
            leavePartsOnError: false,
        });

        upload.on("httpUploadProgress", (p) => {
            if (p.percent < 100) {
                e.sender.send("s3:uploadProgress", {
                    key,
                    loaded: p.loaded,
                    total: p.total,
                });
            } else {
                e.sender.send("s3:uploadEnd", { key, status: true });
            }
        });

        await upload.done();
        return { ok: true };
    } catch (err) {
        e.sender.send("s3:uploadEnd", { key, status: false });
        return { ok: false, error: err.message };
    }
});


ipcMain.handle("s3:createFolder", async (_e, accountHandle, bucket, prefix) => {
    try {
        const s3 = await s3ClientForUser(accountHandle);
        const key = prefix.endsWith("/") ? prefix : prefix + "/";
        await s3.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: new Uint8Array(0),
                ContentLength: 0,
            })
        );

        _e.sender.send("s3:uploadEnd", {
            key: prefix,
            status: true
        });
        
        return { ok: true, error: null };
    } catch (err) {
        console.error("[s3:createFolder]", err);
        return { ok: false, error: err.message };
    }
});



ipcMain.handle("s3:deleteObject", async (_e, accountHandle, bucket, key) => {
    try {
        const s3 = await s3ClientForUser(accountHandle);
        console.log({Bucket: bucket, Key: key});
        await s3.send(new DeleteObjectCommand({Bucket: bucket, Key: key}));
        
        // we should really try and re-fet the object list to confirm deletion
        
        
        
        return { ok: true, error: null };
    } catch (err) {
        console.error("[s3:deleteObject]", err);
        return {ok: false, error: err.message};
    }
});

ipcMain.handle("s3:getObjectHead", async (_e, accountHandle, bucket, key) => {
    try {
        const s3 = await s3ClientForUser(accountHandle);
        if (!s3) {
            return {ok: false, error: "No S3 client"};
        }
        const out = await s3.send(new HeadObjectCommand({Bucket: bucket, Key: key}));
        return {
            ok: true,
            error: null,
            head: {
                contentType: out.ContentType,
                contentLength: Number(out.ContentLength ?? 0),
                etag: out.ETag,
                lastModified: out.LastModified,
            }
        };
    } catch (err) {
        console.error("[s3:getObjectHead]", err);
        return { ok: false, error: err.message };
    }
});

ipcMain.handle("s3:getPreSignedUrl", async (_e, accountHandle, bucket, key, expiresIn = 3600) => {
    try {
        const s3 = await s3ClientForUser(accountHandle);
        if (!s3) {
            return {ok: false, error: "No S3 client"};
        }
        const cmd = new GetObjectCommand({Bucket: bucket, Key: key});
        const signedUrl = await getSignedUrl(s3, cmd, {expiresIn});
        return { ok: true, error: null, url: signedUrl };
    } catch (err) {
        console.error("[s3:getPreSignedUrl]", err);
        return { ok: false, error: err.message };
    }
})

ipcMain.handle("s3:getObjectUrl", async (_e, accountHandle, bucket, key) => {
    try {
        const s3 = await GetClientForBucket(accountHandle, bucket);
        if (!s3) {
            return {ok: false, error: "No S3 client"};
        }
        const region = store.get('region');
        return {
            url: `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`,
            error: null
        };
    } catch (err) {
        console.error("[s3:getObjectUrl]", err);
        return { url: null, error: err.message };
    }
});

ipcMain.handle("s3:getBucketUrl", async (_e, accountHandle, bucket) => {
    try {
        const s3 = await GetClientForBucket(accountHandle, bucket);
        if (!s3) {
            return {ok: false, error: "No S3 client"};
        }
        const region = store.get('region');
        return {
            url: `https://${bucket}.s3.${region}.amazonaws.com/`,
            error: null
        };
    } catch (err) {
        console.error("[s3:getObjectUrl]", err);
        return { url: null, error: err.message };
    }
});

ipcMain.handle('s3:downloadAll', async (_e, accountHandle, bucket, destDir) => {
    try {
        const s3 = await GetClientForBucket(accountHandle, bucket);
        if (!s3) return { ok: false, error: 'No S3 client' };

        let ContinuationToken = undefined;
        let count = 0;
        let bytes = 0;

        do {
            const page = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken }));
            const items = page.Contents || [];

            // Sequential to keep it simple/reliable (can add concurrency later)
            for (const obj of items) {
                if (!obj.Key) continue;
                const keyPath = path.join(destDir, obj.Key);
                await ensureDirForFile(keyPath);

                const { Body } = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: obj.Key }));
                await streamPipeline(Body, fs.createWriteStream(keyPath));
                count += 1;
                bytes += obj.Size || 0;
            }

            ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
        } while (ContinuationToken);

        return { ok: true, count, bytes, error: null };
    } catch (err) {
        console.error('[s3:downloadAll]', err);
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('s3:getCors', async (_e, accountHandle, bucket) => {
    try {
        const s3 = await GetClientForBucket(accountHandle, bucket);
        if (!s3) return { ok: false, error: 'No S3 client' };

        try {
            const res = await s3.send(new GetBucketCorsCommand({ Bucket: bucket }));
            return { ok: true, rules: res.CORSRules || [], error: null };
        } catch (err) {
            // If no CORS config set, AWS throws NoSuchCORSConfiguration
            if (err?.name === 'NoSuchCORSConfiguration' || err?.$metadata?.httpStatusCode === 404) {
                return { ok: true, rules: [], error: null };
            }
            throw err;
        }
    } catch (err) {
        console.error('[s3:getCors]', err);
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('s3:saveCors', async (_e, accountHandle, bucket, corsRules /* array */) => {
    try {
        const s3 = await GetClientForBucket(accountHandle, bucket);
        if (!s3) return { ok: false, error: 'No S3 client' };

        await s3.send(
            new PutBucketCorsCommand({
                Bucket: bucket,
                CORSConfiguration: { CORSRules: corsRules || [] },
            })
        );

        return { ok: true, error: null };
    } catch (err) {
        console.error('[s3:saveCors]', err);
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('s3:getBucketPolicy', async (_e, accountHandle, bucket) => {
    try {
        const s3 = await GetClientForBucket(accountHandle, bucket);
        if (!s3) return { ok: false, error: 'No S3 client' };

        try {
            const res = await s3.send(new GetBucketPolicyCommand({ Bucket: bucket }));
            // res.Policy is a JSON string when present
            return { ok: true, policy: res.Policy ?? null, error: null };
        } catch (err) {
            // If no policy exists, S3 may return NoSuchBucketPolicy / 404
            if (err?.name === 'NoSuchBucketPolicy' || err?.$metadata?.httpStatusCode === 404) {
                return { ok: true, policy: null, error: null };
            }
            throw err;
        }
    } catch (err) {
        console.error('[s3:getBucketPolicy]', err);
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('s3:saveBucketPolicy', async (_e, accountHandle, bucket, policy) => {
    try {
        const s3 = await GetClientForBucket(accountHandle, bucket);
        if (!s3) return { ok: false, error: 'No S3 client' };

        const policyString = typeof policy === 'string' ? policy : JSON.stringify(policy);
        await s3.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: policyString }));

        return { ok: true, error: null };
    } catch (err) {
        console.error('[s3:saveBucketPolicy]', err);
        return { ok: false, error: err.message };
    }
});

ipcMain.handle("prefs:setRegion", (_e, region) => {
    store.set("region", region);
    return { ok: true };
});

ipcMain.handle("creds:set", async (_e, accountHandle, accessKeyId, secretAccessKey) => {
    await keytar.setPassword(`${SERVICE}:akid`, accountHandle, accessKeyId);
    await keytar.setPassword(`${SERVICE}:secret`, accountHandle, secretAccessKey);
    return { ok: true };
});

ipcMain.handle("creds:get", async (_e, accountHandle) => {
    const accessKeyId = await keytar.getPassword(`${SERVICE}:akid`, accountHandle);
    const secretAccessKey = await keytar.getPassword(`${SERVICE}:secret`, accountHandle);
    if (!accessKeyId || !secretAccessKey) {
        return { ok: false, error: "No credentials found" };
    }
    return { ok: true, accessKeyId, secretAccessKey };
});

ipcMain.handle("creds:remove", async (_e, accountHandle) => {
    await keytar.deletePassword(`${SERVICE}:akid`, accountHandle);
    await keytar.deletePassword(`${SERVICE}:secret`, accountHandle);
    return { ok: true };
});
