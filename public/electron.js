const { app, BrowserWindow, Menu  } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
require('./s3-ipc');

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
        width: 800,
        height: 600,
        minWidth: 600,
        minHeight: 600,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    const menu = Menu.buildFromTemplate([]);
    Menu.setApplicationMenu(menu);

    win.webContents.on('before-input-event', (_, input) => {
        if (input.type === 'keyDown' && input.key === 'F12') {
            win.webContents.isDevToolsOpened()
                ? win.webContents.closeDevTools()
                : win.webContents.openDevTools({ mode: 'left' });
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
