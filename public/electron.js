const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let svc;
async function startService() {
    svc = spawn(process.execPath, [path.join(__dirname, "..", ".api-dist", "api.js")], {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, SVC_PORT: "0" } // let the service pick a random port
    });

    svc.stdout.on("data", (buf) => {
        const line = buf.toString();
        const m = line.match(/svc listening on (\d+)/);
        if (m) {
            const port = Number(m[1]);
            console.log("Service started on port", port);
            // pass port to renderer via additionalArguments or BrowserWindow.loadURL query param
        }
    });
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, "preload.js"),
        }
    });

    const devURL = process.env.ELECTRON_START_URL;
    if (devURL) {
        win.loadURL(devURL);
    } else {
        win.loadFile(path.join(__dirname, "index.html"));
    }
}

app.whenReady().then(async () => {
    await startService();
    createWindow();
});

app.on("before-quit", () => { try { svc.kill(); } catch {} });
