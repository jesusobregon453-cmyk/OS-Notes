const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isDesktop: true,
  loginWithGoogleDesktop: (options) => ipcRenderer.invoke('google-auth-desktop', options),
  refreshGoogleToken: (options) => ipcRenderer.invoke('google-auth-refresh', options),
});
