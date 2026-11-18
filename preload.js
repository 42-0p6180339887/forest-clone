const { contextBridge, ipcRenderer } = require('electron');

if (process.platform === 'win32') {
  contextBridge.exposeInMainWorld('forestUpdates', {
    open: () => ipcRenderer.invoke('forest:open-private-updates'),
  });
}
