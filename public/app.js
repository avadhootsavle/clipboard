// Kalkulus Securytas Application JavaScript

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const tabs = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Quick Retrieve PIN Form
  const pinRetrieveForm = document.getElementById('pinRetrieveForm');
  const pinInput = document.getElementById('pinInput');
  
  // Text Clip Form
  const textClipForm = document.getElementById('textClipForm');
  const textTitle = document.getElementById('textTitle');
  const textContent = document.getElementById('textContent');
  const textExpiry = document.getElementById('textExpiry');

  // File Upload Form
  const fileUploadForm = document.getElementById('fileUploadForm');
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const btnBrowseFiles = document.getElementById('btnBrowseFiles');
  const filePreviewStrip = document.getElementById('filePreviewStrip');
  const previewFileName = document.getElementById('previewFileName');
  const previewFileSize = document.getElementById('previewFileSize');
  const btnRemoveFile = document.getElementById('btnRemoveFile');
  const fileTitle = document.getElementById('fileTitle');
  const fileExpiry = document.getElementById('fileExpiry');

  // Storage Vault & Filter
  const vaultGrid = document.getElementById('vaultGrid');
  const vaultSearch = document.getElementById('vaultSearch');
  const filterChips = document.querySelectorAll('.chip');
  const emptyState = document.getElementById('emptyState');
  const vaultCount = document.getElementById('vaultCount');
  const statStorage = document.getElementById('statStorage');
  const statClips = document.getElementById('statClips');

  // Modals
  const pinSuccessModal = document.getElementById('pinSuccessModal');
  const btnCloseSuccessModal = document.getElementById('btnCloseSuccessModal');
  const modalPinCode = document.getElementById('modalPinCode');
  const btnCopyPin = document.getElementById('btnCopyPin');
  const btnSendWhatsapp = document.getElementById('btnSendWhatsapp');

  const payloadModal = document.getElementById('payloadModal');
  const btnClosePayloadModal = document.getElementById('btnClosePayloadModal');
  const btnClosePayloadBottom = document.getElementById('btnClosePayloadBottom');
  const payloadTitle = document.getElementById('payloadTitle');
  const payloadPin = document.getElementById('payloadPin');
  const payloadTypeBadge = document.getElementById('payloadTypeBadge');
  const payloadBodyContainer = document.getElementById('payloadBodyContainer');
  const payloadFooterActions = document.getElementById('payloadFooterActions');

  const whatsappGuideModal = document.getElementById('whatsappGuideModal');
  const btnWhatsappGuide = document.getElementById('btnWhatsappGuide');
  const btnCloseWaGuide = document.getElementById('btnCloseWaGuide');
  const btnCloseWaGuideBtn = document.getElementById('btnCloseWaGuideBtn');

  // State
  let currentFile = null;
  let activeClips = [];
  let currentFilter = 'all';
  let activeCreatedClip = null;
  let wakeupTimerInterval = null;
  let wakeupSeconds = 0;

  // Render Cold Start Banner Elements
  const serverWakeupBanner = document.getElementById('serverWakeupBanner');
  const wakeupTimerCount = document.getElementById('wakeupTimerCount');

  // Initialize
  initApp();

  function initApp() {
    setupTabSwitching();
    setupDropZone();
    loadVaultClips();
    loadStats();
    checkUrlPinParam();
  }

  function startWakeupTimer() {
    if (wakeupTimerInterval) return;
    wakeupSeconds = 0;
    if (wakeupTimerCount) wakeupTimerCount.textContent = '0s';
    if (serverWakeupBanner) serverWakeupBanner.classList.remove('hidden');

    wakeupTimerInterval = setInterval(() => {
      wakeupSeconds++;
      if (wakeupTimerCount) wakeupTimerCount.textContent = `${wakeupSeconds}s`;
    }, 1000);
  }

  function stopWakeupTimer() {
    if (wakeupTimerInterval) {
      clearInterval(wakeupTimerInterval);
      wakeupTimerInterval = null;
    }
    if (serverWakeupBanner) serverWakeupBanner.classList.add('hidden');
  }


  // 1. Auto URL PIN Lookup (e.g. ?pin=8392)
  function checkUrlPinParam() {
    const params = new URLSearchParams(window.location.search);
    const pin = params.get('pin');
    if (pin) {
      pinInput.value = pin;
      fetchPinPayload(pin);
    }
  }

  // 2. Tab Navigation
  function setupTabSwitching() {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        const targetId = tab.getAttribute('data-tab');
        document.getElementById(targetId).classList.add('active');

        if (targetId === 'tab-vault') {
          loadVaultClips();
        }
      });
    });
  }

  // 3. PIN Retrieval
  pinRetrieveForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pin = pinInput.value.trim();
    if (!pin) {
      showToast('Enter a valid PIN', 'error');
      return;
    }
    fetchPinPayload(pin);
  });

  async function fetchPinPayload(pin) {
    try {
      showToast('Searching...', 'info');
      const response = await fetch(`/api/pin/${encodeURIComponent(pin)}`);
      const data = await response.json();

      if (!data.success || !data.clip) {
        showToast(data.error || 'PIN not found or expired', 'error');
        return;
      }

      openPayloadModal(data.clip);
    } catch (err) {
      console.error('Fetch PIN error:', err);
      showToast('Connection error', 'error');
    }
  }

  // 4. Payload Viewer Modal
  function openPayloadModal(clip) {
    payloadTitle.textContent = clip.title || 'Untitled';
    payloadPin.textContent = clip.pin;

    let typeText = 'File';
    if (clip.type === 'file') {
      typeText = (clip.category || 'File').toUpperCase();
    } else if (clip.type === 'url') {
      typeText = 'Link';
    } else {
      typeText = 'Text';
    }

    payloadTypeBadge.textContent = typeText;

    payloadBodyContainer.innerHTML = '';
    payloadFooterActions.innerHTML = '';

    if (clip.type === 'file') {
      const category = clip.category;
      const fileUrl = clip.fileInfo.url;
      const originalName = clip.fileInfo.originalName;
      const formattedSize = formatBytes(clip.fileInfo.size);

      let mediaPreviewHtml = '';
      if (category === 'image') {
        mediaPreviewHtml = `<div class="media-player-container"><img src="${fileUrl}" alt="${originalName}" style="max-width: 100%; border-radius: 8px; border: 1px solid var(--border-subtle);" /></div>`;
      } else if (category === 'video') {
        mediaPreviewHtml = `
          <div class="media-player-container">
            <video controls autoplay name="media">
              <source src="${fileUrl}" type="${clip.fileInfo.mimeType || 'video/mp4'}">
            </video>
          </div>
        `;
      } else if (category === 'audio') {
        mediaPreviewHtml = `
          <div class="media-player-container">
            <audio controls style="width: 100%;">
              <source src="${fileUrl}" type="${clip.fileInfo.mimeType || 'audio/mpeg'}">
            </audio>
          </div>
        `;
      }

      payloadBodyContainer.innerHTML = `
        <div class="payload-file-box">
          <i class="fa-solid ${getFileIconClass(category)} file-hero-icon"></i>
          <h3>${originalName}</h3>
          <p class="text-secondary mt-1">${formattedSize} • Expires in ${formatExpiryTime(clip.expiresAt)}</p>
          ${mediaPreviewHtml}
        </div>
      `;

      payloadFooterActions.innerHTML = `
        <a href="/api/download/${clip.id}" class="btn btn-primary" download="${originalName}">
          Download File
        </a>
      `;
    } else {
      const content = clip.content;
      payloadBodyContainer.innerHTML = `
        <div class="payload-text-content" id="payloadTextRaw">${escapeHtml(content)}</div>
      `;

      if (clip.type === 'url') {
        payloadFooterActions.innerHTML = `
          <a href="${escapeHtml(content)}" target="_blank" rel="noopener" class="btn btn-accent">
            Open Link
          </a>
          <button class="btn btn-primary" onclick="copyTextToClipboard('${escapeJs(content)}')">
            Copy Link
          </button>
        `;
      } else {
        payloadFooterActions.innerHTML = `
          <button class="btn btn-primary" onclick="copyTextToClipboard('${escapeJs(content)}')">
            Copy Text
          </button>
        `;
      }
    }

    payloadModal.classList.remove('hidden');
  }

  // 5. Create Text / Link Clip
  textClipForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = textContent.value.trim();
    if (!content) return;

    try {
      const response = await fetch('/api/clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: textTitle.value.trim(),
          content: content,
          expiryMinutes: textExpiry.value
        })
      });

      const data = await response.json();
      if (data.success) {
        textClipForm.reset();
        openSuccessModal(data.clip);
        loadStats();
      } else {
        showToast(data.error || 'Error creating clip', 'error');
      }
    } catch (err) {
      console.error('Create clip error:', err);
      showToast('Server connection error', 'error');
    }
  });

  // 6. File Drag & Drop + Upload
  function setupDropZone() {
    btnBrowseFiles.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('click', (e) => {
      if (e.target !== btnBrowseFiles && !e.target.closest('#filePreviewStrip')) {
        fileInput.click();
      }
    });

    fileInput.addEventListener('change', handleFileSelected);

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        fileInput.files = files;
        handleFileSelected();
      }
    });

    btnRemoveFile.addEventListener('click', (e) => {
      e.stopPropagation();
      currentFile = null;
      fileInput.value = '';
      filePreviewStrip.classList.add('hidden');
      document.querySelector('.drop-zone-content').classList.remove('hidden');
    });
  }

  function handleFileSelected() {
    if (fileInput.files && fileInput.files[0]) {
      currentFile = fileInput.files[0];
      previewFileName.textContent = currentFile.name;
      previewFileSize.textContent = formatBytes(currentFile.size);

      document.querySelector('.drop-zone-content').classList.add('hidden');
      filePreviewStrip.classList.remove('hidden');
    }
  }

  fileUploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentFile) {
      showToast('Select a file to upload', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', currentFile);
    formData.append('title', fileTitle.value.trim());
    formData.append('expiryMinutes', fileExpiry.value);

    const btnSubmit = document.getElementById('btnUploadSubmit');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `Uploading...`;

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `Upload File`;

      if (data.success) {
        fileUploadForm.reset();
        currentFile = null;
        filePreviewStrip.classList.add('hidden');
        document.querySelector('.drop-zone-content').classList.remove('hidden');

        openSuccessModal(data.clip);
        loadStats();
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch (err) {
      console.error('File upload error:', err);
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `Upload File`;
      showToast('Upload error', 'error');
    }
  });

  // 7. Success PIN & WhatsApp Modal
  function openSuccessModal(clip) {
    activeCreatedClip = clip;
    modalPinCode.textContent = clip.pin;

    const qrContainer = document.getElementById('qrcodeCanvas');
    qrContainer.innerHTML = '';
    
    const fullShareUrl = `${window.location.origin}/?pin=${clip.pin}`;
    
    new QRCode(qrContainer, {
      text: fullShareUrl,
      width: 120,
      height: 120,
      colorDark : "#000000",
      colorLight : "#ffffff",
      correctLevel : QRCode.CorrectLevel.H
    });

    pinSuccessModal.classList.remove('hidden');
  }

  btnCopyPin.addEventListener('click', () => {
    if (activeCreatedClip) {
      copyTextToClipboard(activeCreatedClip.pin, 'PIN copied');
    }
  });

  btnSendWhatsapp.addEventListener('click', () => {
    if (activeCreatedClip) {
      const pin = activeCreatedClip.pin;
      const title = activeCreatedClip.title;
      const shareUrl = `${window.location.origin}/?pin=${pin}`;
      const msg = `Kalkulus Securytas\n\nPIN: ${pin}\nTitle: ${title}\nLink: ${shareUrl}`;
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(whatsappUrl, '_blank');
    }
  });

  // 8. Load Storage Vault Clips
  async function loadVaultClips() {
    try {
      const response = await fetch('/api/clips');
      const data = await response.json();

      if (data.success) {
        activeClips = data.clips;
        renderVaultGrid();
      }
    } catch (err) {
      console.error('Load vault error:', err);
    }
  }

  function renderVaultGrid() {
    const searchVal = vaultSearch.value.toLowerCase().trim();
    
    const filtered = activeClips.filter(clip => {
      if (currentFilter !== 'all') {
        if (currentFilter === 'text' && clip.type === 'file') return false;
        if (currentFilter === 'presentation' && clip.category !== 'presentation') return false;
        if (currentFilter === 'video' && clip.category !== 'video') return false;
        if (currentFilter === 'audio' && clip.category !== 'audio') return false;
        if (currentFilter === 'pdf' && clip.category !== 'pdf') return false;
        if (currentFilter === 'document' && clip.category !== 'document') return false;
      }

      if (searchVal) {
        const titleMatch = (clip.title || '').toLowerCase().includes(searchVal);
        const pinMatch = (clip.pin || '').includes(searchVal);
        const contentMatch = (clip.content || '').toLowerCase().includes(searchVal);
        const fileMatch = clip.fileInfo ? clip.fileInfo.originalName.toLowerCase().includes(searchVal) : false;

        return titleMatch || pinMatch || contentMatch || fileMatch;
      }

      return true;
    });

    vaultCount.textContent = activeClips.length;

    if (filtered.length === 0) {
      vaultGrid.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    vaultGrid.innerHTML = filtered.map(clip => renderVaultCardHtml(clip)).join('');

    document.querySelectorAll('.btn-card-view').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const targetClip = activeClips.find(c => c.id === id);
        if (targetClip) openPayloadModal(targetClip);
      });
    });

    document.querySelectorAll('.btn-card-copy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const text = e.currentTarget.getAttribute('data-content');
        copyTextToClipboard(text, 'Copied to clipboard');
      });
    });

    document.querySelectorAll('.btn-card-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('Delete this item?')) {
          await deleteClip(id);
        }
      });
    });

    document.querySelectorAll('.btn-card-wa').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pin = e.currentTarget.getAttribute('data-pin');
        const title = e.currentTarget.getAttribute('data-title');
        const shareUrl = `${window.location.origin}/?pin=${pin}`;
        const msg = `Kalkulus Securytas\n\nPIN: ${pin}\nTitle: ${title}\nLink: ${shareUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
      });
    });
  }

  function renderVaultCardHtml(clip) {
    const isFile = clip.type === 'file';
    const iconClass = isFile ? getFileIconClass(clip.category) : (clip.type === 'url' ? 'fa-link' : 'fa-note-sticky');

    const title = escapeHtml(clip.title || (isFile ? clip.fileInfo.originalName : 'Note'));
    const expiryText = formatExpiryTime(clip.expiresAt);
    let snippet = '';

    if (isFile) {
      snippet = `${(clip.category || 'File').toUpperCase()}: ${escapeHtml(clip.fileInfo.originalName)} (${formatBytes(clip.fileInfo.size)})`;
    } else {
      snippet = escapeHtml(clip.content);
    }

    return `
      <div class="vault-item-card">
        <div class="item-top">
          <div class="item-icon-box">
            <i class="fa-solid ${iconClass}"></i>
          </div>
          <div class="item-info">
            <div class="item-title" title="${title}">${title}</div>
            <div class="item-meta">
              <span class="item-pin-badge">PIN: ${clip.pin}</span>
              <span><i class="fa-regular fa-clock"></i> ${expiryText}</span>
            </div>
          </div>
        </div>

        <div class="item-snippet">${snippet}</div>

        <div class="item-bottom">
          <div class="item-actions">
            ${isFile ? `
              <a href="/api/download/${clip.id}" class="btn btn-sm btn-primary" download="${escapeHtml(clip.fileInfo.originalName)}" title="Download File">
                Download
              </a>
            ` : `
              <button class="btn btn-sm btn-primary btn-card-copy" data-content="${escapeJs(clip.content)}" title="Copy Content">
                Copy
              </button>
            `}
            
            <button class="btn btn-sm btn-secondary btn-card-view" data-id="${clip.id}" title="View Details">
              View
            </button>
            <button class="btn btn-sm btn-secondary btn-card-wa" data-pin="${clip.pin}" data-title="${title}" title="Share to WhatsApp">
              <i class="fa-brands fa-whatsapp text-whatsapp"></i>
            </button>
          </div>

          <button class="btn-icon btn-card-delete" data-id="${clip.id}" title="Delete">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }

  // Filter chips click
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.getAttribute('data-filter');
      renderVaultGrid();
    });
  });

  vaultSearch.addEventListener('input', renderVaultGrid);

  async function deleteClip(id) {
    try {
      const res = await fetch(`/api/clips/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Item deleted', 'success');
        loadVaultClips();
        loadStats();
      }
    } catch (e) {
      showToast('Error deleting item', 'error');
    }
  }

  // 9. Load Stats
  async function loadStats() {
    const timerTimeout = setTimeout(() => {
      startWakeupTimer();
    }, 1200);

    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      clearTimeout(timerTimeout);
      stopWakeupTimer();

      if (data.success) {
        statStorage.textContent = data.stats.formattedStorage;
        statClips.textContent = `${data.stats.totalClips} Files`;
      }
    } catch (e) {
      clearTimeout(timerTimeout);
      stopWakeupTimer();
      console.error('Stats error:', e);
    }
  }


  // Modals close
  btnCloseSuccessModal.addEventListener('click', () => pinSuccessModal.classList.add('hidden'));
  btnClosePayloadModal.addEventListener('click', () => payloadModal.classList.add('hidden'));
  btnClosePayloadBottom.addEventListener('click', () => payloadModal.classList.add('hidden'));

  btnWhatsappGuide.addEventListener('click', () => whatsappGuideModal.classList.remove('hidden'));
  btnCloseWaGuide.addEventListener('click', () => whatsappGuideModal.classList.add('hidden'));
  btnCloseWaGuideBtn.addEventListener('click', () => whatsappGuideModal.classList.add('hidden'));

  function getFileIconClass(category) {
    switch (category) {
      case 'presentation': return 'fa-file-powerpoint';
      case 'video': return 'fa-file-video';
      case 'audio': return 'fa-file-audio';
      case 'pdf': return 'fa-file-pdf';
      case 'document': return 'fa-file-word';
      case 'image': return 'fa-file-image';
      case 'archive': return 'fa-file-zipper';
      case 'code': return 'fa-file-code';
      default: return 'fa-file';
    }
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatExpiryTime(expiresAt) {
    const diff = expiresAt - Date.now();
    if (diff <= 0) return 'Expired';
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 60) return `${mins}m left`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h left`;
    const days = Math.floor(hours / 24);
    return `${days}d left`;
  }

  window.copyTextToClipboard = function(text, customMsg) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(customMsg || 'Copied to clipboard', 'success');
    }).catch(() => {
      showToast('Copy failed', 'error');
    });
  };

  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeJs(str) {
    if (!str) return '';
    return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
  }
});
