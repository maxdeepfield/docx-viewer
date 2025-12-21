document.addEventListener('DOMContentLoaded', () => {
  console.log('Renderer DOM loaded');
  console.log('electronAPI available:', !!window.electronAPI);
  const contentEl = document.getElementById('content');

  const showMessage = (message) => {
    if (contentEl) {
      contentEl.innerHTML = `<p class="placeholder">${message}</p>`;
    } else {
      console.error('#content not found');
    }
  };

  if (window.electronAPI && window.electronAPI.onContentHtml) {
    window.electronAPI.onContentHtml((event, html) => {
      console.log('Received content-html:', !!html, 'length:', html ? html.length : 0);
      if (contentEl) {
        contentEl.innerHTML = html || '<p style="color: red;">No content received.</p>';
      } else {
        console.error('#content not found');
      }
    });
  } else {
    console.error('electronAPI.onContentHtml not available');
  }

  // Handle XLSX sheet switching
  window.showSheet = (index) => {
    const tabs = document.querySelectorAll('.sheet-tab');
    const containers = document.querySelectorAll('.sheet-content');

    tabs.forEach((tab, i) => {
      tab.classList.toggle('active', i === index);
    });

    containers.forEach((container, i) => {
      container.classList.toggle('hidden', i !== index);
    });
  };

  setupZoomShortcuts();
  setupDragAndDrop({ showMessage });
});

function setupDragAndDrop({ showMessage }) {
  const preventDefaults = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const setDragging = (active) => {
    document.body.classList.toggle('drag-over', active);
  };

  ['dragenter', 'dragover'].forEach((eventName) => {
    window.addEventListener(eventName, (event) => {
      preventDefaults(event);
      setDragging(true);
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
    });
  });

  ['dragleave', 'dragend'].forEach((eventName) => {
    window.addEventListener(eventName, (event) => {
      preventDefaults(event);
      setDragging(false);
    });
  });

  window.addEventListener('drop', async (event) => {
    preventDefaults(event);
    setDragging(false);

    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }

    const fileName = (file.name || '').trim();
    const loweredName = fileName.toLowerCase();
    const isSupported = loweredName.endsWith('.docx') || loweredName.endsWith('.xlsx') || loweredName.endsWith('.xls');

    if (!isSupported) {
      console.warn('Dropped file is not supported:', { fileName });
      if (showMessage) {
        showMessage('Please drop a .docx or .xlsx file.');
      }
      return;
    }

    if (showMessage) {
      showMessage('Loading document...');
    }

    if (window.electronAPI && window.electronAPI.loadFileFromBuffer) {
      try {
        const buffer = await file.arrayBuffer();
        const result = await window.electronAPI.loadFileFromBuffer(buffer, fileName);
        if (result && result.success === false && result.error && showMessage) {
          showMessage(`Error: ${result.error}`);
        } else if (result && result.success) {
          console.log('File loaded via drop:', fileName);
        }
      } catch (err) {
        console.error('Failed to load file via drop:', err);
        if (showMessage) {
          showMessage('Failed to load document.');
        }
      }
    } else {
      console.error('electronAPI.loadFileFromBuffer not available');
      if (showMessage) {
        showMessage('Drag-and-drop is not available.');
      }
    }
  });

  // Extra safety: prevent navigation on document drag/drop without blocking our window handler
  document.addEventListener(
    'dragover',
    (event) => {
      event.preventDefault();
    },
    false
  );
  document.addEventListener(
    'drop',
    (event) => {
      event.preventDefault();
    },
    false
  );
}

function setupZoomShortcuts() {
  if (!window.electronAPI || !window.electronAPI.adjustZoom || !window.electronAPI.onZoomRequest) {
    console.warn('Zoom API not available');
    return;
  }

  window.electronAPI.onZoomRequest((direction) => {
    window.electronAPI.adjustZoom(direction);
  });

  window.addEventListener(
    'wheel',
    (event) => {
      if (!event.ctrlKey) return;

      event.preventDefault();
      const direction = event.deltaY < 0 ? 'in' : 'out';
      window.electronAPI.adjustZoom(direction);
    },
    { passive: false }
  );
}