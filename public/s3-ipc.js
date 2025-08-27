const { ipcMain } = require("electron");
const Store = require("electron-store");
const keytar = require("keytar");
const fs = require("fs");

const { S3Client, ListBucketsCommand, ListObjectsV2Command, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");

const store = new Store({ name: "prefs", defaults: { region: "eu-west-1" } });
const SERVICE = "stash3.io";

async function s3ClientForUser() {
    const account = "default";
    const accessKeyId = await keytar.getPassword(`${SERVICE}:akid`, account);
    const secretAccessKey = await keytar.getPassword(`${SERVICE}:secret`, account);
    const region = store.get("region") || "eu-west-1";
    if (!accessKeyId || !secretAccessKey) {
        console.error("Missing AWS credentials");
        return null;
    }
    return new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
}

// IPC handlers
ipcMain.handle("s3:listBuckets", async () => {
    const s3 = await s3ClientForUser();
    const { Buckets } = await s3.send(new ListBucketsCommand({}));
    return Buckets ?? [];
});

ipcMain.handle("s3:listObjects", async (_e, bucket, prefix = "") => {
    const s3 = await s3ClientForUser();
    const { Contents, CommonPrefixes } = await s3.send(
        new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, Delimiter: "/" })
    );
    return { files: Contents ?? [], folders: CommonPrefixes ?? [] };
});

ipcMain.handle("s3:upload", async (e, { bucket, key, filePath }) => {
    try {
        const s3 = await s3ClientForUser();
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

ipcMain.handle("s3:deleteObject", async (_e, bucket, key) => {
    const s3 = await s3ClientForUser();
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return { ok: true };
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
