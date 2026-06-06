import { contextBridge, ipcRenderer, webUtils } from "electron";
import fs from "fs";
import path from "path";
import type { Account } from "./s3-ipc";

console.log("preload baby")

contextBridge.exposeInMainWorld("api", {
    configureIPC: () => {
        console.log("configureIPC - preload");
    },

    getFilePath: (file: File) => {
        return webUtils.getPathForFile(file);
    },
    getFilesRecursive(dir: string, done: (err: any, files?: string[]) => void) {
        const allFiles: string[] = [];

        function recurse(current: string, cb: (err?: any) => void) {
            fs.readdir(current, { withFileTypes: true }, (err, entries) => {
                if (err) return cb(err);

                let pending = entries.length;
                if (!pending) return cb(); // no entries, done

                entries.forEach(entry => {
                    const fullPath = path.join(current, entry.name);
                    if (entry.isDirectory()) {
                        recurse(fullPath, err => {
                            if (err) return cb(err);
                            if (!--pending) cb();
                        });
                    } else {
                        allFiles.push(fullPath);
                        if (!--pending) cb();
                    }
                });
            });
        }

        recurse(dir, err => {
            if (err) done?.(err);
            else done?.(null, allFiles);
        });
    },

    // S3
    listBuckets: (account: Account) => ipcRenderer.invoke("s3:listBuckets", account),
    listObjects: (account: Account, bucket: string, prefix: string) => ipcRenderer.invoke("s3:listObjects", account, bucket, prefix),
    getObjectUrl: (account: Account | string, bucket: string, key: string) =>
        ipcRenderer.invoke("s3:getObjectUrl", account, bucket, key),
    createFolder: (account: Account | string, bucket: string, prefix: string) => ipcRenderer.invoke("s3:createFolder", account, bucket, prefix),
    upload: (account: Account | string, payload: any) => ipcRenderer.invoke("s3:upload", account, payload),
    onUploadProgress: (cb: any) => {
        const channel = "s3:uploadProgress";
        const handler = (_e: any, data: any) => cb(data);
        ipcRenderer.on(channel, handler);
        return () => ipcRenderer.removeListener(channel, handler);
    },
    onUploadEnd: (cb: any) => {
        const channel = "s3:uploadEnd";
        const handler = (_e: any, data: any) => cb(data);
        ipcRenderer.on(channel, handler);
        return () => ipcRenderer.removeListener(channel, handler);
    },
    deleteObject: (account: Account | string, bucket: string, key: string) => ipcRenderer.invoke("s3:deleteObject", account, bucket, key),
    getObjectHead: (account: Account | string, bucket: string, key: string) => ipcRenderer.invoke("s3:getObjectHead", account, bucket, key),
    getPreSignedUrl: (account: Account | string, bucket: string, key: string, expiresIn: any) => ipcRenderer.invoke("s3:getPreSignedUrl", account, bucket, key, expiresIn),

    downloadAll: (account: Account | string, bucket: string, destDir: string) => ipcRenderer.invoke("s3:downloadAll", account, bucket, destDir),
    getCors: (account: Account | string, bucket: string) => ipcRenderer.invoke("s3:getCors", account, bucket),
    saveCors: (account: Account | string, bucket: string, corsRules: any) => ipcRenderer.invoke("s3:saveCors", account, bucket, corsRules),
    getBucketPolicy: (account: Account | string, bucket: string) => ipcRenderer.invoke("s3:getBucketPolicy", account, bucket),
    saveBucketPolicy: (account: Account | string, bucket: string, policy: any) => ipcRenderer.invoke("s3:saveBucketPolicy", account, bucket, policy),
    getPublicAccessBlock: (account: Account | string, bucket: string) => ipcRenderer.invoke('s3:getPublicAccessBlock', account, bucket),
    savePublicAccessBlock: (account: Account | string, bucket: string, config: any) => ipcRenderer.invoke('s3:savePublicAccessBlock', account, bucket, config),

    setRegion: (region: string) => ipcRenderer.invoke("prefs:setRegion", region),
    setCreds: (stash_userId: string, handle: string, akid: string, secret: string) => ipcRenderer.invoke("creds:set", stash_userId, handle, akid, secret),
    getCreds: (stash_userId: string, handle: string) => ipcRenderer.invoke("creds:get", stash_userId, handle),
    removeCreds: (stash_userId: string, handle: string) => ipcRenderer.invoke("creds:remove", stash_userId, handle),

    // S3 Bucket Properties
    getBucketUrl: (account: Account | string, bucket: string) =>
        ipcRenderer.invoke("s3:getBucketUrl", account, bucket),
});
