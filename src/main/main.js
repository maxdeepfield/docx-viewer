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

let mainWindow;

async function showAbout() {
  const parent = mainWindow || null;
  const siteUrl = 'https://absolutefreakout.com';
  const githubUrl = 'https://github.com/maxdeepfield/docx-viewer';
  const { response } = await dialog.showMessageBox(parent, {
    type: 'info',
    title: 'About Absolute DOCX Freakout',
    message: 'Absolute DOCX Freakout',
    detail: [
      'Absolute DOCX Freakout: no-nonsense .docx file viewer',
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

async function convertAndSendDocx(input, targetWebContents = mainWindow?.webContents) {
  try {
    if (!targetWebContents) {
      throw new Error('Main window not initialized');
    }
    if (!input) {
      throw new Error('No input provided');
    }

    let conversion;
    if (input.path) {
      const filePath = input.path;
      if (path.extname(filePath).toLowerCase() !== '.docx') {
        throw new Error('Only .docx files are supported.');
      }
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found.');
      }
      console.log('Opening and converting DOCX from path:', filePath);
      conversion = await mammoth.convertToHtml({ path: filePath });
    } else if (input.buffer) {
      console.log('Opening and converting DOCX from buffer');
      conversion = await mammoth.convertToHtml({ buffer: Buffer.from(input.buffer) });
    } else {
      throw new Error('Invalid input type');
    }

    console.log(
      'Mammoth conversion:',
      !!conversion.value,
      'length:',
      conversion.value ? conversion.value.length : 0,
      'messages:',
      conversion.messages
    );

    targetWebContents.send('docx-html', conversion.value || '<p>No content received.</p>');
    return { success: true };
  } catch (err) {
    console.error('Error opening or converting DOCX:', err);
    targetWebContents?.send(
      'docx-html',
      `<p style="color: red; padding: 20px;">Error: ${err.message}</p>`
    );
    return { success: false, error: err.message };
  }
}

async function openDocxDialog() {
  try {
    if (!mainWindow) {
      throw new Error('Main window not initialized');
    }
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'DOCX', extensions: ['docx'] }]
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return convertAndSendDocx({ path: result.filePaths[0] }, mainWindow.webContents);
    }
    return { success: false, canceled: true };
  } catch (err) {
    console.error('Error opening DOCX dialog:', err);
    mainWindow?.webContents.send(
      'docx-html',
      `<p style="color: red; padding: 20px;">Error: ${err.message}</p>`
    );
    return { success: false, error: err.message };
  }
}


function createWindow() {
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


  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  ipcMain.handle('open-docx-dialog', openDocxDialog);
  ipcMain.handle('load-docx-file', (event, input) =>
    convertAndSendDocx(input, event.sender)
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
          click: () => openDocxDialog()
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
          label: 'About Absolute DOCX Freakout',
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