const express = require('express');
const app = express();
const socketIo = require('socket.io')
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const PORT = process.env.PORT;

app.use(cors());


const server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
})

const io = socketIo(server);
io.on("connection", socket => {
    
})