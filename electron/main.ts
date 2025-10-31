// src/electron/main.ts
import './s3-ipc';
import { app, BrowserWindow, Menu, MenuItem  } from "electron";
import path from "path";
const isDev = !!process.env.ELECTRON_START_URL || !app.isPackaged;

console.log("dev?", isDev);
console.log("dirname", __dirname);
console.log("filename", __filename);
console.log('icon', getIconPath())

let mainWindow: BrowserWindow | null = null;

if (process.platform === "darwin") {
    app.dock.setIcon(getIconPath());
    app.setName("Stash3.IO");
}

/** Choose the right icon per platform */
function getIconPath() {
    if (isDev) return path.join(__dirname, '..', 'electron', "icons", 'stash3_logo.png')

    if (process.platform === "win32") {
        return path.join(__dirname, '..', 'electron', "icons", "icon.ico");
    }
    if (process.platform === "darwin") {
        return path.join(__dirname, '..', 'electron', "icons", "icon.png");
        //return path.join(__dirname, '..', 'electron', "icons", "icon.icns");
    }

    return path.join(__dirname, '..', 'electron', "icons", "icon.png");
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        minWidth: 600,
        minHeight: 600,
        icon: getIconPath(),
        title: 'Stash3.IO',
        show: false, // show when ready for a cleaner appear
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            preload: isDev
                ? path.join(__dirname, "..", "scripts", "dev-preload.js")
                : path.join(__dirname, "preload.cjs"),
        },
    });

    /** App menu (keeps OS-standard shortcuts like Cmd/Ctrl+C/V/Z) */
    const template: MenuItem[] = [
        ...(process.platform === "darwin" ? [new MenuItem({ role : 'appMenu' }),] : []),
        new MenuItem({ role : 'fileMenu' }),
        new MenuItem({ role : 'editMenu' }),
        new MenuItem({ role : 'viewMenu' }),
        new MenuItem({ role : 'windowMenu' })
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    // Hide menu bar on Windows/Linux but keep shortcuts
    if (process.platform !== "darwin") {
        mainWindow.setMenuBarVisibility(false);
        mainWindow.autoHideMenuBar = true;
    }

    // Toggle DevTools with F12 or "/" like you had
    mainWindow.webContents.on("before-input-event", (_, input) => {
        if (!mainWindow) return;
        const isKeyDown = input.type === "keyDown";
        if (isKeyDown && (input.key === "F12" || input.key === "/")) {
            mainWindow.webContents.isDevToolsOpened()
                ? mainWindow.webContents.closeDevTools()
                : mainWindow.webContents.openDevTools({ mode: "left" });
        }
    });

    // Load dev server or the built React index.html
    const devURL = process.env.ELECTRON_START_URL;
    if (isDev && devURL) {
        mainWindow.loadURL(devURL);
    } else {
        // React build should output to /build; adjust if yours differs
        mainWindow.loadFile(path.join(__dirname, "..", "build", "index.html"));
    }

    // Only show once ready
    mainWindow.once("ready-to-show", () => {
        if (!mainWindow) return;
        mainWindow.show();
        if (isDev && !mainWindow.webContents.isDevToolsOpened()) {
            // Optional: open DevTools automatically in dev
            // mainWindow.webContents.openDevTools({ mode: "detach" });
        }
    });

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

// Ensure single instance (important on Windows)
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
} else {
    app.on("second-instance", () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

app.setAppUserModelId("com.nitrose.stash3io"); // needed for Win notifications & taskbar grouping
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    // On macOS keep app alive until Cmd+Q
    if (process.platform !== "darwin") app.quit();
    else if (process.platform === "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Clean shutdown hooks (remove svc.kill(); svc is undefined in your snippet)
app.on("before-quit", () => {
    // If you spawn child processes, terminate them here gracefully.
});
