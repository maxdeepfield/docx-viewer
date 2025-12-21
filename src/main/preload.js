const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('open-file-dialog'),
  loadFile: (filePath) => ipcRenderer.invoke('load-file', { path: filePath }),
  loadFileFromBuffer: (buffer, name) => ipcRenderer.invoke('load-file', { buffer, name }),
  onContentHtml: (callback) => ipcRenderer.on('content-html', (event, html) => callback(event, html)),
  onZoomRequest: (callback) => ipcRenderer.on('zoom-request', (_event, direction) => callback(direction)),
  adjustZoom: (direction) => ipcRenderer.invoke('adjust-zoom', direction)
});