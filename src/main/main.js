const electron = require('electron');
console.log('Electron module loaded:', !!electron);
if (electron) {
  console.log('Electron exports keys:', Object.keys(electron));
} else {
  console.error('electron module is null/undefined');
  process.exit(1);
}

const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = electron;
console.log('app:', !!app);
console.log('BrowserWindow:', !!BrowserWindow);
console.log('ipcMain:', !!ipcMain);
console.log('dialog:', !!dialog);
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const XLSX = require('xlsx');

let mainWindow;

async function showAbout() {
  const parent = mainWindow || null;
  const siteUrl = 'https://absolutefreakout.com';
  const githubUrl = 'https://github.com/maxdeepfield/docx-viewer';
  const { response } = await dialog.showMessageBox(parent, {
    type: 'info',
    title: 'About Absolute Docs Freakout',
    message: 'Absolute Docs Freakout',
    detail: [
      'Absolute Docs Freakout: no-nonsense document viewer',
      '',
      `Version: ${app.getVersion()}`,
      '',
      `Website: ${siteUrl}`,
      `GitHub: ${githubUrl}`
    ].join('\n'),
    buttons: ['Visit Website', 'View GitHub', 'Close'],
    defaultId: 2,
    cancelId: 2
  });

  if (response === 0) {
    shell.openExternal(siteUrl);
  } else if (response === 1) {
    shell.openExternal(githubUrl);
  }
}

function convertXlsxToHtml(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  let html = '<div class="xlsx-container">';

  // Create navigation for sheets if there are multiple
  if (workbook.SheetNames.length > 1) {
    html += '<div class="sheet-tabs">';
    workbook.SheetNames.forEach((name, idx) => {
      html += `<button class="sheet-tab ${idx === 0 ? 'active' : ''}" onclick="showSheet(${idx})">${name}</button>`;
    });
    html += '</div>';
  }

  workbook.SheetNames.forEach((name, idx) => {
    const sheet = workbook.Sheets[name];
    const sheetHtml = XLSX.utils.sheet_to_html(sheet, { id: `sheet-${idx}`, editable: false });
    html += `<div id="sheet-container-${idx}" class="sheet-content ${idx === 0 ? '' : 'hidden'}">`;
    html += `<h2>${name}</h2>`;
    html += sheetHtml;
    html += '</div>';
  });

  html += '</div>';
  return html;
}

async function processFile(input, targetWebContents = mainWindow?.webContents) {
  try {
    if (!targetWebContents) {
      throw new Error('Main window not initialized');
    }
    if (!input) {
      throw new Error('No input provided');
    }

    let filePath = input.path;
    let extension = '';
    let buffer = input.buffer ? Buffer.from(input.buffer) : null;

    if (filePath) {
      extension = path.extname(filePath).toLowerCase();
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found.');
      }
      buffer = fs.readFileSync(filePath);
    } else if (input.name) {
      extension = path.extname(input.name).toLowerCase();
    }

    let html = '';
    if (extension === '.docx') {
      console.log('Converting DOCX...');
      const conversion = await mammoth.convertToHtml({ buffer });
      html = conversion.value || '<p>No content received.</p>';
    } else if (extension === '.xlsx' || extension === '.xls') {
      console.log('Converting XLSX...');
      html = convertXlsxToHtml(buffer);
    } else {
      throw new Error('Unsupported file type. Please use .docx or .xlsx');
    }

    targetWebContents.send('content-html', html);
    return { success: true };
  } catch (err) {
    console.error('Error processing file:', err);
    targetWebContents?.send(
      'content-html',
      `<p style="color: red; padding: 20px;">Error: ${err.message}</p>`
    );
    return { success: false, error: err.message };
  }
}

async function openFileDialog() {
  try {
    if (!mainWindow) {
      throw new Error('Main window not initialized');
    }
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Documents', extensions: ['docx', 'xlsx', 'xls'] },
        { name: 'Word Documents', extensions: ['docx'] },
        { name: 'Excel Spreadsheets', extensions: ['xlsx', 'xls'] }
      ]
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return processFile({ path: result.filePaths[0] }, mainWindow.webContents);
    }
    return { success: false, canceled: true };
  } catch (err) {
    console.error('Error opening file dialog:', err);
    mainWindow?.webContents.send(
      'content-html',
      `<p style="color: red; padding: 20px;">Error: ${err.message}</p>`
    );
    return { success: false, error: err.message };
  }
}


function createWindow(initialFile = null) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  if (initialFile) {
    mainWindow.webContents.on('did-finish-load', () => {
      processFile({ path: initialFile }, mainWindow.webContents);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function getFilePathFromArgs(args) {
  // On Windows, the file path is usually the last argument when using "Open with"
  // On dev, it might be the 3rd argument (electron . filePath)
  // We filter for existing files with supported extensions
  for (const arg of args) {
    if (arg.startsWith('--')) continue;
    try {
      if (fs.existsSync(arg)) {
        const ext = path.extname(arg).toLowerCase();
        if (['.docx', '.xlsx', '.xls'].includes(ext)) {
          return path.resolve(arg);
        }
      }
    } catch (e) {
      // Ignore errors for invalid paths
    }
  }
  return null;
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      const filePath = getFilePathFromArgs(commandLine);
      if (filePath) {
        processFile({ path: filePath }, mainWindow.webContents);
      }
    }
  });

  app.whenReady().then(() => {
    const filePath = getFilePathFromArgs(process.argv);
    createWindow(filePath);

    // macOS file opening support
    app.on('open-file', (event, path) => {
      event.preventDefault();
      if (mainWindow) {
        processFile({ path }, mainWindow.webContents);
      } else {
        createWindow(path);
      }
    });

    ipcMain.handle('open-file-dialog', openFileDialog);
    ipcMain.handle('load-file', (event, input) =>
      processFile(input, event.sender)
    );
    ipcMain.handle('adjust-zoom', (event, direction) => {
      const wc = event.sender;
      const step = 0.1;
      const min = 0.25;
      const max = 3;
      const current = wc.getZoomFactor();
      let next = current;

      if (direction === 'in') {
        next = Math.min(max, current + step);
      } else if (direction === 'out') {
        next = Math.max(min, current - step);
      } else if (direction === 'reset') {
        next = 1;
      }

      wc.setZoomFactor(next);
      return next;
    });

    const isMac = process.platform === 'darwin';
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Open',
            accelerator: 'CmdOrCtrl+O',
            click: () => openFileDialog()
          },
          { type: 'separator' },
          {
            label: 'Reveal in Finder/Explorer',
            accelerator: 'CmdOrCtrl+Shift+R',
            click: () => {
              const filePath = app.getPath('documents');
              if (filePath) {
                shell.showItemInFolder(filePath);
              }
            }
          },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { type: 'separator' },
          {
            label: 'Zoom In',
            accelerator: 'CmdOrCtrl+=',
            click: (_item, focusedWindow) => focusedWindow?.webContents.send('zoom-request', 'in')
          },
          {
            label: 'Zoom Out',
            accelerator: 'CmdOrCtrl+-',
            click: (_item, focusedWindow) => focusedWindow?.webContents.send('zoom-request', 'out')
          },
          {
            label: 'Reset Zoom',
            accelerator: 'CmdOrCtrl+0',
            click: (_item, focusedWindow) => focusedWindow?.webContents.send('zoom-request', 'reset')
          },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          ...(isMac ? [{ type: 'separator' }, { role: 'front' }] : [{ role: 'close' }])
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About Absolute Docs Freakout',
            click: () => showAbout()
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
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
}