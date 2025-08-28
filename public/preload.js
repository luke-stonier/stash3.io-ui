const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    listBuckets: (accountHandle) => ipcRenderer.invoke("s3:listBuckets", accountHandle),
    listObjects: (accountHandle, bucket, prefix) => ipcRenderer.invoke("s3:listObjects", accountHandle, bucket, prefix),
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
    setRegion: (region) => ipcRenderer.invoke("prefs:setRegion", region),
    setCreds: (handle, akid, secret) => ipcRenderer.invoke("creds:set", handle, akid, secret),
    getCreds: (handle) => ipcRenderer.invoke("creds:get", handle),
    removeCreds: (handle) => ipcRenderer.invoke("creds:remove", handle),
});