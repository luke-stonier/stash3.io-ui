# STASH3.IO

## Build Roadmap

### App skeleton
- Electron main: windows, menus, updates later.
- Preload: safe IPC bridge.
- Renderer (React): UI (buckets, objects, queue, drag/drop).

### Local config & secrets
- Use keytar to store AWS access key/secret (mac Keychain / Win Cred Vault / libsecret).
- Use electron-store for non-secret prefs (region, theme, last bucket).

### S3 client (local only)
- AWS SDK v3 (@aws-sdk/client-s3, @aws-sdk/lib-storage) in main (not renderer) to keep creds and file system access out of the DOM.
- Expose upload/list/delete via IPC.

### Drag & drop UX
- Global drop overlay; upload queue drawer; progress, cancel, retry.
### Nice-to-haves next
- Multipart upload, resume on restart, parallelism control, per-bucket region, signed URL preview, file diff (etag), keyboard shortcuts.

## Packages
```
npm i @aws-sdk/client-s3 @aws-sdk/lib-storage
npm i electron-store keytar
# (types if needed)
npm i -D @types/keytar
```

### Electron
```
// main/s3-ipc.ts
import { app, ipcMain } from "electron";
import Store from "electron-store";
import keytar from "keytar";
import { S3Client, ListBucketsCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const store = new Store<{ region: string }>();
const SERVICE = "stash3.io";

function s3ClientForUser = async () => {
  const account = "default"; // or email/tenant id
  const accessKeyId = await keytar.getPassword(`${SERVICE}:akid`, account);
  const secretAccessKey = await keytar.getPassword(`${SERVICE}:secret`, account);
  const region = store.get("region") || "eu-west-1";
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
```

### Renderer
```
// example UploadPane.tsx
import React, { useEffect, useMemo, useState } from "react";

type UploadItem = { key: string; path: string; loaded: number; total?: number; status: "queued"|"running"|"done"|"error" };

export default function UploadPane({ bucket }: { bucket: string }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const newItems = files.map(f => ({ key: f.name, path: f.path, loaded: 0, total: f.size, status: "queued" as const }));
    setItems(prev => [...prev, ...newItems]);
  };

  const startUpload = async (it: UploadItem) => {
    setItems(prev => prev.map(p => p===it? {...p, status:"running"} : p));
    try {
      await (window as any).api.upload({ bucket, key: it.key, filePath: it.path });
      setItems(prev => prev.map(p => p===it? {...p, status:"done"} : p));
    } catch {
      setItems(prev => prev.map(p => p===it? {...p, status:"error"} : p));
    }
  };

  useEffect(() => {
    (window as any).api.onUploadProgress((p: { key:string; loaded:number; total?:number }) => {
      setItems(prev => prev.map(it => it.key===p.key ? { ...it, loaded: p.loaded, total: p.total ?? it.total } : it));
    });
  }, []);

  useEffect(() => {
    // kick off queued uploads (simple serial; make it parallel if you want)
    const next = items.find(i => i.status === "queued");
    if (next) startUpload(next);
  }, [items]);

  return (
    <div
      onDragOver={(e)=>{e.preventDefault();}}
      onDrop={onDrop}
      className="p-4 bg-trans-dark rounded-3 text-center"
      style={{ border: "1px dashed var(--bs-warning)" }}
    >
      <div className="mb-2">
        <span className="material-symbols-filled" style={{ fontSize: 32, color: "var(--bs-warning)" }}>upload</span>
      </div>
      <div className="mb-3">Drop files here to upload to <strong>{bucket}</strong></div>

      <ul className="list-unstyled text-start">
        {items.map(it => (
          <li key={it.key} className="mb-2">
            {it.key} — {it.status}
            {it.total ? (
              <div className="progress mt-1" role="progressbar" aria-valuenow={Math.floor((it.loaded/it.total)*100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="progress-bar" style={{ width: `${(it.loaded/it.total)*100}%` }} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
```