const { app, BrowserWindow, Menu  } = require("electron");
// import { autoUpdater } from "electron-updater";
const path = require("path");
require('./s3-ipc');

// app.commandLine.appendSwitch('disable-logging');  // mutes those devtools:// errors

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 600,
        minHeight: 600,
        icon: path.join(__dirname, 'stash3_logo.png'), // 256x256 recommended
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });
    

    // ✅ App menu with Edit roles so Cmd/Ctrl+C/V/Z work
    const template = [
        ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
        { role: 'fileMenu' },
        { role: 'editMenu' },   // <-- this enables undo/cut/copy/paste/selectAll
        { role: 'viewMenu' },
        { role: 'windowMenu' },
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    // Hide menu bar on Windows/Linux but keep shortcuts
    if (process.platform !== 'darwin') {
        win.setMenuBarVisibility(false);
        win.autoHideMenuBar = true;
    }

    win.webContents.on('before-input-event', (_, input) => {
        if ((input.type === 'keyDown' && input.key === 'F12') || (input.type === 'keyDown' && input.key === '/')) {
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

    // Uncomment this block to enable auto-updates
    // autoUpdater.autoDownload = false;              // let user accept download
    // autoUpdater.checkForUpdatesAndNotify();        // checks on launch
    //
    // autoUpdater.on("update-available", () => {
    //     dialog.showMessageBox(win, {
    //         type: "info",
    //         message: "A new version is available.",
    //         detail: "Download and install now?",
    //         buttons: ["Yes", "Later"],
    //         cancelId: 1,
    //     }).then(r => { if (r.response === 0) autoUpdater.downloadUpdate(); });
    // });
    //
    // autoUpdater.on("update-downloaded", () => {
    //     dialog.showMessageBox(win, {
    //         type: "info",
    //         message: "Update ready",
    //         detail: "Restart to apply the update.",
    //         buttons: ["Restart now", "Later"],
    //         cancelId: 1,
    //     }).then(r => { if (r.response === 0) autoUpdater.quitAndInstall(); });
    // });
}

app.whenReady().then(async () => {
    createWindow();
});

app.on("before-quit", () => { try { svc.kill(); } catch {} });
