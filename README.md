# ShareIt - P2P File Sharing with WebRTC

A secure, peer-to-peer file sharing application built with WebRTC, Socket.IO, and Node.js. Transfer files directly between browsers with end-to-end encryption.

## Features

**Direct P2P Transfer** - Files transfer directly between peers without db storage  
**End-to-End Encryption** - WebRTC provides built-in encryption  
**Real-time Progress** - Live transfer progress with speed and time estimates  
**Chunked Transfer** - Handles large files efficiently with 16KB chunks  
**Connection Status** - Real-time connection and transfer status  
**Multiple Users** - Support for multiple concurrent users  
**Auto-Download** - Received files automatically download  
**Drag & Drop** - Easy file selection with drag and drop  

## Architecture

### Components

1. **Signaling Server** (`server.js`)
   - Express.js HTTP server
   - Socket.IO for WebRTC signaling
   - User registration and discovery
   - Relay ICE candidates and SDP offers/answers

2. **WebRTC Manager** (`public/webrtc.js`)
   - RTCPeerConnection management
   - DataChannel for file transfer
   - File chunking and reassembly
   - Progress tracking

3. **Frontend** (`public/app.js`)
   - User interface logic
   - Socket.IO client
   - File handling and download
   - Progress updates

## File Structure

```
shareit-app/
├── server.js                 # Signaling server
├── package.json             # Dependencies
├── .env                     # Environment variables
├── .gitignore              # Git ignore rules
├── README.md               # This file
└── public/
    ├── index.html          # Main HTML
    ├── style.css           # Styles
    ├── app.js              # Frontend logic
    └── webrtc.js           # WebRTC implementation
```

## Installation

### Prerequisites
- Node.js 16+ and npm/pnpm/yarn

### Steps

1. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   # or
   yarn install
   ```

2. **Configure environment (optional):**
   ```bash
   # Edit .env file
   PORT=3000
   ```

3. **Start the server:**
   ```bash
   # Development (with auto-reload)
   npm run dev

   # Production
   npm start
   ```

4. **Open in browser:**
   ```
   http://localhost:3000
   ```

## Usage

### Sending a File

1. Enter your username
2. Select or drag a file to the "Send File" panel
3. Enter the recipient username to select user
4. Click "Send File"
5. Wait for connection and transfer to complete

### Receiving a File

1. Enter your username
2. Wait for incoming file request
3. Click "Accept" to receive the file
4. File will auto-download when complete

## How It Works

### 1. Connection Establishment

```
Sender                  Signaling Server              Receiver
  |                            |                          |
  |------- register --------->|                          |
  |                            |<------ register ---------|
  |                            |                          |
  |------- offer ------------>|                          |
  |                            |------- offer ---------->|
  |                            |<------ answer ----------|
  |<------ answer ------------|                          |
  |                            |                          |
  |<----- ICE candidates ---->|<---- ICE candidates --->|
  |                            |                          |
  |<========== Direct P2P Connection Established ========>|
```

### 2. File Transfer

```
1. Sender opens DataChannel
2. Sender sends file metadata (name, size, type)
3. Sender chunks file into 16KB pieces
4. Sender sends chunks over DataChannel
5. Receiver assembles chunks
6. Receiver creates Blob and triggers download
```

### 3. WebRTC Configuration

- **STUN Servers**: Google's public STUN servers for NAT traversal
- **DataChannel**: Reliable, ordered transfer mode
- **Chunk Size**: 16KB for optimal performance
- **Binary Type**: ArrayBuffer for efficient data handling

## Security

- **End-to-End Encryption**: WebRTC uses DTLS-SRTP
- **No Server Storage**: Files never touch the server
- **Peer Verification**: Users select recipients explicitly
- **Secure Signaling**: Can be upgraded to HTTPS/WSS

## Deployment

### Option 1: Traditional Hosting

1. **Deploy to VPS:**
   ```bash
   # On server
   git clone <repo>
   cd shareit-app
   npm install
   npm start
   ```

2. **Use PM2 for process management:**
   ```bash
   npm install -g pm2
   pm2 start server.js --name shareit
   pm2 save
   pm2 startup
   ```

3. **Configure reverse proxy (nginx):**
   ```nginx
   server {
       listen 80;
       server_name yourdom ain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Option 2: Platform as a Service

**Heroku:**
```bash
heroku create
git push heroku main
```

**Railway/Render:**
- Connect GitHub repo
- Auto-deploys on push

### Option 3: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## HTTPS/WSS (Required for Production)

WebRTC requires HTTPS in production. Options:

1. **Let's Encrypt with Certbot:**
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

2. **Cloudflare** - Free SSL/TLS

3. **Platform SSL** - Heroku, Railway, Render provide automatic HTTPS

## TURN Server (For Restricted Networks)

If users are behind strict NAT/firewalls, add TURN server:

```javascript
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'user',
      credential: 'pass'
    }
  ]
};
```

**Free TURN options:**
- [Open Relay Project](https://www.metered.ca/tools/openrelay/)
- [Twilio TURN](https://www.twilio.com/stun-turn)

## Troubleshooting

### Connection Issues

- **Firewall/NAT**: Add TURN server
- **Different networks**: Ensure STUN is working
- **Browser compatibility**: Use Chrome, Firefox, or Edge

### Transfer Failures

- **Large files**: Increase chunk size or add retry logic
- **Timeout**: Implement keepalive mechanism
- **Memory**: Browsers limit total memory usage

### Performance

- **Slow transfer**: Check network bandwidth
- **High CPU**: Reduce chunk size
- **Memory leaks**: Close connections after transfer

## Browser Support

- Chrome 80+
- Firefox 75+
- Edge 80+
- Safari 14+ (with limitations)
- IE (not supported)

## Future Enhancements

- [ ] Multiple file transfer
- [ ] Folder transfer
- [ ] Transfer resume on disconnect
- [ ] File encryption layer on top of WebRTC
- [ ] QR code for easy pairing
- [ ] Mobile app (React Native)
- [ ] Video/audio streaming
- [ ] Screen sharing
- [ ] Text chat

## License

MIT License - feel free to use in your projects!

## Contributing

Pull requests welcome! Please follow standard coding conventions.

## Support

For issues or questions, please open a GitHub issue.
