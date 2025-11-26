const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectDocxFile: () => ipcRenderer.invoke('open-docx-dialog'),
  loadDocxFile: (filePath) => ipcRenderer.invoke('load-docx-file', { path: filePath }),
  loadDocxFromBuffer: (buffer) => ipcRenderer.invoke('load-docx-file', { buffer: buffer }),
  onDocxHtml: (callback) => ipcRenderer.on('docx-html', (event, html) => callback(event, html)),
  onZoomRequest: (callback) => ipcRenderer.on('zoom-request', (_event, direction) => callback(direction)),
  adjustZoom: (direction) => ipcRenderer.invoke('adjust-zoom', direction)
});