import { ipcMain } from 'electron';
import Store from 'electron-store';
import keytar from 'keytar';
import fs from 'fs';
import path from "path";
import fsp from 'fs/promises';
import { pipeline } from 'stream';
import { promisify } from 'util';
const streamPipeline = promisify(pipeline)
import { pipeline as pipelinePromise } from "stream/promises";
import { Readable } from "stream";

import {
    S3Client,
    ListBucketsCommand,
    ListObjectsV2Command,
    DeleteObjectCommand,
    PutObjectCommand,
    GetBucketLocationCommand,
    GetObjectCommand,
    HeadObjectCommand,
    GetBucketCorsCommand,
    PutBucketCorsCommand,
    GetBucketPolicyCommand,
    PutBucketPolicyCommand,
    GetPublicAccessBlockCommand,
    PutPublicAccessBlockCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from '@aws-sdk/lib-storage';

type Prefs = { region: string };

const store = new Store<Prefs>({
    name: 'prefs',
    defaults: { region: 'eu-west-2' },
});
const SERVICE = "stash3.io";

const clientCache = new Map();

export class Account {
    handle: string;
    accountType: 'S3' | 'R2';
    r2AccountId?: string; // optional, used if accountType === 'r2'

    constructor(handle: string, accountType: 'S3' | 'R2', r2AccountId?: string) {
        this.handle = handle;
        this.accountType = accountType;
        this.r2AccountId = r2AccountId;
    }
}

// Convert AWS v3 GetObject Body → Node Readable (no Readable.fromWeb needed)
function toNodeReadable(body: unknown): NodeJS.ReadableStream {
    if (!body) throw new Error("Empty S3 object body");

    if (typeof (body as any).pipe === "function") return body as NodeJS.ReadableStream;

    if (typeof (body as any).arrayBuffer === "function") {
        const make = async () => Buffer.from(await (body as any).arrayBuffer());
        // @ts-ignore
        return Readable.from((async function* () { yield await make(); })());
    }

    if (typeof (body as any).getReader === "function") {
        const reader = (body as any).getReader();
        return new Readable({
            async read() {
                try {
                    const { done, value } = await reader.read();
                    if (done) return this.push(null);
                    this.push(Buffer.isBuffer(value) ? value : Buffer.from(value));
                } catch (err) {
                    this.destroy(err as Error);
                }
            }
        });
    }

    if (body instanceof Uint8Array) return Readable.from([Buffer.from(body)]);
    if (body instanceof ArrayBuffer) return Readable.from([Buffer.from(body)]);

    throw new Error("Unknown GetObject body type");
}

async function ensureDirForFile(filePath: string) {
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
}

async function s3ClientForUser(account: Account): Promise<S3Client | null> {
    try {
        const region = store.get("region") || "eu-west-2";

        const cacheKey = `${region}_${account.handle}_${account.accountType}`;
        if (clientCache.has(cacheKey)) {
            const cachedClient = clientCache.get(cacheKey);
            if (cachedClient) return cachedClient;
            clientCache.delete(cacheKey);
        }

        const accessKeyId = await keytar.getPassword(`${SERVICE}:akid`, account.handle);
        const secretAccessKey = await keytar.getPassword(`${SERVICE}:secret`, account.handle);
        if (!accessKeyId || !secretAccessKey) {
            console.error("Missing credentials for", account.handle);
            return null;
        }

        // ✅ R2-specific endpoint configuration
        let clientConfig: any = {
            region,
            credentials: { accessKeyId, secretAccessKey },
        };

        if (account.accountType === 'R2') {
            if (!account.r2AccountId) {
                console.error("[s3ClientForUser] Missing r2AccountId for R2 account");
                return null;
            }
            clientConfig = {
                region: 'auto',
                endpoint: `https://${account.r2AccountId}.r2.cloudflarestorage.com`,
                forcePathStyle: true,
                credentials: { accessKeyId, secretAccessKey },
            };
        }

        const client = new S3Client(clientConfig);
        clientCache.set(cacheKey, client);
        return client;
    } catch (err) {
        console.error("[s3-ipc] [s3ClientForUser]", account.handle, err);
        return null;
    }
}

async function resolveBucketRegion(client: S3Client, bucket: string, account: Account) {
    try {
        if (account.accountType === 'R2') return 'auto';
        if (!bucket) return "eu-west-2";
        const { LocationConstraint } = await client.send(new GetBucketLocationCommand({ Bucket: bucket }));
        return LocationConstraint || "us-east-1";
    } catch (err) {
        console.error("[resolveBucketRegion]", err);
        return "eu-west-2";
    }
}

async function GetClientForBucket(account: Account, bucket: string) {
    try {
        const s3 = await s3ClientForUser(account);
        if (!s3) return null;
        const bucketRegion = await resolveBucketRegion(s3, bucket, account);
        store.set('region', bucketRegion);
        return await s3ClientForUser(account);
    } catch (err) {
        console.error("[GetClientForBucket]", err);
        return null;
    }
}

// ---------- IPC HANDLERS ----------
ipcMain.handle("s3:listBuckets", async (_e, account: Account) => {
    const s3 = await s3ClientForUser(account);
    if (!s3) return [];
    const { Buckets } = await s3.send(new ListBucketsCommand({}));
    return Buckets ?? [];
});

ipcMain.handle("s3:listObjects", async (_e, account: Account, bucket, prefix = "") => {
    try {
        const s3 = await GetClientForBucket(account, bucket);
        if (!s3) return { files: [], folders: [], error: "No S3 client" };
        const { Contents, CommonPrefixes } = await s3.send(
            new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, Delimiter: "/" })
        );
        return { files: Contents ?? [], folders: CommonPrefixes ?? [], error: null };
    } catch (err: any) {
        console.error(err);
        return { files: [], folders: [], error: err.message };
    }
});

ipcMain.handle("s3:upload", async (e, accountHandle, {bucket, key, filePath}) => {
    try {
        const s3 = await s3ClientForUser(accountHandle);
        if (!s3) {
            e.sender.send("s3:uploadEnd", {key, status: false});
            return {ok: false, error: "No S3 client"};
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
            ...(contentType ? {ContentType: contentType} : {}),
        };

        const upload = new Upload({
            client: s3,
            params: body,
            queueSize: 4,
            leavePartsOnError: false,
        });

        upload.on("httpUploadProgress", (p) => {
            if (!p || !p.loaded || !p.total || p.loaded < p.total) {
                e.sender.send("s3:uploadProgress", {
                    key,
                    loaded: p.loaded,
                    total: p.total,
                });
            } else {
                e.sender.send("s3:uploadEnd", {key, status: true});
            }
        });

        await upload.done();
        return {ok: true};
    } catch (err: any) {
        e.sender.send("s3:uploadEnd", {key, status: false});
        return {ok: false, error: err.message};
    }
});


ipcMain.handle("s3:createFolder", async (_e, accountHandle, bucket, prefix) => {
    try {
        const s3 = await s3ClientForUser(accountHandle);
        if (!s3) { return {ok: false, error: "No S3 client"}; }
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

        return {ok: true, error: null};
    } catch (err: any) {
        console.error("[s3:createFolder]", err);
        return {ok: false, error: err.message};
    }
});


ipcMain.handle("s3:deleteObject", async (_e, accountHandle, bucket, key) => {
    try {
        const s3 = await s3ClientForUser(accountHandle);
        if (!s3) {
            return {ok: false, error: "No S3 client"};
        }
        console.log({Bucket: bucket, Key: key});
        await s3.send(new DeleteObjectCommand({Bucket: bucket, Key: key}));

        // we should really try and re-fet the object list to confirm deletion


        return {ok: true, error: null};
    } catch (err: any) {
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
    } catch (err: any) {
        console.error("[s3:getObjectHead]", err);
        return {ok: false, error: err.message};
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
        return {ok: true, error: null, url: signedUrl};
    } catch (err: any) {
        console.error("[s3:getPreSignedUrl]", err);
        return {ok: false, error: err.message};
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
    } catch (err: any) {
        console.error("[s3:getObjectUrl]", err);
        return {url: null, error: err.message};
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
    } catch (err: any) {
        console.error("[s3:getObjectUrl]", err);
        return {url: null, error: err.message};
    }
});

ipcMain.handle('s3:downloadAll', async (_e, accountHandle, bucket, destDir) => {
    try {
        const s3 = await GetClientForBucket(accountHandle, bucket);
        if (!s3) return { ok: false, error: 'No S3 client' };

        let ContinuationToken: string | undefined;
        let count = 0;
        let bytes = 0;

        do {
            const page: any = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken }));
            const items = page.Contents ?? [];

            for (const obj of items) {
                if (!obj.Key) continue;

                const keyPath = path.join(destDir, obj.Key);
                await ensureDirForFile(keyPath);

                const out = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: obj.Key }));
                const rs = toNodeReadable(out.Body);

                await pipelinePromise(rs, fs.createWriteStream(keyPath));

                count += 1;
                bytes += Number(obj.Size ?? 0);
            }

            ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
        } while (ContinuationToken);

        return { ok: true, count, bytes, error: null };
    } catch (err: any) {
        console.error('[s3:downloadAll]', err);
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('s3:getCors', async (_e, accountHandle, bucket) => {
    try {
        const s3 = await GetClientForBucket(accountHandle, bucket);
        if (!s3) return {ok: false, error: 'No S3 client'};

        try {
            const res = await s3.send(new GetBucketCorsCommand({Bucket: bucket}));
            return {ok: true, rules: res.CORSRules || [], error: null};
        } catch (err: any) {
            // If no CORS config set, AWS throws NoSuchCORSConfiguration
            if (err?.name === 'NoSuchCORSConfiguration' || err?.$metadata?.httpStatusCode === 404) {
                return {ok: true, rules: [], error: null};
            }
            throw err;
        }
    } catch (err: any) {
        console.error('[s3:getCors]', err);
        return {ok: false, error: err.message};
    }
});

ipcMain.handle('s3:saveCors', async (_e, accountHandle, bucket, corsRules) => {
    try {
        const s3 = await GetClientForBucket(accountHandle, bucket);
        if (!s3) return {ok: false, error: 'No S3 client'};

        await s3.send(
            new PutBucketCorsCommand({
                Bucket: bucket,
                CORSConfiguration: {CORSRules: corsRules || []},
            })
        );

        return {ok: true, error: null};
    } catch (err: any) {
        console.error('[s3:saveCors]', err);
        return {ok: false, error: err.message};
    }
});

ipcMain.handle('s3:getBucketPolicy', async (_e, accountHandle, bucket) => {
    try {
        const s3 = await GetClientForBucket(accountHandle, bucket);
        if (!s3) return {ok: false, error: 'No S3 client'};

        try {
            const res = await s3.send(new GetBucketPolicyCommand({Bucket: bucket}));
            // res.Policy is a JSON string when present
            return {ok: true, policy: res.Policy ?? null, error: null};
        } catch (err: any) {
            // If no policy exists, S3 may return NoSuchBucketPolicy / 404
            if (err?.name === 'NoSuchBucketPolicy' || err?.$metadata?.httpStatusCode === 404) {
                return {ok: true, policy: null, error: null};
            }
            throw err;
        }
    } catch (err: any) {
        console.error('[s3:getBucketPolicy]', err);
        return {ok: false, error: err.message};
    }
});

ipcMain.handle('s3:saveBucketPolicy', async (_e, accountHandle, bucket, policy) => {
    try {
        const s3 = await GetClientForBucket(accountHandle, bucket);
        if (!s3) return {ok: false, error: 'No S3 client'};

        const policyString = typeof policy === 'string' ? policy : JSON.stringify(policy);
        await s3.send(new PutBucketPolicyCommand({Bucket: bucket, Policy: policyString}));

        return {ok: true, error: null};
    } catch (err: any) {
        console.error('[s3:saveBucketPolicy]', err);
        return {ok: false, error: err.message};
    }
});

ipcMain.handle('s3:getPublicAccessBlock', async (_e, accountHandle, bucket) => {
    try {
        const s3 = await GetClientForBucket(accountHandle, bucket);
        if (!s3) return { ok: false, error: 'No S3 client' };

        try {
            const res = await s3.send(new GetPublicAccessBlockCommand({ Bucket: bucket }));
            return {
                ok: true,
                config: res.PublicAccessBlockConfiguration ?? null,
                error: null,
            };
        } catch (err: any) {
            // When not set, S3 returns NoSuchPublicAccessBlockConfiguration / 404
            if (err?.name === 'NoSuchPublicAccessBlockConfiguration' || err?.$metadata?.httpStatusCode === 404) {
                return { ok: true, config: null, error: null };
            }
            throw err;
        }
    } catch (err: any) {
        console.error('[s3:getPublicAccessBlock]', err);
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('s3:savePublicAccessBlock', async (_e, accountHandle, bucket, config) => {
    try {
        const s3 = await GetClientForBucket(accountHandle, bucket);
        if (!s3) return { ok: false, error: 'No S3 client' };

        // Expecting config shape:
        // { BlockPublicAcls: boolean, IgnorePublicAcls: boolean, BlockPublicPolicy: boolean, RestrictPublicBuckets: boolean }
        await s3.send(new PutPublicAccessBlockCommand({
            Bucket: bucket,
            PublicAccessBlockConfiguration: config || {},
        }));

        return { ok: true, error: null };
    } catch (err: any) {
        console.error('[s3:savePublicAccessBlock]', err);
        return { ok: false, error: err.message };
    }
});

ipcMain.handle("prefs:setRegion", (_e, region) => {
    store.set("region", region);
    return {ok: true};
});

ipcMain.handle("creds:set", async (_e, stash_userId, accountHandle, accessKeyId, secretAccessKey) => {
    const key = `${stash_userId}_${accountHandle}`
    await keytar.setPassword(`${SERVICE}:akid`, key, accessKeyId);
    await keytar.setPassword(`${SERVICE}:secret`, key, secretAccessKey);
    return {ok: true};
});

ipcMain.handle("creds:get", async (_e, stash_userId, accountHandle) => {
    const key = `${stash_userId}_${accountHandle}`
    // console.log('GET CREDS', stash_userId, accountHandle);
    //const key = accountHandle;
    const accessKeyId = await keytar.getPassword(`${SERVICE}:akid`, key);
    const secretAccessKey = await keytar.getPassword(`${SERVICE}:secret`, key);
    
    if (!accessKeyId || !secretAccessKey) {
        return {ok: false, error: "No credentials found"};
    }
    return {ok: true, accessKeyId, secretAccessKey};
});

ipcMain.handle("creds:remove", async (_e, stash_userId, accountHandle) => {
    const key = `${stash_userId}_${accountHandle}`
    await keytar.deletePassword(`${SERVICE}:akid`, key);
    await keytar.deletePassword(`${SERVICE}:secret`, key);
    return {ok: true};
});