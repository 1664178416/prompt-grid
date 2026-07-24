const { app, BrowserWindow } = require('electron');
const serve = require('electron-serve');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

const appServe = app.isPackaged ? serve({ directory: path.join(__dirname, 'out') }) : null;

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    icon: path.join(__dirname, 'public/icon-512.png'),
    titleBarStyle: 'hiddenInset' // Mac style
  });

  if (app.isPackaged) {
    appServe(win).then(() => {
      win.loadURL('app://-');
    });
  } else {
    win.loadURL('http://localhost:3000');
    // win.webContents.openDevTools();
  }
};

app.on('ready', () => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
