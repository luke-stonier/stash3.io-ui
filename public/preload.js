const { contextBridge, ipcRenderer } = require("electron");

window.addEventListener('DOMContentLoaded', () => {
    console.log("Preload script loaded");
});

contextBridge.exposeInMainWorld("api", {
    upload: (payload) => ipcRenderer.invoke("s3:upload", payload),

    // return an unsubscribe so React effects can clean up
    onUploadProgress: (cb) => {
        const channel = "s3:uploadProgress";
        const handler = (_e, data) => cb(data);
        ipcRenderer.on(channel, handler);
        return () => ipcRenderer.removeListener(channel, handler);
    },
});