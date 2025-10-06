const {contextBridge, ipcRenderer, webUtils} = require("electron");
const fs = require("fs");
const path = require("path");

contextBridge.exposeInMainWorld("api", {
    getFilePath: (file) => {
        return webUtils.getPathForFile(file);
    },
    getFilesRecursive(dir, done) {
        const allFiles = [];
    
        function recurse(current, cb) {
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
    listBuckets: (accountHandle) => ipcRenderer.invoke("s3:listBuckets", accountHandle),
    listObjects: (accountHandle, bucket, prefix) => ipcRenderer.invoke("s3:listObjects", accountHandle, bucket, prefix),
    getObjectUrl: (accountHandle, bucket, key) =>
        ipcRenderer.invoke("s3:getObjectUrl", accountHandle, bucket, key),
    createFolder: (accountHandle, bucket, prefix) => ipcRenderer.invoke("s3:createFolder", accountHandle, bucket, prefix),
    upload: (accountHandle, payload) => ipcRenderer.invoke("s3:upload", accountHandle, payload),
    onUploadProgress: (cb) => {
        const channel = "s3:uploadProgress";
        const handler = (_e, data) => cb(data);
        ipcRenderer.on(channel, handler);
        return () => ipcRenderer.removeListener(channel, handler);
    },
    onUploadEnd: (cb) => {
        const channel = "s3:uploadEnd";
        const handler = (_e, data) => cb(data);
        ipcRenderer.on(channel, handler);
        return () => ipcRenderer.removeListener(channel, handler);
    },
    deleteObject: (accountHandle, bucket, key) => ipcRenderer.invoke("s3:deleteObject", accountHandle, bucket, key),
    getObjectHead: (accountHandle, bucket, key) => ipcRenderer.invoke("s3:getObjectHead", accountHandle, bucket, key),
    getPreSignedUrl: (accountHandle, bucket, key, expiresIn) => ipcRenderer.invoke("s3:getPreSignedUrl", accountHandle, bucket, key, expiresIn),

    downloadAll: (accountHandle, bucket, destDir) => ipcRenderer.invoke("s3:downloadAll", accountHandle, bucket, destDir),
    getCors: (accountHandle, bucket) => ipcRenderer.invoke("s3:getCors", accountHandle, bucket),
    saveCors: (accountHandle, bucket, corsRules) => ipcRenderer.invoke("s3:saveCors", accountHandle, bucket, corsRules),
    getBucketPolicy: (accountHandle, bucket) => ipcRenderer.invoke("s3:getBucketPolicy", accountHandle, bucket),
    saveBucketPolicy: (accountHandle, bucket, policy) => ipcRenderer.invoke("s3:saveBucketPolicy", accountHandle, bucket, policy),

    setRegion: (region) => ipcRenderer.invoke("prefs:setRegion", region),
    setCreds: (handle, akid, secret) => ipcRenderer.invoke("creds:set", handle, akid, secret),
    getCreds: (handle) => ipcRenderer.invoke("creds:get", handle),
    removeCreds: (handle) => ipcRenderer.invoke("creds:remove", handle),

    // S3 Bucket Properties
    getBucketUrl: (accountHandle, bucket) =>
        ipcRenderer.invoke("s3:getBucketUrl", accountHandle, bucket),
});