"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// main/s3-ipc.ts
const electron_1 = require("electron");
const electron_store_1 = __importDefault(require("electron-store"));
const keytar_1 = __importDefault(require("keytar"));
const client_s3_1 = require("@aws-sdk/client-s3");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const store = new electron_store_1.default();
const SERVICE = "stash3.io";
async function s3ClientForUser() {
    const account = "default"; // or email/tenant id
    const accessKeyId = await keytar_1.default.getPassword(`${SERVICE}:akid`, account);
    const secretAccessKey = await keytar_1.default.getPassword(`${SERVICE}:secret`, account);
    const region = store.get('region') || "eu-west-1";
    if (!accessKeyId || !secretAccessKey)
        throw new Error("Missing AWS credentials");
    return new client_s3_1.S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
}
;
// list buckets
electron_1.ipcMain.handle("s3:listBuckets", async () => {
    const s3 = await s3ClientForUser();
    const { Buckets } = await s3.send(new client_s3_1.ListBucketsCommand({}));
    return Buckets ?? [];
});
// list objects
electron_1.ipcMain.handle("s3:listObjects", async (_e, bucket, prefix = "") => {
    const s3 = await s3ClientForUser();
    const { Contents, CommonPrefixes } = await s3.send(new client_s3_1.ListObjectsV2Command({
        Bucket: bucket, Prefix: prefix, Delimiter: "/"
    }));
    return { files: Contents ?? [], folders: CommonPrefixes ?? [] };
});
// upload with progress + abort support
electron_1.ipcMain.handle("s3:upload", async (e, args) => {
    const s3 = await s3ClientForUser();
    const controller = new AbortController();
    const upload = new lib_storage_1.Upload({
        client: s3,
        params: { Bucket: args.bucket, Key: args.key, Body: require("fs").createReadStream(args.filePath) },
        queueSize: 4, // parallel parts
        leavePartsOnError: false
    });
    upload.on("httpUploadProgress", (p) => {
        e.sender.send("s3:uploadProgress", { key: args.key, loaded: p.loaded, total: p.total });
    });
    e._lastAbort = controller; // simple store per-invocation if you want
    await upload.done();
    return { ok: true };
});
electron_1.ipcMain.handle("s3:deleteObject", async (_e, bucket, key) => {
    const s3 = await s3ClientForUser();
    await s3.send(new client_s3_1.DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return { ok: true };
});
// creds + prefs
electron_1.ipcMain.handle("prefs:setRegion", (_e, region) => { store.set("region", region); return { ok: true }; });
electron_1.ipcMain.handle("creds:set", async (_e, accessKeyId, secretAccessKey) => {
    const account = "default";
    await keytar_1.default.setPassword(`${SERVICE}:akid`, account, accessKeyId);
    await keytar_1.default.setPassword(`${SERVICE}:secret`, account, secretAccessKey);
    return { ok: true };
});
