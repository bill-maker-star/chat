class P2PChatApp {
    constructor() {
        // DOM Elements
        this.peerIdDisplay = document.getElementById('peerIdDisplay');
        this.chatBox = document.getElementById('chatBox');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.peerIdInput = document.getElementById('peerIdInput');
        this.disconnectButton = document.getElementById('disconnectButton');
        this.callButton = document.getElementById('callButton');
        this.endCallButton = document.getElementById('endCallButton');
        this.muteButton = document.getElementById('muteButton');
        this.pauseVideoButton = document.getElementById('pauseVideoButton');
        this.clearChatButton = document.getElementById('clearChatButton');
        this.localVideo = document.getElementById('localVideo');
        this.remoteVideo = document.getElementById('remoteVideo');
        this.connectButton = document.getElementById('connectButton');
        this.connectModal = document.getElementById('connectModal');
        this.setupModal = document.getElementById('setupModal');
        this.setupForm = document.getElementById('setupForm');
        this.manualPeerIdInput = document.getElementById('manualPeerIdInput');
        this.connectManualButton = document.getElementById('connectManualButton');
        this.contactsList = document.getElementById('contactsList');
        this.addContactButton = document.getElementById('addContactButton');
        this.screenShareButton = document.getElementById('screenShareButton');
        this.localVolume = document.getElementById('localVolume');
        this.remoteVolume = document.getElementById('remoteVolume');
        this.attachFileButton = document.getElementById('attachFileButton');
        this.fileInput = document.getElementById('fileInput');
        this.fileProgressContainer = document.getElementById('fileProgressContainer');
        this.fileName = document.getElementById('fileName');
        this.fileProgress = document.getElementById('fileProgress');
        this.fileProgressBar = document.getElementById('fileProgressBar');
        this.cancelFileButton = document.getElementById('cancelFileButton');
        this.sendVoiceButton = document.getElementById('sendVoiceButton');
        this.themeToggle = document.getElementById('themeToggle');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.notificationCenter = document.getElementById('notificationCenter');
        this.usernameInput = document.getElementById('usernameInput');
        this.mobileWarning = document.getElementById('mobileWarning');

        // App State
        this.peer = null;
        this.conn = null;
        this.localStream = null;
        this.currentCall = null;
        this.username = '';
        this.peerId = '';
        this.isMuted = false;
        this.isVideoPaused = false;
        this.isScreenSharing = false;
        this.contacts = [];
        this.contactStatus = {}; // Track online/offline status
        this.contactConnections = {}; // Track status monitoring connections
        this.fileChunks = {};
        this.currentFileTransfer = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.localTypingTimeout = null;
        this.remoteTypingTimeout = null;
        this.isTyping = false;
        this.theme = localStorage.getItem('theme') || 'light';
        this.objectURLs = [];

        // Initialize
        this.initTheme();
        this.initEventListeners();
        this.loadContacts();
        this.checkUserSetup();
        this.checkMobileDevice();
    }

    initTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const icon = this.theme === 'dark' ? 'fa-sun' : 'fa-moon';
        this.themeToggle.innerHTML = `<i class="fas ${icon}"></i>`;
        this.themeToggle.setAttribute('aria-label', `Switch to ${this.theme === 'dark' ? 'light' : 'dark'} theme`);
    }

    initEventListeners() {
        // Message sending
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        this.messageInput.addEventListener('input', () => this.handleTyping());

        // Connection management
        this.disconnectButton.addEventListener('click', () => this.disconnectFromPeer());

        // Call controls
        this.callButton.addEventListener('click', () => this.startVideoCall());
        this.endCallButton.addEventListener('click', () => this.endVideoCall());
        this.muteButton.addEventListener('click', () => this.toggleMute());
        this.pauseVideoButton.addEventListener('click', () => this.toggleVideoPause());
        this.screenShareButton.addEventListener('click', () => this.toggleScreenShare());

        // UI controls
        this.clearChatButton.addEventListener('click', () => this.clearChat());
        this.localVolume.addEventListener('input', (e) => this.adjustLocalVolume(e.target.value));
        this.remoteVolume.addEventListener('input', (e) => this.adjustRemoteVolume(e.target.value));

        // Connection modal
        this.connectButton.addEventListener('click', () => this.showConnectModal());
        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.connectModal.style.display = 'none';
                this.manualPeerIdInput.value = '';
            });
        });
        this.connectManualButton.addEventListener('click', () => this.connectManual());

        // Contacts
        this.addContactButton.addEventListener('click', () => this.addContact());

        // File sharing
        this.attachFileButton.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.cancelFileButton.addEventListener('click', () => this.cancelFileTransfer());

        // Voice messages
        this.sendVoiceButton.addEventListener('mousedown', () => this.startRecording());
        this.sendVoiceButton.addEventListener('mouseup', () => this.stopRecording());
        this.sendVoiceButton.addEventListener('mouseleave', () => this.stopRecording());

        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Setup form
        this.setupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.username = this.usernameInput.value.trim();
            this.peerId = this.peerIdInput.value.trim();
            
            if (this.username && this.peerId) {
                this.saveUserData(this.peerId, this.username);
                this.setupModal.style.display = 'none';
                this.initializePeer(this.peerId);
                this.appendSystemMessage(`Welcome, ${this.username}!`);
            } else {
                this.showNotification('Please fill in all fields', 'error');
            }
        });

        // Window events
        window.addEventListener('beforeunload', () => this.cleanup());
    }

    checkMobileDevice() {
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isScreenShareSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
        if (isMobile && !isScreenShareSupported) {
            if (this.mobileWarning) {
                this.mobileWarning.style.display = 'block';
            }
            this.screenShareButton.disabled = true;
            this.screenShareButton.title = 'Screen sharing not supported on this device';
            this.screenShareButton.setAttribute('aria-label', 'Screen sharing not supported on this device');
        }
    }

    checkUserSetup() {
        const savedData = this.loadUserData();
        this.usernameInput.value = savedData.username || '';
        this.peerIdInput.value = savedData.peerId || '';
        this.setupModal.style.display = 'flex';
    }

    initializePeer(customId) {
        try {
            this.peer = new Peer(customId, {
                debug: 2,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:stun2.l.google.com:19302' }
                    ]
                }
            });

            this.peer.on('open', (id) => {
                this.peerId = id;
                this.peerIdDisplay.textContent = `Your Peer ID: ${id}`;
                this.appendSystemMessage(`Your peer ID is: ${id}`);
                this.connectionStatus.classList.add('connected');
                this.saveUserData(id, this.username);
                // Start monitoring contact status
                this.contacts.forEach(contact => {
                    this.monitorContactStatus(contact.peerId);
                });
            });

            this.peer.on('error', (error) => {
                console.error('PeerJS error:', error);
                this.showNotification(`Connection error: ${error.message}`, 'error');
                this.connectionStatus.classList.remove('connected');
                if (error.type === 'unavailable-id') {
                    this.showNotification('Peer ID taken. Please choose another.', 'error');
                    this.setupModal.style.display = 'flex';
                }
            });

            this.peer.on('connection', (connection) => {
                // Accept status monitoring connections
                connection.on('data', (data) => {
                    if (data.type === 'ping') {
                        // Respond to ping with pong
                        connection.send({ type: 'pong' });
                    } else if (data.type === 'pong') {
                        // Update last pong time
                        this.contactConnections[connection.peer].lastPong = Date.now();
                    }
                });

                connection.on('open', () => {
                    this.contactStatus[connection.peer] = 'online';
                    this.renderContacts();
                });

                connection.on('close', () => {
                    this.contactStatus[connection.peer] = 'offline';
                    this.renderContacts();
                    delete this.contactConnections[connection.peer];
                });

                connection.on('error', (error) => {
                    console.error('Status connection error:', error);
                    this.contactStatus[connection.peer] = 'offline';
                    this.renderContacts();
                    delete this.contactConnections[connection.peer];
                });

                // Store status connection if it's not the main chat connection
                if (!this.conn || this.conn.peer !== connection.peer) {
                    this.contactConnections[connection.peer] = {
                        connection,
                        lastPong: Date.now()
                    };
                }
            });

            this.peer.on('call', async (call) => {
                try {
                    if (!this.localStream) {
                        const permissionsGranted = await this.requestMediaPermissions();
                        if (!permissionsGranted) {
                            call.close();
                            return;
                        }
                    }
                    
                    call.answer(this.localStream);
                    call.on('stream', (remoteStream) => {
                        this.remoteVideo.srcObject = remoteStream;
                        this.appendSystemMessage(`Incoming video call from ${call.peer}`);
                        this.currentCall = call;
                    });
                    
                    call.on('close', () => {
                        this.remoteVideo.srcObject = null;
                        this.appendSystemMessage(`Call ended with ${call.peer}`);
                        this.currentCall = null;
                    });

                    call.on('error', (error) => {
                        console.error('Call error:', error);
                        this.showNotification('Call failed', 'error');
                        this.currentCall = null;
                    });
                } catch (error) {
                    console.error('Error answering call:', error);
                    call.close();
                    this.showNotification('Error answering call', 'error');
                }
            });
        } catch (error) {
            console.error('Error initializing Peer:', error);
            this.showNotification('Error initializing connection', 'error');
            this.connectionStatus.classList.remove('connected');
        }
    }

    connectToPeer(peerId = null) {
        const targetPeerId = peerId || this.manualPeerIdInput.value.trim();
        if (!targetPeerId) {
            this.showNotification('Please enter a Peer ID', 'warning');
            return;
        }

        if (this.conn && this.conn.open) {
            this.showNotification('Already connected to a peer', 'warning');
            return;
        }

        try {
            this.conn = this.peer.connect(targetPeerId);
            this.connectionStatus.classList.add('connected');

            this.conn.on('open', () => {
                this.appendSystemMessage(`Connected to ${targetPeerId}`);
                this.addContact(targetPeerId, `Peer ${targetPeerId.substring(0, 5)}`);
                this.sendSystemMessage(`${this.username} connected`);
                this.contactStatus[targetPeerId] = 'online';
                this.renderContacts();
            });

            this.conn.on('data', (data) => {
                this.handleIncomingData(data);
            });

            this.conn.on('close', () => {
                this.appendSystemMessage(`Disconnected from ${targetPeerId}`);
                this.connectionStatus.classList.remove('connected');
                this.conn = null;
                this.contactStatus[targetPeerId] = 'offline';
                this.renderContacts();
            });

            this.conn.on('error', (error) => {
                console.error('Connection error:', error);
                this.showNotification(`Connection error: ${error.message}`, 'error');
                this.connectionStatus.classList.remove('connected');
                this.contactStatus[targetPeerId] = 'offline';
                this.renderContacts();
            });
        } catch (error) {
            console.error('Error connecting to peer:', error);
            this.showNotification('Error connecting to peer', 'error');
            this.connectionStatus.classList.remove('connected');
            this.contactStatus[targetPeerId] = 'offline';
            this.renderContacts();
        }
    }

    disconnectFromPeer() {
        if (this.conn) {
            const peerId = this.conn.peer;
            this.conn.close();
            this.conn = null;
            this.connectionStatus.classList.remove('connected');
            this.appendSystemMessage('Disconnected from peer');
            this.contactStatus[peerId] = 'offline';
            this.renderContacts();
            // Re-establish status monitoring
            this.monitorContactStatus(peerId);
        } else {
            this.showNotification('Not connected to any peer', 'warning');
        }
    }

    async requestMediaPermissions() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            this.localVideo.srcObject = this.localStream;
            return true;
        } catch (error) {
            console.error('Media access denied:', error);
            this.showNotification('Camera/microphone access denied', 'error');
            return false;
        }
    }

    async startVideoCall() {
        if (!this.conn) {
            this.showNotification('Not connected to any peer', 'warning');
            return;
        }

        try {
            const permissionsGranted = await this.requestMediaPermissions();
            if (!permissionsGranted) return;

            const call = this.peer.call(this.conn.peer, this.localStream);
            this.currentCall = call;

            call.on('stream', (remoteStream) => {
                this.remoteVideo.srcObject = remoteStream;
                this.appendSystemMessage(`Calling ${this.conn.peer}`);
            });

            call.on('close', () => {
                this.remoteVideo.srcObject = null;
                this.appendSystemMessage(`Call ended with ${this.conn.peer}`);
                this.currentCall = null;
            });

            call.on('error', (error) => {
                console.error('Call error:', error);
                this.showNotification('Call failed', 'error');
                this.currentCall = null;
            });
        } catch (error) {
            console.error('Error starting call:', error);
            this.showNotification('Error starting call', 'error');
        }
    }

    endVideoCall() {
        if (this.currentCall) {
            this.currentCall.close();
            this.remoteVideo.srcObject = null;
            this.appendSystemMessage('Call ended');
            this.currentCall = null;
        } else {
            this.showNotification('No active call to end', 'warning');
        }
    }

    toggleMute() {
        if (this.localStream) {
            this.isMuted = !this.isMuted;
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = !this.isMuted;
            });
            this.muteButton.innerHTML = this.isMuted 
                ? '<i class="fas fa-microphone-slash"></i> Unmute' 
                : '<i class="fas fa-microphone"></i> Mute';
            this.muteButton.setAttribute('aria-label', this.isMuted ? 'Unmute microphone' : 'Mute microphone');
            this.appendSystemMessage(this.isMuted ? 'Microphone muted' : 'Microphone unmuted');
        } else {
            this.showNotification('No active media stream', 'warning');
        }
    }

    toggleVideoPause() {
        if (this.localStream) {
            this.isVideoPaused = !this.isVideoPaused;
            this.localStream.getVideoTracks().forEach(track => {
                track.enabled = !this.isVideoPaused;
            });
            this.pauseVideoButton.innerHTML = this.isVideoPaused 
                ? '<i class="fas fa-video"></i> Resume Video' 
                : '<i class="fas fa-video-slash"></i> Pause Video';
            this.pauseVideoButton.setAttribute('aria-label', this.isVideoPaused ? 'Resume video' : 'Pause video');
            this.appendSystemMessage(this.isVideoPaused ? 'Video paused' : 'Video resumed');
        } else {
            this.showNotification('No active media stream', 'warning');
        }
    }

    async toggleScreenShare() {
        try {
            // Detect if the device is mobile and if screen sharing is supported
            const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
            const isScreenShareSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
            if (isMobile && !isScreenShareSupported) {
                this.showNotification('Screen sharing is not supported on this mobile browser. Try using a desktop browser or a native app.', 'warning');
                return;
            }

            if (this.isScreenSharing) {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: true, 
                    audio: true 
                });
                this.switchStream(stream);
                this.isScreenSharing = false;
                this.screenShareButton.innerHTML = '<i class="fas fa-desktop"></i> Share Screen';
                this.screenShareButton.setAttribute('aria-label', 'Share screen');
                this.appendSystemMessage('Switched to camera');
            } else {
                const stream = await navigator.mediaDevices.getDisplayMedia({ 
                    video: true, 
                    audio: true 
                });
                this.switchStream(stream);
                this.isScreenSharing = true;
                this.screenShareButton.innerHTML = '<i class="fas fa-times"></i> Stop Sharing';
                this.screenShareButton.setAttribute('aria-label', 'Stop sharing screen');
                this.appendSystemMessage('Screen sharing started');
                
                stream.getVideoTracks()[0].onended = () => {
                    if (this.isScreenSharing) {
                        this.toggleScreenShare();
                    }
                };
            }
        } catch (error) {
            console.error('Screen share error:', error);
            let errorMessage = 'Screen sharing failed. ';
            if (error.name === 'NotAllowedError') {
                errorMessage += 'Please grant screen sharing permissions.';
            } else if (error.name === 'NotSupportedError') {
                errorMessage += 'Screen sharing is not supported in this browser.';
            } else {
                errorMessage += 'Try again or use a different browser.';
            }
            this.showNotification(errorMessage, 'error');
        }
    }

    switchStream(newStream) {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        
        this.localStream = newStream;
        this.localVideo.srcObject = newStream;
        
        if (this.currentCall) {
            const videoTrack = newStream.getVideoTracks()[0];
            const audioTrack = newStream.getAudioTracks()[0];
            
            const videoSender = this.currentCall.peerConnection.getSenders().find(s => {
                return s.track.kind === 'video';
            });
            
            const audioSender = this.currentCall.peerConnection.getSenders().find(s => {
                return s.track.kind === 'audio';
            });
            
            if (videoSender && videoTrack) {
                videoSender.replaceTrack(videoTrack).catch(e => console.error('Error replacing video track:', e));
            }
            
            if (audioSender && audioTrack) {
                audioSender.replaceTrack(audioTrack).catch(e => console.error('Error replacing audio track:', e));
            }
        }
    }

    adjustLocalVolume(volume) {
        this.localVideo.volume = volume;
    }

    adjustRemoteVolume(volume) {
        this.remoteVideo.volume = volume;
    }

    sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        if (this.conn && this.conn.open) {
            try {
                this.conn.send({
                    type: 'message',
                    username: this.username,
                    message: message,
                    timestamp: new Date().toISOString()
                });
                this.appendMessage(`${this.username}: ${message}`, 'local');
                this.messageInput.value = '';
            } catch (error) {
                console.error('Error sending message:', error);
                this.showNotification('Error sending message', 'error');
            }
        } else {
            this.showNotification('Not connected to any peer', 'warning');
        }
    }

    sendSystemMessage(message) {
        if (this.conn && this.conn.open) {
            try {
                this.conn.send({
                    type: 'system',
                    username: 'System',
                    message: message,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Error sending system message:', error);
            }
        }
    }

    appendMessage(message, type) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', type);

        const colonIndex = message.indexOf(':');
        if (colonIndex > -1 && type !== 'system') {
            const usernamePart = message.substring(0, colonIndex + 1);
            const messagePart = message.substring(colonIndex + 1);

            const usernameSpan = document.createElement('span');
            usernameSpan.textContent = usernamePart;
            usernameSpan.classList.add('username');

            const messageSpan = document.createElement('span');
            messageSpan.textContent = messagePart;

            const timestampSpan = document.createElement('span');
            timestampSpan.classList.add('timestamp');
            timestampSpan.textContent = new Date().toLocaleTimeString();

            messageElement.appendChild(usernameSpan);
            messageElement.appendChild(messageSpan);
            messageElement.appendChild(timestampSpan);
        } else {
            messageElement.textContent = message;
        }

        this.chatBox.appendChild(messageElement);
        this.chatBox.scrollTop = this.chatBox.scrollHeight;
    }

    appendSystemMessage(message) {
        this.appendMessage(message, 'system');
    }

    handleIncomingData(data) {
        if (!data || typeof data !== 'object') {
            console.error('Invalid data received:', data);
            return;
        }

        try {
            switch (data.type) {
                case 'message':
                    if (data.username && data.message) {
                        this.appendMessage(`${data.username}: ${data.message}`, 'remote');
                    }
                    break;
                case 'system':
                    if (data.message) {
                        this.appendSystemMessage(data.message);
                    }
                    break;
                case 'typing':
                    if (data.username) {
                        this.showTypingIndicator(data.username);
                    }
                    break;
                case 'file-metadata':
                    if (data.fileName && data.fileSize && data.totalChunks) {
                        this.handleFileMetadata(data);
                    }
                    break;
                case 'file-chunk':
                    if (data.chunk && data.fileName && data.chunkIndex !== undefined) {
                        this.handleFileChunk(data);
                    }
                    break;
                case 'file-end':
                    if (data.fileName) {
                        this.completeFileTransfer(data);
                    }
                    break;
                case 'file-cancel':
                    if (data.fileName) {
                        delete this.fileChunks[data.fileName];
                        this.appendSystemMessage(`File transfer canceled: ${data.fileName}`);
                    }
                    break;
                case 'audio':
                    if (data.audioData && data.username) {
                        this.handleAudioMessage(data);
                    }
                    break;
                default:
                    console.log('Unknown data type:', data);
            }
        } catch (error) {
            console.error('Error handling incoming data:', error);
        }
    }

    handleTyping() {
        if (!this.isTyping) {
            this.isTyping = true;
            if (this.conn && this.conn.open) {
                try {
                    this.conn.send({
                        type: 'typing',
                        username: this.username
                    });
                } catch (error) {
                    console.error('Error sending typing indicator:', error);
                }
            }
        }

        clearTimeout(this.localTypingTimeout);
        this.localTypingTimeout = setTimeout(() => {
            this.isTyping = false;
        }, 1000);
    }

    showTypingIndicator(username) {
        let indicator = this.chatBox.querySelector('.typing-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.classList.add('typing-indicator');
            this.chatBox.appendChild(indicator);
        }
        indicator.textContent = `${username} is typing...`;

        clearTimeout(this.remoteTypingTimeout);
        this.remoteTypingTimeout = setTimeout(() => {
            indicator.remove();
        }, 2000);
    }

    clearChat() {
        this.chatBox.innerHTML = '';
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        event.target.value = '';

        if (file.size > 50 * 1024 * 1024) {
            this.showNotification('File size exceeds 50MB limit', 'error');
            return;
        }

        this.currentFileTransfer = {
            file: file,
            fileSize: file.size,
            chunksSent: 0,
            totalChunks: Math.ceil(file.size / (16 * 1024))
        };

        this.showFileProgress(file.name);

        if (this.conn && this.conn.open) {
            try {
                this.conn.send({
                    type: 'file-metadata',
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    totalChunks: this.currentFileTransfer.totalChunks,
                    timestamp: new Date().toISOString()
                });

                this.sendFileChunks(file);
            } catch (error) {
                console.error('Error sending file metadata:', error);
                this.showNotification('Error sending file', 'error');
                this.cancelFileTransfer();
            }
        } else {
            this.showNotification('Not connected to any peer', 'warning');
            this.cancelFileTransfer();
        }
    }

    sendFileChunks(file) {
        if (!this.currentFileTransfer || !this.conn || !this.conn.open) {
            this.cancelFileTransfer();
            return;
        }

        const chunkSize = 16 * 1024;
        const reader = new FileReader();
        let offset = 0;

        reader.onload = (e) => {
            if (!this.currentFileTransfer || !this.conn || !this.conn.open) {
                this.cancelFileTransfer();
                return;
            }

            try {
                this.conn.send({
                    type: 'file-chunk',
                    fileName: file.name,
                    chunk: e.target.result,
                    chunkIndex: this.currentFileTransfer.chunksSent,
                    timestamp: new Date().toISOString()
                });

                this.currentFileTransfer.chunksSent++;
                const progress = Math.round((this.currentFileTransfer.chunksSent / this.currentFileTransfer.totalChunks) * 100);
                this.updateFileProgress(progress);

                if (offset < file.size) {
                    offset += chunkSize;
                    const slice = file.slice(offset, offset + chunkSize);
                    reader.readAsArrayBuffer(slice);
                } else {
                    this.conn.send({
                        type: 'file-end',
                        fileName: file.name,
                        timestamp: new Date().toISOString()
                    });
                    this.completeFileTransfer({ fileName: file.name });
                }
            } catch (error) {
                console.error('Error sending file chunk:', error);
                this.showNotification('Error sending file chunk', 'error');
                this.cancelFileTransfer();
            }
        };

        reader.onerror = () => {
            this.showNotification('Error reading file', 'error');
            this.cancelFileTransfer();
        };

        const slice = file.slice(offset, offset + chunkSize);
        reader.readAsArrayBuffer(slice);
    }

    handleFileMetadata(data) {
        this.fileChunks[data.fileName] = {
            chunks: new Array(data.totalChunks).fill(null),
            fileType: data.fileType,
            fileSize: data.fileSize,
            totalChunks: data.totalChunks,
            receivedChunks: 0
        };

        this.appendSystemMessage(`Receiving file: ${data.fileName} (${this.formatFileSize(data.fileSize)})`);
    }

    handleFileChunk(data) {
        if (!this.fileChunks[data.fileName]) {
            return;
        }

        this.fileChunks[data.fileName].chunks[data.chunkIndex] = data.chunk;
        this.fileChunks[data.fileName].receivedChunks++;

        const progress = Math.round((this.fileChunks[data.fileName].receivedChunks / 
                                    this.fileChunks[data.fileName].totalChunks) * 100);
        
        const progressElement = document.getElementById(`progress-${data.fileName}`);
        if (progressElement) {
            progressElement.textContent = `${progress}%`;
            progressElement.previousElementSibling.value = progress;
        }
    }

    completeFileTransfer(data) {
        if (!data || !this.fileChunks[data.fileName]) {
            if (this.currentFileTransfer && this.currentFileTransfer.file.name === data.fileName) {
                this.updateFileProgress(100);
            }
            return;
        }

        const fileInfo = this.fileChunks[data.fileName];
        const chunks = fileInfo.chunks;
        
        if (fileInfo.receivedChunks !== fileInfo.totalChunks || chunks.some(chunk => chunk === null)) {
            this.showNotification(`File transfer incomplete for ${data.fileName}`, 'error');
            delete this.fileChunks[data.fileName];
            return;
        }

        try {
            const fileBlob = new Blob(chunks, { type: fileInfo.fileType });
            this.createFileMessage(data.fileName, fileInfo.fileType, fileInfo.fileSize, fileBlob);
        } catch (error) {
            console.error('Error creating file blob:', error);
            this.showNotification('Error processing received file', 'error');
        }

        delete this.fileChunks[data.fileName];
    }

    createFileMessage(fileName, fileType, fileSize, fileBlob) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'remote');

        const usernameSpan = document.createElement('span');
        usernameSpan.classList.add('username');
        usernameSpan.textContent = 'File received: ';

        const fileElement = document.createElement('div');
        fileElement.classList.add('file-message');

        const fileIcon = document.createElement('div');
        fileIcon.classList.add('file-icon');
        
        if (fileType.startsWith('image/')) {
            fileIcon.innerHTML = '<i class="fas fa-image"></i>';
            const img = document.createElement('img');
            const url = URL.createObjectURL(fileBlob);
            this.objectURLs.push(url);
            img.src = url;
            img.style.maxWidth = '200px';
            img.style.maxHeight = '200px';
            fileElement.appendChild(img);
        } else if (fileType.startsWith('audio/')) {
            fileIcon.innerHTML = '<i class="fas fa-music"></i>';
        } else if (fileType.startsWith('video/')) {
            fileIcon.innerHTML = '<i class="fas fa-video"></i>';
        } else if (fileType.includes('pdf')) {
            fileIcon.innerHTML = '<i class="fas fa-file-pdf"></i>';
        } else if (fileType.includes('word')) {
            fileIcon.innerHTML = '<i class="fas fa-file-word"></i>';
        } else if (fileType.includes('excel')) {
            fileIcon.innerHTML = '<i class="fas fa-file-excel"></i>';
        } else if (fileType.includes('powerpoint')) {
            fileIcon.innerHTML = '<i class="fas fa-file-powerpoint"></i>';
        } else if (fileType.includes('zip') || fileType.includes('compressed')) {
            fileIcon.innerHTML = '<i class="fas fa-file-archive"></i>';
        } else {
            fileIcon.innerHTML = '<i class="fas fa-file"></i>';
        }

        const fileInfo = document.createElement('div');
        fileInfo.classList.add('file-info');

        const fileNameElement = document.createElement('div');
        fileNameElement.classList.add('file-name');
        fileNameElement.textContent = fileName;

        const fileSizeElement = document.createElement('div');
        fileSizeElement.classList.add('file-size');
        fileSizeElement.textContent = this.formatFileSize(fileSize);

        fileInfo.appendChild(fileNameElement);
        fileInfo.appendChild(fileSizeElement);

        const downloadBtn = document.createElement('button');
        downloadBtn.classList.add('download-btn');
        downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
        downloadBtn.addEventListener('click', () => {
            this.downloadFile(fileBlob, fileName);
        });

        fileElement.appendChild(fileIcon);
        fileElement.appendChild(fileInfo);
        fileElement.appendChild(downloadBtn);

        messageElement.appendChild(usernameSpan);
        messageElement.appendChild(fileElement);

        this.chatBox.appendChild(messageElement);
        this.chatBox.scrollTop = this.chatBox.scrollHeight;
    }

    downloadFile(blob, fileName) {
        const url = URL.createObjectURL(blob);
        this.objectURLs.push(url);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.objectURLs = this.objectURLs.filter(u => u !== url);
        }, 100);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showFileProgress(fileName) {
        this.fileProgressContainer.style.display = 'block';
        this.fileName.textContent = fileName;
        this.fileProgress.textContent = '0%';
        this.fileProgressBar.value = 0;
    }

    updateFileProgress(progress) {
        this.fileProgress.textContent = `${progress}%`;
        this.fileProgressBar.value = progress;
        
        if (progress >= 100) {
            setTimeout(() => {
                this.fileProgressContainer.style.display = 'none';
                this.currentFileTransfer = null;
            }, 1000);
        }
    }

    cancelFileTransfer() {
        if (this.currentFileTransfer) {
            const fileName = this.currentFileTransfer.file.name;
            this.currentFileTransfer = null;
            this.fileProgressContainer.style.display = 'none';
            
            if (this.conn && this.conn.open) {
                try {
                    this.conn.send({
                        type: 'file-cancel',
                        fileName: fileName,
                        timestamp: new Date().toISOString()
                    });
                    this.appendSystemMessage(`File transfer canceled: ${fileName}`);
                } catch (error) {
                    console.error('Error sending file cancel:', error);
                }
            }
        }
    }

    startRecording() {
        if (!navigator.mediaDevices || !window.MediaRecorder) {
            this.showNotification('Voice messages not supported in your browser', 'warning');
            return;
        }

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                this.mediaRecorder = new MediaRecorder(stream);
                this.audioChunks = [];

                this.mediaRecorder.ondataavailable = (e) => {
                    this.audioChunks.push(e.data);
                };

                this.mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                    this.sendVoiceMessage(audioBlob);
                    stream.getTracks().forEach(track => track.stop());
                    this.mediaRecorder = null;
                };

                this.mediaRecorder.onerror = (e) => {
                    console.error('MediaRecorder error:', e.error);
                    this.showNotification('Error recording audio', 'error');
                    stream.getTracks().forEach(track => track.stop());
                    this.mediaRecorder = null;
                };

                this.mediaRecorder.start(100);
                this.sendVoiceButton.innerHTML = '<i class="fas fa-stop"></i> Release to Send';
                this.sendVoiceButton.style.backgroundColor = 'var(--danger-color)';
            })
            .catch(error => {
                console.error('Error accessing microphone:', error);
                this.showNotification('Microphone access denied', 'error');
            });
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            this.sendVoiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
            this.sendVoiceButton.style.backgroundColor = '';
        }
    }

    sendVoiceMessage(audioBlob) {
        if (!this.conn || !this.conn.open) {
            this.showNotification('Not connected to any peer', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const arrayBuffer = reader.result;
                this.conn.send({
                    type: 'audio',
                    audioData: arrayBuffer,
                    username: this.username,
                    timestamp: new Date().toISOString()
                });
                this.appendAudioMessage(audioBlob, 'local');
            } catch (error) {
                console.error('Error sending audio message:', error);
                this.showNotification('Error sending voice message', 'error');
            }
        };
        reader.onerror = () => {
            this.showNotification('Error reading audio data', 'error');
        };
        reader.readAsArrayBuffer(audioBlob);
    }

    handleAudioMessage(data) {
        try {
            const audioBlob = new Blob([new Uint8Array(data.audioData)], { type: 'audio/wav' });
            this.appendAudioMessage(audioBlob, 'remote', data.username);
        } catch (error) {
            console.error('Error processing audio message:', error);
            this.showNotification('Error processing voice message', 'error');
        }
    }

    appendAudioMessage(audioBlob, type, username = null) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', type);

        if (username) {
            const usernameSpan = document.createElement('span');
            usernameSpan.classList.add('username');
            usernameSpan.textContent = `${username}: `;
            messageElement.appendChild(usernameSpan);
        }

        const audioElement = document.createElement('audio');
        audioElement.controls = true;
        const url = URL.createObjectURL(audioBlob);
        this.objectURLs.push(url);
        audioElement.src = url;

        const timestampSpan = document.createElement('span');
        timestampSpan.classList.add('timestamp');
        timestampSpan.textContent = new Date().toLocaleTimeString();

        messageElement.appendChild(audioElement);
        messageElement.appendChild(timestampSpan);

        this.chatBox.appendChild(messageElement);
        this.chatBox.scrollTop = this.chatBox.scrollHeight;
    }

    showConnectModal() {
        this.connectModal.style.display = 'flex';
    }

    connectManual() {
        const peerId = this.manualPeerIdInput.value.trim();
        if (peerId) {
            this.connectToPeer(peerId);
            this.connectModal.style.display = 'none';
            this.manualPeerIdInput.value = '';
        } else {
            this.showNotification('Please enter a Peer ID', 'warning');
        }
    }

    loadContacts() {
        try {
            const savedContacts = localStorage.getItem('p2pChat_contacts');
            if (savedContacts) {
                this.contacts = JSON.parse(savedContacts);
                this.contacts.forEach(contact => {
                    this.contactStatus[contact.peerId] = 'offline';
                });
                this.renderContacts();
            }
        } catch (error) {
            console.error('Error loading contacts:', error);
            this.contacts = [];
        }
    }

    saveContacts() {
        try {
            localStorage.setItem('p2pChat_contacts', JSON.stringify(this.contacts));
        } catch (error) {
            console.error('Error saving contacts:', error);
        }
    }

    addContact(peerId = null, name = null) {
        if (!peerId) {
            peerId = prompt('Enter peer ID:');
            if (!peerId) return;
            
            name = prompt('Enter contact name:', `Contact ${this.contacts.length + 1}`);
            if (!name) return;
        }

        name = this.sanitizeInput(name);
        const existingIndex = this.contacts.findIndex(c => c.peerId === peerId);
        if (existingIndex >= 0) {
            this.contacts[existingIndex].name = name;
        } else {
            this.contacts.push({ peerId, name });
            this.contactStatus[peerId] = 'offline';
        }

        this.saveContacts();
        this.renderContacts();
        this.showNotification(`Added contact: ${name}`, 'success');
        this.monitorContactStatus(peerId);
    }

    removeContact(peerId) {
        this.contacts = this.contacts.filter(c => c.peerId !== peerId);
        delete this.contactStatus[peerId];
        if (this.contactConnections[peerId]) {
            this.contactConnections[peerId].connection.close();
            delete this.contactConnections[peerId];
        }
        this.saveContacts();
        this.renderContacts();
    }

    sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    monitorContactStatus(peerId) {
        if (!this.peer || this.peer.destroyed || peerId === this.peerId) {
            return;
        }

        // Skip if this is the main chat connection
        if (this.conn && this.conn.peer === peerId && this.conn.open) {
            this.contactStatus[peerId] = 'online';
            this.renderContacts();
            return;
        }

        // Close any existing status connection
        if (this.contactConnections[peerId]) {
            this.contactConnections[peerId].connection.close();
            delete this.contactConnections[peerId];
        }

        try {
            const statusConn = this.peer.connect(peerId, { serialization: 'none' });
            this.contactConnections[peerId] = {
                connection: statusConn,
                lastPong: Date.now(),
                heartbeatInterval: null
            };

            statusConn.on('open', () => {
                this.contactStatus[peerId] = 'online';
                this.renderContacts();

                // Start heartbeat
                this.contactConnections[peerId].heartbeatInterval = setInterval(() => {
                    if (statusConn.open) {
                        statusConn.send({ type: 'ping' });
                        // Check if pong was received recently
                        const now = Date.now();
                        if (now - this.contactConnections[peerId].lastPong > 10000) { // 10s timeout
                            this.contactStatus[peerId] = 'offline';
                            this.renderContacts();
                            statusConn.close();
                        }
                    }
                }, 5000); // Ping every 5 seconds
            });

            statusConn.on('data', (data) => {
                if (data.type === 'ping') {
                    statusConn.send({ type: 'pong' });
                } else if (data.type === 'pong') {
                    this.contactConnections[peerId].lastPong = Date.now();
                }
            });

            statusConn.on('close', () => {
                this.contactStatus[peerId] = 'offline';
                this.renderContacts();
                if (this.contactConnections[peerId]) {
                    clearInterval(this.contactConnections[peerId].heartbeatInterval);
                    delete this.contactConnections[peerId];
                    // Retry monitoring after a delay
                    setTimeout(() => this.monitorContactStatus(peerId), 10000);
                }
            });

            statusConn.on('error', (error) => {
                console.error(`Status monitoring error for ${peerId}:`, error);
                this.contactStatus[peerId] = 'offline';
                this.renderContacts();
                if (this.contactConnections[peerId]) {
                    clearInterval(this.contactConnections[peerId].heartbeatInterval);
                    delete this.contactConnections[peerId];
                    // Retry monitoring after a delay
                    setTimeout(() => this.monitorContactStatus(peerId), 10000);
                }
            });
        } catch (error) {
            console.error(`Error starting status monitoring for ${peerId}:`, error);
            this.contactStatus[peerId] = 'offline';
            this.renderContacts();
            // Retry monitoring after a delay
            setTimeout(() => this.monitorContactStatus(peerId), 10000);
        }
    }

    renderContacts() {
        this.contactsList.innerHTML = '';
        
        this.contacts.forEach(contact => {
            const li = document.createElement('li');
            
            // Create a container for name and status dot
            const nameContainer = document.createElement('span');
            nameContainer.classList.add('contact-name');
            
            // Add status dot
            const statusDot = document.createElement('span');
            statusDot.classList.add('status-dot');
            statusDot.classList.add(this.contactStatus[contact.peerId] === 'online' ? 'online' : 'offline');
            
            // Add contact name
            const nameSpan = document.createElement('span');
            nameSpan.textContent = contact.name;
            
            nameContainer.appendChild(statusDot);
            nameContainer.appendChild(nameSpan);
            li.appendChild(nameContainer);
            
            // Contact actions
            const actions = document.createElement('div');
            actions.classList.add('contact-actions');
            
            const connectBtn = document.createElement('button');
            connectBtn.innerHTML = '<i class="fas fa-plug"></i>';
            connectBtn.title = 'Connect';
            connectBtn.setAttribute('aria-label', `Connect to contact ${contact.name}`);
            connectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.connectToPeer(contact.peerId);
            });
            
            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
            removeBtn.title = 'Remove';
            removeBtn.setAttribute('aria-label', `Remove contact ${contact.name}`);
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Remove ${contact.name} from contacts?`)) {
                    this.removeContact(contact.peerId);
                }
            });
            
            actions.appendChild(connectBtn);
            actions.appendChild(removeBtn);
            
            li.appendChild(actions);
            this.contactsList.appendChild(li);
        });
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.theme);
        localStorage.setItem('theme', this.theme);
        
        const icon = this.theme === 'dark' ? 'fa-sun' : 'fa-moon';
        this.themeToggle.innerHTML = `<i class="fas ${icon}"></i>`;
        this.themeToggle.setAttribute('aria-label', `Switch to ${this.theme === 'dark' ? 'light' : 'dark'} theme`);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.classList.add('notification', type);
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        
        const closeBtn = document.createElement('span');
        closeBtn.classList.add('close-notification');
        closeBtn.textContent = '×';
        closeBtn.setAttribute('aria-label', 'Close notification');
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });
        
        notification.appendChild(messageSpan);
        notification.appendChild(closeBtn);
        this.notificationCenter.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    saveUserData(peerId, username) {
        try {
            localStorage.setItem('p2pChat_peerId', peerId);
            localStorage.setItem('p2pChat_username', username);
        } catch (error) {
            console.error('Error saving user data:', error);
        }
    }

    loadUserData() {
        try {
            return {
                peerId: localStorage.getItem('p2pChat_peerId'),
                username: localStorage.getItem('p2pChat_username')
            };
        } catch (error) {
            console.error('Error loading user data:', error);
            return { peerId: null, username: null };
        }
    }

    clearUserData() {
        try {
            localStorage.removeItem('p2pChat_peerId');
            localStorage.removeItem('p2pChat_username');
            localStorage.removeItem('p2pChat_contacts');
            localStorage.removeItem('theme');
            this.showNotification('All saved data cleared. Refresh the page.', 'success');
        } catch (error) {
            console.error('Error clearing user data:', error);
        }
    }

    cleanup() {
        if (this.peer && !this.peer.destroyed) {
            this.peer.destroy();
            this.peer = null;
        }
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
            this.localVideo.srcObject = null;
        }
        
        if (this.remoteVideo.srcObject) {
            this.remoteVideo.srcObject.getTracks().forEach(track => track.stop());
            this.remoteVideo.srcObject = null;
        }
        
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            this.mediaRecorder = null;
        }
        
        this.objectURLs.forEach(url => URL.revokeObjectURL(url));
        this.objectURLs = [];
        
        this.fileChunks = {};
        this.currentFileTransfer = null;
        this.connectionStatus.classList.remove('connected');
        
        // Close all status connections
        Object.values(this.contactConnections).forEach(({ connection, heartbeatInterval }) => {
            if (connection.open) {
                connection.close();
            }
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
            }
        });
        this.contactConnections = {};
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new P2PChatApp();
});
