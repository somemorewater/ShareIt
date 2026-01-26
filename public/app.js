// Connect to Socket.IO server
const socket = io();

// Application state
let currentUser = {
  peerId: null,
  username: null
};
let currentRecipientUsername = null;

let webrtcManager = null;
let selectedFile = null;
let currentTransfer = null;

// DOM Elements
const usernameInput = document.getElementById('username-input');
const enterBtn = document.getElementById("enter-username-btn");
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const peerIdDisplay = document.getElementById('peer-id-display');
const fileInput = document.getElementById('file-input');
const fileDropZone = document.getElementById('file-drop-zone');
const fileSelectedView = document.getElementById('file-selected-view');
const fileNameDisplay = document.getElementById('file-name');
const fileSizeDisplay = document.getElementById('file-size');
const removeFileBtn = document.getElementById('remove-file-btn');
const sendFileBtn = document.getElementById('send-file-btn');
const recipientInput = document.getElementById("recipient-input");
const incomingFileView = document.getElementById('incoming-file-view');
const incomingSenderName = document.getElementById('incoming-sender-name');
const incomingFileName = document.getElementById('incoming-file-name');
const incomingFileSize = document.getElementById('incoming-file-size');
const acceptFileBtn = document.getElementById('accept-file-btn');
const declineFileBtn = document.getElementById('decline-file-btn');
const progressSection = document.getElementById('progress-section');
const progressStatus = document.getElementById('progress-status');
const progressPercent = document.getElementById('progress-percent');
const progressBar = document.getElementById('progress-bar');
const progressDetails = document.getElementById('progress-details');
const cancelTransferBtn = document.getElementById('cancel-transfer-btn');
const statusMessages = document.getElementById('status-messages');

// Initialize
function init() {
  // Register user with username
  const username = usernameInput.value.trim() || `user_${Date.now().toString(36)}`;
  socket.emit('register', username);
  
  setupEventListeners();
}

function registerUser() {
  const username = usernameInput.value.trim();
  if (!username) return;
  socket.emit("register", username);
}

// Setup event listeners
function setupEventListeners() {
  // Username input
  enterBtn.addEventListener("click", registerUser);

  usernameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") registerUser();
  });

  // File input
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  });

  // File drop zone
  fileDropZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropZone.classList.add('drag-over');
  });

  fileDropZone.addEventListener('dragleave', () => {
    fileDropZone.classList.remove('drag-over');
  });

  fileDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  });

  // Remove file button
  removeFileBtn.addEventListener('click', clearFileSelection);

  // Send file button
  sendFileBtn.addEventListener('click', sendFile);

  // Accept/Decline buttons
  acceptFileBtn.addEventListener('click', acceptIncomingFile);
  declineFileBtn.addEventListener('click', declineIncomingFile);

  // Cancel transfer button
  cancelTransferBtn.addEventListener('click', cancelTransfer);
}

// Socket.IO event handlers
socket.on('registered', (data) => {
  currentUser = data;
  peerIdDisplay.textContent = data.peerId.substring(0, 16) + '...';
  updateStatus('online');
  addStatusMessage('Connected to peer network', 'info');
  
  // Request user list
  socket.emit('get-users');
});

socket.on('users-updated', (users) => {
  updateRecipientList(users);
});

socket.on('offer', async ({ from, fromUsername, offer, filename, filesize }) => {
  // Show incoming file request
  showIncomingFile(from, fromUsername, filename, filesize);
  
  // Store offer for later acceptance
  currentTransfer = {
    from,
    fromUsername,
    offer,
    filename,
    filesize
  };
});

socket.on('answer', async ({ answer }) => {
  if (webrtcManager) {
    await webrtcManager.handleAnswer(answer);
  }
});

socket.on('ice-candidate', async ({ candidate }) => {
  if (webrtcManager) {
    await webrtcManager.handleIceCandidate(candidate);
  }
});

// Handle file selection
function handleFileSelect(file) {
  selectedFile = file;
  
  // Update UI
  fileDropZone.style.display = 'none';
  fileSelectedView.style.display = 'flex';
  fileNameDisplay.textContent = file.name;
  fileSizeDisplay.textContent = formatFileSize(file.size);
  
  // Get file extension for preview
  const ext = file.name.split('.').pop().toUpperCase();
  document.querySelector('.file-preview').textContent = ext.length <= 4 ? ext : 'FILE';
}

// Clear file selection
function clearFileSelection() {
  selectedFile = null;
  fileInput.value = '';
  fileDropZone.style.display = 'flex';
  fileSelectedView.style.display = 'none';
}

// Send file
async function sendFile() {
  if (!selectedFile) {
    addStatusMessage("No file selected", "error");
    return;
  }

  const recipientId = recipientInput.value.trim();
  if (!recipientId) {
    addStatusMessage("Please enter a recipient username", "error");
    return;
  }

  currentRecipientUsername = recipientId;

  try {
    // Create WebRTC connection
    webrtcManager = new WebRTCManager(socket);
    
    // Setup callbacks
    webrtcManager.onDataChannelOpen = () => {
      startFileTransfer(); // ✅ only fires when channel is truly ready
    };

    webrtcManager.onConnectionStateChange = (state) => {
      if (state === "failed" || state === "disconnected") {
        addStatusMessage("Connection failed", "error");
        hideProgress();
      }
    };


    // Create offer
    await webrtcManager.createOffer(recipientId, selectedFile);
    
    addStatusMessage(`Connecting to ${recipientId}...`, "info");
    
  } catch (error) {
    console.error('Error sending file:', error);
    addStatusMessage('Failed to initiate transfer', 'error');
  }
}

// Start file transfer
async function startFileTransfer() {
  showProgress(selectedFile.name, 'sending');
  
  try {
    await webrtcManager.sendFile(selectedFile, (progress) => {
      updateProgress(progress);
    });
    
    addStatusMessage(`File sent successfully to ${currentRecipientUsername}`, 'success');
    hideProgress();
    clearFileSelection();
    
  } catch (error) {
    console.error('Error during transfer:', error);
    addStatusMessage('Transfer failed', 'error');
    hideProgress();
  }
}

// Show incoming file request
function showIncomingFile(from, fromUsername, filename, filesize) {
  document.getElementById('empty-state').style.display = 'none';
  incomingFileView.style.display = 'block';
  
  incomingSenderName.textContent = fromUsername;
  incomingFileName.textContent = filename;
  incomingFileSize.textContent = formatFileSize(filesize);
  
  // Get file extension
  const ext = filename.split('.').pop().toUpperCase();
  document.querySelector('#incoming-file-view .file-preview').textContent = ext.length <= 4 ? ext : 'FILE';
}

// Accept incoming file
async function acceptIncomingFile() {
  if (!currentTransfer) return;
  
  try {
    webrtcManager = new WebRTCManager(socket);
    
    // Setup callbacks
    webrtcManager.onFileReceived = (fileData) => {
      // Download file
      downloadFile(fileData);
      addStatusMessage(`Received ${fileData.name} from ${currentTransfer.fromUsername}`, 'success');
      hideProgress();
      hideIncomingFile();
    };
    
    webrtcManager.onProgress = (progress) => {
      updateProgress(progress);
    };

    // Handle offer
    await webrtcManager.handleOffer(
      currentTransfer.from,
      currentTransfer.offer,
      {
        name: currentTransfer.filename,
        size: currentTransfer.filesize
      }
    );
    
    showProgress(currentTransfer.filename, 'receiving');
    incomingFileView.style.display = 'none';
    
  } catch (error) {
    console.error('Error accepting file:', error);
    addStatusMessage('Failed to accept file', 'error');
  }
}

// Decline incoming file
function declineIncomingFile() {
  currentTransfer = null;
  hideIncomingFile();
  addStatusMessage('File transfer declined', 'info');
}

// Hide incoming file view
function hideIncomingFile() {
  incomingFileView.style.display = 'none';
  document.getElementById('empty-state').style.display = 'flex';
}

// Show progress
function showProgress(filename, direction) {
  progressSection.style.display = 'block';
  progressStatus.textContent = `${direction === 'sending' ? 'Sending' : 'Receiving'}: ${filename}`;
  progressPercent.textContent = '0%';
  progressBar.style.width = '0%';
}

// Update progress
function updateProgress(progress) {
  const percent = Math.round(progress.percent);
  progressPercent.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;
  
  const loaded = formatFileSize(progress.loaded);
  const total = formatFileSize(progress.total);
  const remaining = estimateTimeRemaining(progress);
  
  progressDetails.textContent = `${loaded} / ${total} • ${remaining}`;
}

// Hide progress
function hideProgress() {
  progressSection.style.display = 'none';
  if (webrtcManager) {
    webrtcManager.close();
    webrtcManager = null;
  }
}

// Cancel transfer
function cancelTransfer() {
  hideProgress();
  addStatusMessage('Transfer cancelled', 'info');
  currentTransfer = null;
}

// Download file
function downloadFile(fileData) {
  const url = URL.createObjectURL(fileData.file);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileData.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Update status indicator
function updateStatus(status) {
  statusIndicator.className = `status-indicator status-${status}`;
  statusText.textContent = status === 'online' ? 'Online' : 'Offline';
}

// Add status message
function addStatusMessage(message, type = 'info') {
  const messageEl = document.createElement('div');
  messageEl.className = `status-message status-${type}`;
  
  const icon = type === 'success' ? '✓' : type === 'error' ? '!' : 'i';
  
  messageEl.innerHTML = `
    <div class="status-message-icon">${icon}</div>
    <div class="status-message-content">
      <div class="status-message-text">${message}</div>
      <div class="status-message-time">Just now</div>
    </div>
  `;
  
  statusMessages.insertBefore(messageEl, statusMessages.firstChild);
  
  // Remove old messages (keep only last 5)
  while (statusMessages.children.length > 5) {
    statusMessages.removeChild(statusMessages.lastChild);
  }
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Estimate time remaining
let lastProgress = { loaded: 0, time: Date.now() };
function estimateTimeRemaining(progress) {
  const now = Date.now();
  const timeDiff = now - lastProgress.time;
  const bytesDiff = progress.loaded - lastProgress.loaded;
  
  if (timeDiff > 0 && bytesDiff > 0) {
    const speed = bytesDiff / (timeDiff / 1000); // bytes per second
    const remaining = (progress.total - progress.loaded) / speed;
    
    lastProgress = { loaded: progress.loaded, time: now };
    
    if (remaining < 60) {
      return `~${Math.round(remaining)} seconds remaining`;
    } else {
      return `~${Math.round(remaining / 60)} minutes remaining`;
    }
  }
  
  return 'Calculating...';
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
