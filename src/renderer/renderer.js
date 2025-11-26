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

  if (window.electronAPI && window.electronAPI.onDocxHtml) {
    window.electronAPI.onDocxHtml((event, html) => {
      console.log('Received docx-html:', !!html, 'length:', html ? html.length : 0);
      if (contentEl) {
        contentEl.innerHTML = html || '<p style="color: red;">No content received.</p>';
      } else {
        console.error('#content not found');
      }
    });
  } else {
    console.error('electronAPI.onDocxHtml not available');
  }

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

  window.addEventListener('drop', (event) => {
    preventDefaults(event);
    setDragging(false);

    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }

    const filePath = file.path || '';
    if (!filePath.toLowerCase().endsWith('.docx')) {
      console.warn('Dropped file is not a .docx:', filePath);
      if (showMessage) {
        showMessage('Please drop a .docx file.');
      }
      return;
    }

    if (showMessage) {
      showMessage('Loading document...');
    }

    if (window.electronAPI && window.electronAPI.loadDocxFile) {
      window.electronAPI
        .loadDocxFile(filePath)
        .then((result) => {
          if (result && result.success === false && result.error && showMessage) {
            showMessage(`Error: ${result.error}`);
          }
        })
        .catch((err) => {
          console.error('Failed to load DOCX via IPC:', err);
          if (showMessage) {
            showMessage('Failed to load document.');
          }
        });
    } else {
      console.error('electronAPI.loadDocxFile not available');
      if (showMessage) {
        showMessage('Drag-and-drop is not available.');
      }
    }
  });

  // Extra safety: prevent default navigation on body/document drag-drop
  document.addEventListener('dragover', preventDefaults, false);
  document.addEventListener('drop', preventDefaults, false);
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
