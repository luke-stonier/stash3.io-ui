const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    const menu = Menu.buildFromTemplate([]);
    Menu.setApplicationMenu(menu);

    if (process.env.ELECTRON_START_URL) {
        win.loadURL(process.env.ELECTRON_START_URL);
    } else {
        win.loadFile(path.join(__dirname, '../build/index.html'));
    }
}

app.on('ready', createWindow);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
