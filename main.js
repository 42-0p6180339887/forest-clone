// 专注森林 · Electron 主进程
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const { existsSync } = require('fs');
const { spawn } = require('child_process');

const indexFile = path.join(__dirname, 'index.html');
const indexUrl = pathToFileURL(indexFile).href;
let updateWindow;

function openPrivateUpdates(startup = false) {
  if (process.platform !== 'win32') throw new Error('Windows 更新入口仅在 Windows 上可用。');
  if (!startup && updateWindow && updateWindow.exitCode === null) return Promise.resolve();
  const directory = app.isPackaged ? path.join(process.resourcesPath, 'private-updates') : path.join(__dirname, 'private-updates');
  const updater = path.join(directory, 'AppUpdates.ps1');
  const config = path.join(directory, 'app-update.json');
  if (!existsSync(updater) || !existsSync(config)) throw new Error('更新组件缺失。');
  const windows = process.env.SystemRoot || 'C:\\Windows';
  const executable = path.join(windows, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const child = spawn(executable, [
    '-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', updater, '-Config', config, ...(startup ? ['-StartupCheck'] : []),
  ], { windowsHide: true, detached: true, stdio: 'ignore' });
  if (!startup) updateWindow = child;
  child.once('exit', () => { if (updateWindow === child) updateWindow = undefined; });
  return new Promise((resolve, reject) => {
    child.once('spawn', () => { child.unref(); resolve(); });
    child.once('error', (error) => {
      if (updateWindow === child) updateWindow = undefined;
      reject(error);
    });
  });
}

ipcMain.handle('forest:open-private-updates', (event) => {
  if (event.senderFrame !== event.sender.mainFrame || event.senderFrame?.url !== indexUrl) {
    throw new Error('不能从外部页面打开更新。');
  }
  return openPrivateUpdates();
});

function createWindow() {
  const win = new BrowserWindow({
    width: 460,
    height: 880,
    minWidth: 380,
    minHeight: 640,
    title: '专注森林',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.loadFile(indexFile);
}

app.whenReady().then(() => {
  createWindow();
  if (app.isPackaged && process.platform === 'win32') {
    Promise.resolve().then(() => openPrivateUpdates(true)).catch(() => {});
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
