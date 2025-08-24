// main/s3-ipc.ts
import { app, ipcMain } from "electron";
import Store from "electron-store";
import keytar from "keytar";
import { S3Client, ListBucketsCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const store = new Store<{ region: string }>();
const SERVICE = "stash3.io";

async function s3ClientForUser(): Promise<S3Client> {
    const account = "default"; // or email/tenant id
    const accessKeyId = await keytar.getPassword(`${SERVICE}:akid`, account);
    const secretAccessKey = await keytar.getPassword(`${SERVICE}:secret`, account);
    const region = store.get('region') || "eu-west-1";
    if (!accessKeyId || !secretAccessKey) throw new Error("Missing AWS credentials");
    return new S3Client({ region, credentials: { accessKeyId, secretAccessKey }});
};

// list buckets
ipcMain.handle("s3:listBuckets", async () => {
    const s3 = await s3ClientForUser();
    const { Buckets } = await s3.send(new ListBucketsCommand({}));
    return Buckets ?? [];
});

// list objects
ipcMain.handle("s3:listObjects", async (_e, bucket: string, prefix = "") => {
    const s3 = await s3ClientForUser();
    const { Contents, CommonPrefixes } = await s3.send(new ListObjectsV2Command({
        Bucket: bucket, Prefix: prefix, Delimiter: "/"
    }));
    return { files: Contents ?? [], folders: CommonPrefixes ?? [] };
});

// upload with progress + abort support
ipcMain.handle("s3:upload", async (e, args: { bucket: string; key: string; filePath: string }) => {
    const s3 = await s3ClientForUser();
    const controller = new AbortController();
    const upload = new Upload({
        client: s3,
        params: { Bucket: args.bucket, Key: args.key, Body: require("fs").createReadStream(args.filePath) },
        queueSize: 4, // parallel parts
        leavePartsOnError: false
    });
    upload.on("httpUploadProgress", (p) => {
        e.sender.send("s3:uploadProgress", { key: args.key, loaded: p.loaded, total: p.total });
    });
    (e as any)._lastAbort = controller; // simple store per-invocation if you want
    await upload.done();
    return { ok: true };
});

ipcMain.handle("s3:deleteObject", async (_e, bucket: string, key: string) => {
    const s3 = await s3ClientForUser();
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return { ok: true };
});

// creds + prefs
ipcMain.handle("prefs:setRegion", (_e, region: string) => { store.set("region", region); return { ok: true }; });
ipcMain.handle("creds:set", async (_e, accessKeyId: string, secretAccessKey: string) => {
    const account = "default";
    await keytar.setPassword(`${SERVICE}:akid`, account, accessKeyId);
    await keytar.setPassword(`${SERVICE}:secret`, account, secretAccessKey);
    return { ok: true };
});