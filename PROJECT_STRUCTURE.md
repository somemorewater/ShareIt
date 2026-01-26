# ShareIt - Complete P2P File Sharing Application

## Project Structure

```
shareit-app/
│
├── ├── server.js              # WebRTC Signaling Server
│   ├── Express HTTP server
│   ├── Socket.IO for signaling
│   ├── User registration & discovery
│   └── WebRTC offer/answer/ICE relay
│
├── ├── package.json           # Dependencies & Scripts
│   ├── express: Web server
│   ├── socket.io: Real-time communication
│   ├── cors: Cross-origin support
│   └── dotenv: Environment variables
│
├── ├── .env                   # Environment Configuration
│   └── PORT=3000
│
├── ├── README.md              # Complete Documentation
│   ├── Installation guide
│   ├── Usage instructions
│   ├── Architecture explanation
│   ├── Deployment guide
│   └── Troubleshooting
│
├── ├── .gitignore             # Git Ignore Rules
│
└── ├── public/                # Frontend Files
    │
    ├── ├── index.html         # Main HTML
    │   ├── User interface
    │   ├── Send/Receive panels
    │   ├── Progress indicators
    │   └── Status messages
    │
    ├── ├── style.css          # Complete Styling
    │   ├── Modern glassmorphism design
    │   ├── Responsive layout
    │   ├── Animations
    │   └── Status indicators
    │
    ├── ├── app.js             # Main Application Logic
    │   ├── Socket.IO client connection
    │   ├── UI event handlers
    │   ├── File selection & validation
    │   ├── Progress tracking
    │   └── Download handling
    │
    └── ├── webrtc.js          # WebRTC Implementation
        ├── RTCPeerConnection management
        ├── DataChannel setup
        ├── Offer/Answer handling
        ├── ICE candidate exchange
        ├── File chunking (16KB)
        └── File reassembly

```

## Quick Start

### 1. Install Dependencies
```bash
npm install
# or
pnpm install
# or
yarn install
```

### 2. Start Server
```bash
# Development
npm run dev

# Production
npm start
```

### 3. Open Browser
```
http://localhost:3000
```

## Key Components

### Server Side (server.js)
- **Signaling Server**: Relays WebRTC signaling messages
- **User Management**: Tracks connected users
- **Event Handling**: 
  - `register` - User connects
  - `offer` - WebRTC offer
  - `answer` - WebRTC answer
  - `ice-candidate` - NAT traversal
  - `disconnect` - User leaves

### Client Side

#### webrtc.js - WebRTC Core
- **WebRTCManager Class**:
  - `createOffer()` - Initiate connection (sender)
  - `handleOffer()` - Accept connection (receiver)
  - `handleAnswer()` - Complete handshake (sender)
  - `handleIceCandidate()` - NAT traversal
  - `sendFile()` - Chunk and send file
  - `handleDataChannelMessage()` - Receive chunks
  - `assembleFile()` - Reconstruct file

#### app.js - Application Logic
- **UI Management**:
  - File selection (drag & drop + click)
  - Recipient selection
  - Progress updates
  - Status messages
- **Socket.IO Events**:
  - Connection management
  - User list updates
  - Signaling relay
- **File Handling**:
  - Validation
  - Progress tracking
  - Auto-download

## Data Flow

### Connection Establishment
```
User A                Signaling Server           User B
  |                          |                      |
  |--register("alice")------>|                      |
  |<--registered(peerId)-----|                      |
  |                          |<--register("bob")---|
  |                          |                      |
  |--offer(to:bob)---------->|                      |
  |                          |--offer(from:alice)-->|
  |                          |<--answer(to:alice)---|
  |<--answer(from:bob)-------|                      |
  |                          |                      |
  |<-ICE candidates--------->|<--ICE candidates--->|
  |                          |                      |
  |<======= Direct P2P DataChannel Established ======>|
```

### File Transfer
```
Sender                  DataChannel                 Receiver
  |                          |                          |
  |--Send Metadata---------->|                          |
  |  {name,size,type}        |--------Metadata--------->|
  |                          |                          |
  |--Send Chunk 1----------->|                          |
  |  (16KB ArrayBuffer)      |--------Chunk 1---------->|
  |                          |                          |
  |--Send Chunk 2----------->|                          |
  |  (16KB ArrayBuffer)      |--------Chunk 2---------->|
  |                          |                          |
  |         ...              |          ...             |
  |                          |                          |
  |--Send Final Chunk------->|                          |
  |  (<16KB ArrayBuffer)     |------Final Chunk-------->|
  |                          |                          |
  |                          |                    [Assemble]
  |                          |                    [Create Blob]
  |                          |                    [Download]
```

## Security Features

1. **End-to-End Encryption**: WebRTC's DTLS-SRTP
2. **No Server Storage**: Files never stored on server
3. **Direct Transfer**: P2P connection between browsers
4. **HTTPS Ready**: Can be easily upgraded to HTTPS
5. **Peer Verification**: Explicit recipient selection

## Technical Specifications

- **Chunk Size**: 16 KB (configurable)
- **Max File Size**: Limited by browser memory (typically 2GB)
- **Transfer Protocol**: DataChannel (SCTP over DTLS)
- **Binary Type**: ArrayBuffer
- **Channel Reliability**: Reliable, ordered
- **Connection Timeout**: Browser default (~30s)
- **Progress Updates**: Real-time (per chunk)

## Configuration

### Change Port
Edit `.env`:
```
PORT=8080
```

### Add TURN Server
Edit `public/webrtc.js`:
```javascript
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:turn.example.com:3478',
      username: 'user',
      credential: 'pass'
    }
  ]
};
```

### Adjust Chunk Size
Edit `public/webrtc.js`:
```javascript
this.chunkSize = 32768; // 32 KB
```

## Deployment Options

### Option 1: VPS (DigitalOcean, AWS, etc.)
```bash
# Clone repo
git clone <repo>
cd shareit-app

# Install dependencies
npm install

# Use PM2 for process management
npm install -g pm2
pm2 start server.js
pm2 save
pm2 startup
```

### Option 2: Heroku
```bash
# Install Heroku CLI
# Login and create app
heroku create your-app-name

# Deploy
git push heroku main
```

### Option 3: Railway/Render
1. Connect GitHub repository
2. Auto-deploys on push
3. Automatic HTTPS

### Option 4: Docker
```bash
docker build -t shareit .
docker run -p 3000:3000 shareit
```

## Troubleshooting

### Issue: Can't connect to peers
**Solution**: Add TURN server for NAT traversal

### Issue: Large files fail
**Solution**: Increase chunk size or implement retry logic

### Issue: Slow transfers
**Solution**: Check network bandwidth, try different STUN servers

### Issue: Browser crashes
**Solution**: Reduce chunk size, limit max file size

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome  | 80+     | Full Support |
| Firefox | 75+     | Full Support |
| Edge    | 80+     | Full Support |
| Safari  | 14+     | Limited Support |
| IE      | Any     | Not Supported |

## Future Enhancements

- [ ] Multiple file transfers
- [ ] Folder transfer
- [ ] Resume on disconnect
- [ ] Additional encryption layer
- [ ] QR code pairing
- [ ] Mobile app
- [ ] Video/audio calls
- [ ] Screen sharing

## License

MIT License - Free to use and modify

## Contributing

Pull requests welcome! Follow standard coding practices.

---

**Built with ❤️ using WebRTC, Socket.IO, and Node.js**
