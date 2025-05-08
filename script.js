// ================== Enhanced P2P Chat and Video Call Application ==================

// DOM Elements
const elements = {
    chatBox: document.getElementById('chatBox'),
    messageInput: document.getElementById('messageInput'),
    sendButton: document.getElementById('sendButton'),
    peerIdInput: document.getElementById('peerIdInput'),
    connectButton: document.getElementById('connectButton'),
    reconnectButton: document.getElementById('reconnectButton'),
    disconnectButton: document.getElementById('disconnectButton'),
    callButton: document.getElementById('callButton'),
    endCallButton: document.getElementById('endCallButton'),
    muteButton: document.getElementById('muteButton'),
    pauseVideoButton: document.getElementById('pauseVideoButton'),
    clearChatButton: document.getElementById('clearChatButton'),
    clearDataButton: document.getElementById('clearDataButton'),
    localVideo: document.getElementById('localVideo'),
    remoteVideo: document.getElementById('remoteVideo'),
    peerIdDisplay: document.getElementById('peerIdDisplay'),
    fileShareButton: document.getElementById('fileShareButton'),
    photoShareButton: document.getElementById('photoShareButton'),
    locationShareButton: document.getElementById('locationShareButton'),
    fileInput: document.getElementById('fileInput'),
    photoInput: document.getElementById('photoInput'),
    sharedContentContainer: document.getElementById('sharedContentContainer'),
    connectionInputGroup: document.getElementById('connectionInputGroup'),
    menuToggle: document.getElementById('menuToggle'),
    sidebar: document.getElementById('sidebar'),
    imageModal: document.getElementById('imageModal'),
    modalImage: document.getElementById('modalImage'),
    modalClose: document.getElementById('modalClose')
};

// Application State
const state = {
    peer: null,
    conn: null,
    localStream: null,
    currentCall: null,
    username: 'Anonymous',
    isMuted: false,
    isVideoPaused: false,
    isConnected: false
};

// Local Storage Functions
const storage = {
    save: (peerId, name) => {
        localStorage.setItem('p2pChat_peerId', peerId);
        localStorage.setItem('p2pChat_username', name);
    },
    saveLastPeer: (peerId) => {
        localStorage.setItem('p2pChat_lastPeerId', peerId);
    },
    load: () => ({
        peerId: localStorage.getItem('p2pChat_peerId'),
        username: localStorage.getItem('p2pChat_username'),
        lastPeerId: localStorage.getItem('p2pChat_lastPeerId')
    }),
    clear: () => {
        localStorage.removeItem('p2pChat_peerId');
        localStorage.removeItem('p2pChat_username');
        localStorage.removeItem('p2pChat_lastPeerId');
    }
};

// UI Functions
const ui = {
    appendMessage: (message, type) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', type);
        
        if (type === 'system') {
            messageElement.textContent = message;
        } else {
            const colonIndex = message.indexOf(':');
            if (colonIndex > -1) {
                const usernamePart = message.substring(0, colonIndex + 1);
                const messagePart = message.substring(colonIndex + 1);

                const usernameSpan = document.createElement('span');
                usernameSpan.classList.add('username');
                usernameSpan.textContent = usernamePart;

                const messageSpan = document.createElement('span');
                messageSpan.textContent = messagePart;

                messageElement.appendChild(usernameSpan);
                messageElement.appendChild(messageSpan);
            } else {
                messageElement.textContent = message;
            }
        }

        elements.chatBox.appendChild(messageElement);
        elements.chatBox.scrollTop = elements.chatBox.scrollHeight;
    },
    
    updateConnectionStatus: (status) => {
        const statusIndicator = status ? 
            '<span class="connection-indicator connected"></span> Connected' : 
            '<span class="connection-indicator disconnected"></span> Disconnected';
        elements.peerIdDisplay.innerHTML = `${statusIndicator} | Your ID: ${state.peer?.id || 'Not set'}`;
    },
    
    toggleButtons: (connected) => {
        elements.connectButton.disabled = connected;
        elements.disconnectButton.disabled = !connected;
        elements.callButton.disabled = !connected;
        elements.sendButton.disabled = !connected;
        elements.reconnectButton.disabled = connected || !storage.load().lastPeerId;
        
        elements.peerIdInput.style.display = connected ? 'none' : 'block';
        elements.connectButton.style.display = connected ? 'none' : 'block';
    },
    
    clearChat: () => {
        elements.chatBox.innerHTML = '';
    },
    
    displaySharedFile: (filename, data, type) => {
        const fileElement = document.createElement('div');
        fileElement.className = `shared-file ${type}`;
        
        const icon = document.createElement('i');
        icon.className = 'fas fa-file-download';
        
        const link = document.createElement('a');
        link.href = data;
        link.download = filename;
        link.className = 'download-link';
        link.innerHTML = `${icon.outerHTML} Download ${filename}`;
        
        fileElement.appendChild(link);
        elements.sharedContentContainer.appendChild(fileElement);
    },
    
    displaySharedImage: (data, type) => {
        const container = document.createElement('div');
        container.className = `shared-image ${type}`;
        
        const img = document.createElement('img');
        img.src = data;
        img.alt = 'Shared photo';
        img.className = 'shared-photo';
        img.addEventListener('click', () => {
            elements.modalImage.src = data;
            elements.imageModal.classList.add('active');
        });
        
        container.appendChild(img);
        elements.sharedContentContainer.appendChild(container);
    },
    
    displaySharedLocation: (location, type) => {
        const container = document.createElement('div');
        container.className = `shared-location ${type}`;
        
        const icon = document.createElement('i');
        icon.className = 'fas fa-map-marker-alt';
        
        const link = document.createElement('a');
        link.href = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
        link.target = '_blank';
        link.className = 'location-link';
        link.innerHTML = `${icon.outerHTML} View Location (Accuracy: ${Math.round(location.accuracy)}m)`;
        
        container.appendChild(link);
        elements.sharedContentContainer.appendChild(container);
    },
    
    showAlert: (message, type = 'info') => {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 3000);
    },

    toggleSidebar: () => {
        elements.sidebar.classList.toggle('active');
    },

    closeModal: () => {
        elements.imageModal.classList.remove('active');
        elements.modalImage.src = '';
    }
};

// PeerJS Functions
const peerFunctions = {
    initialize: (customId) => {
        state.peer = new Peer(customId);
        
        state.peer.on('open', (id) => {
            console.log('PeerJS connection opened with ID:', id);
            elements.peerIdDisplay.textContent = `Your ID: ${id}`;
            ui.appendMessage(`Your peer ID is: ${id}`, 'system');
            ui.updateConnectionStatus(false);
        });
        
        state.peer.on('error', (error) => {
            console.error('PeerJS error:', error);
            ui.appendMessage(`Error: ${error.message}`, 'system');
        });
        
        state.peer.on('connection', (connection) => {
            state.conn = connection;
            state.isConnected = true;
            storage.saveLastPeer(connection.peer);
            
            connection.on('open', () => {
                connection.send({ 
                    username: 'System', 
                    message: `Connected to ${state.username}` 
                });
                ui.appendMessage(`Connected to ${connection.peer}`, 'system');
                ui.updateConnectionStatus(true);
                ui.toggleButtons(true);
            });
            
            connection.on('data', (data) => {
                if (data.type === 'file') {
                    ui.appendMessage(`${data.username} shared a file: ${data.filename}`, 'remote');
                    ui.displaySharedFile(data.filename, data.data, 'remote');
                } else if (data.type === 'image') {
                    ui.appendMessage(`${data.username} shared a photo`, 'remote');
                    ui.displaySharedImage(data.data, 'remote');
                } else if (data.type === 'location') {
                    ui.appendMessage(`${data.username} shared their location`, 'remote');
                    ui.displaySharedLocation(data.location, 'remote');
                } else {
                    ui.appendMessage(
                        `${data.username}: ${data.message}`, 
                        data.username === 'System' ? 'system' : 'remote'
                    );
                }
            });
            
            connection.on('close', () => {
                ui.appendMessage(`Disconnected from ${connection.peer}`, 'system');
                state.isConnected = false;
                ui.updateConnectionStatus(false);
                ui.toggleButtons(false);
                state.conn = null;
            });
        });
        
        state.peer.on('call', (call) => {
            if (state.localStream) {
                call.answer(state.localStream);
                call.on('stream', (remoteStream) => {
                    elements.remoteVideo.srcObject = remoteStream;
                });
                state.currentCall = call;
                ui.appendMessage(`Incoming video call from ${call.peer}`, 'system');
            } else {
                call.close();
                ui.appendMessage(`Missed video call from ${call.peer} (no media permissions)`, 'system');
            }
        });
    },
    
    connect: (peerId) => {
        if (!peerId) {
            ui.appendMessage('Please enter a Peer ID', 'system');
            return;
        }
        
        if (state.peer) {
            state.conn = state.peer.connect(peerId);
            state.isConnected = true;
            storage.saveLastPeer(peerId);
            
            state.conn.on('open', () => {
                state.conn.send({ 
                    username: 'System', 
                    message: `Connected to ${state.username}` 
                });
                ui.appendMessage(`Connected to ${peerId}`, 'system');
                ui.updateConnectionStatus(true);
                ui.toggleButtons(true);
            });
            
            state.conn.on('data', (data) => {
                if (data.type === 'file') {
                    ui.appendMessage(`${data.username} shared a file: ${data.filename}`, 'remote');
                    ui.displaySharedFile(data.filename, data.data, 'remote');
                } else if (data.type === 'image') {
                    ui.appendMessage(`${data.username} shared a photo`, 'remote');
                    ui.displaySharedImage(data.data, 'remote');
                } else if (data.type === 'location') {
                    ui.appendMessage(`${data.username} shared their location`, 'remote');
                    ui.displaySharedLocation(data.location, 'remote');
                } else {
                    ui.appendMessage(
                        `${data.username}: ${data.message}`, 
                        data.username === 'System' ? 'system' : 'remote'
                    );
                }
            });
            
            state.conn.on('close', () => {
                ui.appendMessage(`Disconnected from ${peerId}`, 'system');
                state.isConnected = false;
                ui.updateConnectionStatus(false);
                ui.toggleButtons(false);
                state.conn = null;
            });
        }
    },
    
    disconnect: () => {
        if (state.conn) {
            state.conn.close();
            ui.appendMessage('Disconnected', 'system');
            state.isConnected = false;
            ui.updateConnectionStatus(false);
            ui.toggleButtons(false);
            state.conn = null;
        }
    },
    
    reconnect: () => {
        const { lastPeerId } = storage.load();
        if (lastPeerId) {
            peerFunctions.connect(lastPeerId);
            ui.appendMessage(`Attempting to reconnect to ${lastPeerId}`, 'system');
        } else {
            ui.appendMessage('No previous connection found', 'system');
        }
    }
};

// Media Functions
const media = {
    requestPermissions: async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            elements.localVideo.srcObject = stream;
            state.localStream = stream;
            return true;
        } catch (error) {
            console.error('Media access denied:', error);
            ui.appendMessage('Camera/microphone access denied', 'system');
            return false;
        }
    },
    
    startCall: async () => {
        if (!state.conn) {
            ui.appendMessage('Not connected to any peer', 'system');
            return;
        }
        
        const permissionsGranted = await media.requestPermissions();
        if (!permissionsGranted) return;
        
        const call = state.peer.call(state.conn.peer, state.localStream);
        call.on('stream', (remoteStream) => {
            elements.remoteVideo.srcObject = remoteStream;
        });
        state.currentCall = call;
        ui.appendMessage(`Calling ${state.conn.peer}`, 'system');
    },
    
    endCall: () => {
        if (state.currentCall) {
            state.currentCall.close();
            elements.remoteVideo.srcObject = null;
            ui.appendMessage('Call ended', 'system');
            state.currentCall = null;
        }
    },
    
    toggleMute: () => {
        if (state.localStream) {
            state.isMuted = !state.isMuted;
            state.localStream.getAudioTracks().forEach(track => {
                track.enabled = !state.isMuted;
            });
            elements.muteButton.innerHTML = state.isMuted ? 
                '<i class="fas fa-microphone-slash"></i> Unmute' : 
                '<i class="fas fa-microphone"></i> Mute';
            ui.appendMessage(state.isMuted ? 'Microphone muted' : 'Microphone unmuted', 'system');
        }
    },
    
    toggleVideo: () => {
        if (state.localStream) {
            state.isVideoPaused = !state.isVideoPaused;
            state.localStream.getVideoTracks().forEach(track => {
                track.enabled = !state.isVideoPaused;
            });
            elements.pauseVideoButton.innerHTML = state.isVideoPaused ? 
                '<i class="fas fa-video"></i> Resume Video' : 
                '<i class="fas fa-video-slash"></i> Pause Video';
            ui.appendMessage(state.isVideoPaused ? 'Video paused' : 'Video resumed', 'system');
        }
    }
};

// Sharing Functions
const sharing = {
    handleFileShare: (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        if (file.size > 10 * 1024 * 1024) {
            ui.appendMessage('File is too large (max 10MB)', 'system');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            if (state.conn && state.conn.open) {
                state.conn.send({
                    type: 'file',
                    filename: file.name,
                    data: e.target.result,
                    username: state.username
                });
                ui.appendMessage(`You shared a file: ${file.name}`, 'local');
                ui.displaySharedFile(file.name, e.target.result, 'local');
            } else {
                ui.appendMessage('Not connected to any peer', 'system');
            }
        };
        reader.readAsDataURL(file);
    },
    
    handlePhotoShare: (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            ui.appendMessage('Image is too large (max 5MB)', 'system');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            if (state.conn && state.conn.open) {
                state.conn.send({
                    type: 'image',
                    filename: file.name,
                    data: e.target.result,
                    username: state.username
                });
                ui.appendMessage(`You shared a photo: ${file.name}`, 'local');
                ui.displaySharedImage(e.target.result, 'local');
            } else {
                ui.appendMessage('Not connected to any peer', 'system');
            }
        };
        reader.readAsDataURL(file);
    },
    
    shareLocation: () => {
        if (!navigator.geolocation) {
            ui.appendMessage('Geolocation is not supported by your browser', 'system');
            return;
        }
        
        ui.appendMessage('Requesting location...', 'system');
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
                
                if (state.conn && state.conn.open) {
                    state.conn.send({
                        type: 'location',
                        location: location,
                        username: state.username
                    });
                    ui.appendMessage('You shared your location', 'local');
                    ui.displaySharedLocation(location, 'local');
                } else {
                    ui.appendMessage('Not connected to any peer', 'system');
                }
            },
            (error) => {
                ui.appendMessage(`Unable to retrieve your location: ${error.message}`, 'system');
            }
        );
    }
};

// Initialize Application
const initApp = () => {
    const savedData = storage.load();
    
    if (savedData.peerId && savedData.username) {
        state.username = savedData.username;
        peerFunctions.initialize(savedData.peerId);
        ui.appendMessage(`Welcome back, ${state.username}!`, 'system');
    } else {
        const newPeerId = `user-${Math.random().toString(36).substr(2, 9)}`;
        const newUsername = prompt('Enter your name:', 'Anonymous');
        
        if (newUsername) {
            state.username = newUsername;
            storage.save(newPeerId, newUsername);
            peerFunctions.initialize(newPeerId);
            ui.appendMessage(`Welcome, ${state.username}! Your ID is ${newPeerId}`, 'system');
        } else {
            state.username = 'Anonymous';
            storage.save(newPeerId, state.username);
            peerFunctions.initialize(newPeerId);
            ui.appendMessage(`Welcome! Your ID is ${newPeerId}`, 'system');
        }
    }
    
    ui.toggleButtons(false);

    // Sidebar toggle event
    elements.menuToggle.addEventListener('click', ui.toggleSidebar);

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && elements.sidebar.classList.contains('active')) {
            if (!elements.sidebar.contains(e.target) && !elements.menuToggle.contains(e.target)) {
                elements.sidebar.classList.remove('active');
            }
        }
    });

    // Modal close event
    elements.modalClose.addEventListener('click', ui.closeModal);
    elements.imageModal.addEventListener('click', (e) => {
        if (e.target === elements.imageModal) {
            ui.closeModal();
        }
    });
};

// Event Listeners
elements.sendButton.addEventListener('click', () => {
    const message = elements.messageInput.value;
    if (!message) return;
    
    if (state.conn && state.conn.open) {
        state.conn.send({ 
            username: state.username, 
            message: message 
        });
        ui.appendMessage(`${state.username}: ${message}`, 'local');
        elements.messageInput.value = '';
    } else {
        ui.appendMessage('Not connected to any peer', 'system');
    }
});

elements.messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        elements.sendButton.click();
    }
});

elements.connectButton.addEventListener('click', () => {
    peerFunctions.connect(elements.peerIdInput.value);
    if (window.innerWidth <= 768) {
        elements.sidebar.classList.remove('active');
    }
});

elements.reconnectButton.addEventListener('click', () => {
    peerFunctions.reconnect();
    if (window.innerWidth <= 768) {
        elements.sidebar.classList.remove('active');
    }
});

elements.disconnectButton.addEventListener('click', () => {
    peerFunctions.disconnect();
    if (window.innerWidth <= 768) {
        elements.sidebar.classList.remove('active');
    }
});

elements.callButton.addEventListener('click', () => {
    media.startCall();
    if (window.innerWidth <= 768) {
        elements.sidebar.classList.remove('active');
    }
});

elements.endCallButton.addEventListener('click', () => {
    media.endCall();
    if (window.innerWidth <= 768) {
        elements.sidebar.classList.remove('active');
    }
});

elements.muteButton.addEventListener('click', () => {
    media.toggleMute();
});

elements.pauseVideoButton.addEventListener('click', () => {
    media.toggleVideo();
});

elements.clearChatButton.addEventListener('click', () => {
    ui.clearChat();
    if (window.innerWidth <= 768) {
        elements.sidebar.classList.remove('active');
    }
});

elements.clearDataButton.addEventListener('click', () => {
    storage.clear();
    ui.appendMessage('Saved data cleared. Refresh to enter new details.', 'system');
    if (window.innerWidth <= 768) {
        elements.sidebar.classList.remove('active');
    }
});

elements.fileShareButton.addEventListener('click', () => {
    elements.fileInput.click();
});

elements.photoShareButton.addEventListener('click', () => {
    elements.photoInput.click();
});

elements.fileInput.addEventListener('change', sharing.handleFileShare);
elements.photoInput.addEventListener('change', sharing.handlePhotoShare);
elements.locationShareButton.addEventListener('click', () => {
    sharing.shareLocation();
    if (window.innerWidth <= 768) {
        elements.sidebar.classList.remove('active');
    }
});

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
