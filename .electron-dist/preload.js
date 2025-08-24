"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("api", {
    upload: (payload) => electron_1.ipcRenderer.invoke("s3:upload", payload),
    onUploadProgress: (cb) => {
        const channel = "s3:uploadProgress";
        const handler = (_e, data) => cb(data);
        electron_1.ipcRenderer.on(channel, handler);
        return () => electron_1.ipcRenderer.removeListener(channel, handler);
    },
    listBuckets: () => electron_1.ipcRenderer.invoke("s3:listBuckets"),
});
