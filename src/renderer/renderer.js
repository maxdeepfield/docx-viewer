document.addEventListener('DOMContentLoaded', () => {
  console.log('Renderer DOM loaded');
  console.log('electronAPI available:', !!window.electronAPI);
  const contentEl = document.getElementById('content');
  const documentSearch = setupDocumentSearch(contentEl);

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
        documentSearch.reset();
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

    documentSearch.refresh();
  };

  setupZoomShortcuts();
  setupDragAndDrop({ showMessage });
});

function setupDocumentSearch(contentEl) {
  const bar = document.getElementById('find-bar');
  const input = document.getElementById('find-input');
  const count = document.getElementById('find-count');
  const previousButton = document.getElementById('find-previous');
  const nextButton = document.getElementById('find-next');
  const closeButton = document.getElementById('find-close');
  let matches = [];
  let currentIndex = -1;

  const clearHighlights = () => {
    CSS.highlights.delete('document-search-results');
    CSS.highlights.delete('document-search-current');
  };

  const updateCount = () => {
    count.textContent = matches.length ? `${currentIndex + 1}/${matches.length}` : '0/0';
    count.classList.toggle('no-results', Boolean(input.value) && matches.length === 0);
  };

  const showCurrent = () => {
    CSS.highlights.delete('document-search-current');
    if (!matches.length) {
      updateCount();
      return;
    }

    if (currentIndex < 0) currentIndex = 0;
    const range = matches[currentIndex];
    CSS.highlights.set('document-search-current', new Highlight(range));
    range.startContainer.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    updateCount();
  };

  const find = () => {
    clearHighlights();
    matches = [];
    currentIndex = -1;
    const query = input.value.trim().toLocaleLowerCase();
    const root = contentEl.querySelector('.docx-page, .sheet-content:not(.hidden)');
    if (!query || !root) {
      updateCount();
      return;
    }

    const nodes = [];
    let text = '';
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => node.parentElement?.closest('[hidden], script, style')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT
    });

    while (walker.nextNode()) {
      nodes.push({ node: walker.currentNode, start: text.length, end: text.length + walker.currentNode.data.length });
      text += walker.currentNode.data;
    }

    const normalizedText = text.toLocaleLowerCase();
    let matchStart = normalizedText.indexOf(query);
    while (matchStart !== -1) {
      const matchEnd = matchStart + query.length;
      const startNode = nodes.find(({ start, end }) => matchStart >= start && matchStart < end);
      const endNode = nodes.find(({ start, end }) => matchEnd > start && matchEnd <= end);
      if (startNode && endNode) {
        const range = new Range();
        range.setStart(startNode.node, matchStart - startNode.start);
        range.setEnd(endNode.node, matchEnd - endNode.start);
        matches.push(range);
      }
      matchStart = normalizedText.indexOf(query, matchStart + Math.max(query.length, 1));
    }

    if (matches.length) {
      CSS.highlights.set('document-search-results', new Highlight(...matches));
      currentIndex = 0;
    }
    showCurrent();
  };

  const move = (direction) => {
    if (!matches.length) return;
    currentIndex = (currentIndex + direction + matches.length) % matches.length;
    showCurrent();
  };

  const open = () => {
    bar.hidden = false;
    input.focus();
    input.select();
  };

  const close = () => {
    bar.hidden = true;
    clearHighlights();
    contentEl.focus();
  };

  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      open();
    } else if (event.key === 'F3') {
      event.preventDefault();
      const wasHidden = bar.hidden;
      open();
      if (matches.length) {
        CSS.highlights.set('document-search-results', new Highlight(...matches));
        move(event.shiftKey ? -1 : 1);
      } else if (!wasHidden && input.value) {
        find();
      }
    } else if (!bar.hidden && event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  });
  input.addEventListener('input', find);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      move(event.shiftKey ? -1 : 1);
    }
  });
  previousButton.addEventListener('click', () => move(-1));
  nextButton.addEventListener('click', () => move(1));
  closeButton.addEventListener('click', close);

  return {
    reset() {
      input.value = '';
      matches = [];
      currentIndex = -1;
      clearHighlights();
      updateCount();
    },
    refresh() {
      if (!bar.hidden && input.value) find();
    }
  };
}

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
