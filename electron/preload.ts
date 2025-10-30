import { contextBridge, ipcRenderer, webUtils } from "electron";
import fs from "fs";
import path from "path";
import { Account } from "./s3-ipc";

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
    getObjectUrl: (accountHandle: string, bucket: string, key: string) =>
        ipcRenderer.invoke("s3:getObjectUrl", accountHandle, bucket, key),
    createFolder: (accountHandle: string, bucket: string, prefix: string) => ipcRenderer.invoke("s3:createFolder", accountHandle, bucket, prefix),
    upload: (accountHandle: string, payload: any) => ipcRenderer.invoke("s3:upload", accountHandle, payload),
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
    deleteObject: (accountHandle: string, bucket: string, key: string) => ipcRenderer.invoke("s3:deleteObject", accountHandle, bucket, key),
    getObjectHead: (accountHandle: string, bucket: string, key: string) => ipcRenderer.invoke("s3:getObjectHead", accountHandle, bucket, key),
    getPreSignedUrl: (accountHandle: string, bucket: string, key: string, expiresIn: any) => ipcRenderer.invoke("s3:getPreSignedUrl", accountHandle, bucket, key, expiresIn),

    downloadAll: (accountHandle: string, bucket: string, destDir: string) => ipcRenderer.invoke("s3:downloadAll", accountHandle, bucket, destDir),
    getCors: (accountHandle: string, bucket: string) => ipcRenderer.invoke("s3:getCors", accountHandle, bucket),
    saveCors: (accountHandle: string, bucket: string, corsRules: any) => ipcRenderer.invoke("s3:saveCors", accountHandle, bucket, corsRules),
    getBucketPolicy: (accountHandle: string, bucket: string) => ipcRenderer.invoke("s3:getBucketPolicy", accountHandle, bucket),
    saveBucketPolicy: (accountHandle: string, bucket: string, policy: any) => ipcRenderer.invoke("s3:saveBucketPolicy", accountHandle, bucket, policy),
    getPublicAccessBlock: (accountHandle: string, bucket: string) => ipcRenderer.invoke('s3:getPublicAccessBlock', accountHandle, bucket),
    savePublicAccessBlock: (accountHandle: string, bucket: string, config: any) => ipcRenderer.invoke('s3:savePublicAccessBlock', accountHandle, bucket, config),

    setRegion: (region: string) => ipcRenderer.invoke("prefs:setRegion", region),
    setCreds: (stash_userId: string, handle: string, akid: string, secret: string) => ipcRenderer.invoke("creds:set", stash_userId, handle, akid, secret),
    getCreds: (stash_userId: string, handle: string) => ipcRenderer.invoke("creds:get", stash_userId, handle),
    removeCreds: (stash_userId: string, handle: string) => ipcRenderer.invoke("creds:remove", stash_userId, handle),

    // S3 Bucket Properties
    getBucketUrl: (accountHandle: string, bucket: string) =>
        ipcRenderer.invoke("s3:getBucketUrl", accountHandle, bucket),
});