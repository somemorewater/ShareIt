// WebRTC configuration
const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};


class WebRTCManager {
  constructor(socket) {
    this.socket = socket;
    this.peerConnection = null;
    this.dataChannel = null;
    this.onFileReceived = null;
    this.onProgress = null;
    this.onConnectionStateChange = null;
    
    // File transfer state
    this.fileBuffer = [];
    this.receivedSize = 0;
    this.fileMetadata = null;
    this.chunkSize = 16384; 
  }

  // Create peer connection for sender
  async createOffer(peerId, file) {
    try {
      this.peerConnection = new RTCPeerConnection(config);
      
      // Create data channel for file transfer
      this.dataChannel = this.peerConnection.createDataChannel('fileTransfer', {
        ordered: true
      });
      
      this.setupDataChannel();
      this.setupIceHandlers(peerId);

      // Create and send offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      this.socket.emit('offer', {
        to: peerId,
        offer: offer,
        filename: file.name,
        filesize: file.size
      });

      return true;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  // Handle incoming offer (receiver)
  async handleOffer(fromPeerId, offer, fileMetadata) {
    try {
      this.fileMetadata = fileMetadata;
      this.peerConnection = new RTCPeerConnection(config);
      
      // Set up data channel handler
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel();
      };

      this.setupIceHandlers(fromPeerId);

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.socket.emit('answer', {
        to: fromPeerId,
        answer: answer
      });

      return true;
    } catch (error) {
      console.error('Error handling offer:', error);
      throw error;
    }
  }

  // Handle incoming answer (sender)
  async handleAnswer(answer) {
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      return true;
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(candidate) {
    try {
      if (candidate) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  // Setup ICE handlers
  setupIceHandlers(peerId) {
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          to: peerId,
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection.connectionState);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(this.peerConnection.connectionState);
      }
    };
  }

  // Setup data channel
  setupDataChannel() {
    this.dataChannel.binaryType = 'arraybuffer';

    this.dataChannel.onopen = () => {
      console.log("Data channel opened");
      if (this.onDataChannelOpen) {
        this.onDataChannelOpen();
      }
    };

    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
    };

    this.dataChannel.onmessage = (event) => {
      this.handleDataChannelMessage(event.data);
    };

    this.dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
    };
  }

  // Handle incoming data channel messages
  handleDataChannelMessage(data) {
    if (typeof data === 'string') {
      // Metadata message
      this.fileMetadata = JSON.parse(data);
      this.fileBuffer = [];
      this.receivedSize = 0;
    } else {
      // File chunk
      this.fileBuffer.push(data);
      this.receivedSize += data.byteLength;
      
      // Update progress
      if (this.onProgress && this.fileMetadata) {
        const progress = (this.receivedSize / this.fileMetadata.size) * 100;
        this.onProgress({
          loaded: this.receivedSize,
          total: this.fileMetadata.size,
          percent: progress
        });
      }

      // Check if file is complete
      if (this.fileMetadata && this.receivedSize >= this.fileMetadata.size) {
        this.assembleFile();
      }
    }
  }

  // Send file through data channel
  async sendFile(file, progressCallback) {
    return new Promise((resolve, reject) => {
      if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
        reject(new Error('Data channel not ready'));
        return;
      }

      // Send metadata first
      const metadata = {
        name: file.name,
        size: file.size,
        type: file.type
      };
      this.dataChannel.send(JSON.stringify(metadata));

      // Send file in chunks
      const reader = new FileReader();
      let offset = 0;

      reader.onload = (event) => {
        if (event.target.readyState === FileReader.DONE) {
          this.dataChannel.send(event.target.result);
          offset += event.target.result.byteLength;
          
          // Update progress
          if (progressCallback) {
            progressCallback({
              loaded: offset,
              total: file.size,
              percent: (offset / file.size) * 100
            });
          }

          // Continue sending or resolve
          if (offset < file.size) {
            readSlice(offset);
          } else {
            console.log('File sent successfully');
            resolve();
          }
        }
      };

      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        reject(error);
      };

      const readSlice = (o) => {
        const slice = file.slice(o, o + this.chunkSize);
        reader.readAsArrayBuffer(slice);
      };

      readSlice(0);
    });
  }

  // Assemble received file
  assembleFile() {
    const blob = new Blob(this.fileBuffer, { type: this.fileMetadata.type });
    
    if (this.onFileReceived) {
      this.onFileReceived({
        file: blob,
        name: this.fileMetadata.name,
        size: this.fileMetadata.size,
        type: this.fileMetadata.type
      });
    }

    // Reset state
    this.fileBuffer = [];
    this.receivedSize = 0;
  }

  // Close connection
  close() {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}

// Export for use in browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebRTCManager;
}
