const { ipcMain } = require("electron");
const Store = require("electron-store");
const keytar = require("keytar");
const fs = require("fs");

const { S3Client, ListBucketsCommand, ListObjectsV2Command, DeleteObjectCommand, GetBucketLocationCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");

const store = new Store({ name: "prefs", defaults: { region: "eu-west-2" } });
const SERVICE = "stash3.io";

async function s3ClientForUser(accountHandle) {
    const accessKeyId = await keytar.getPassword(`${SERVICE}:akid`, accountHandle);
    const secretAccessKey = await keytar.getPassword(`${SERVICE}:secret`, accountHandle);
    const region = store.get("region") || "eu-west-2";
    if (!accessKeyId || !secretAccessKey) {
        console.error("Missing AWS credentials");
        return null;
    }
    console.log("Creating S3 client for user", accountHandle, "region", region);
    return new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
}

async function resolveBucketRegion(client, bucket) {
    const { LocationConstraint } = await client.send(new GetBucketLocationCommand({ Bucket: bucket }));
    return LocationConstraint || "us-east-1";
}

async function GetClientForBucket(handle, bucket){
    const s3 = await s3ClientForUser(accountHandle);
    const bucketRegion = await resolveBucketRegion(s3, bucket);
    store.set('region', bucketRegion);
    return await s3ClientForUser(accountHandle);
}

// IPC handlers
ipcMain.handle("s3:listBuckets", async (e, accountHandle) => {
    const s3 = await s3ClientForUser(accountHandle);
    const { Buckets } = await s3.send(new ListBucketsCommand({}));
    return Buckets ?? [];
});

ipcMain.handle("s3:listObjects", async (_e, accountHandle, bucket, prefix = "") => {
    try {
        const s3 = await GetClientForBucket(accountHandle);
        
        if (!bucketS3) {
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
            return {ok: false, error: "No S3 client"};
        }
        const upload = new Upload({
            client: s3,
            params: {Bucket: bucket, Key: key, Body: fs.createReadStream(filePath)},
            queueSize: 4,
            leavePartsOnError: false,
        });
        upload.on("httpUploadProgress", (p) => {
            e.sender.send("s3:uploadProgress", {key, loaded: p.loaded, total: p.total});
        });
        await upload.done();
        return {ok: true};
    } catch (err) {
        e.sender.send("s3:uploadEnd", { key, status: false });
        return {ok: false, error: err.message};
    }
});

ipcMain.handle("s3:deleteObject", async (_e, accountHandle, bucket, key) => {
    const s3 = await s3ClientForUser(accountHandle);
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return { ok: true };
});

ipcMain.handle("s3:getObjectUrl", async (_e, accountHandle, bucket, key) => {
    try {
        const s3 = await GetClientForBucket(accountHandle);
        if (!s3) {
            return {ok: false, error: "No S3 client"};
        }
        const region = s3.config.region;
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
        const s3 = await GetClientForBucket(accountHandle);
        if (!s3) {
            return {ok: false, error: "No S3 client"};
        }
        const region = s3.config.region;
        return {
            url: `https://${bucket}.s3.${region}.amazonaws.com/`,
            error: null
        };
    } catch (err) {
        console.error("[s3:getObjectUrl]", err);
        return { url: null, error: err.message };
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
