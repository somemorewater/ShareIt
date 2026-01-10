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
    console.log("A user connected", socket.id);
    

    //Join a room
    socket.on("join", roomId => {
        socket.join(roomId);
        console.log(`${socket.id} joined room ${roomId}`);
    });

    //Forward offer to other peer(S)
    socket.on("offer", ({ roomId, offer }) => {
        socket.to(roomId).emit("offer", { offer, from: socket.id });
    });

    //Forward answer to other peer(s)
    socket.on("answer", ({ roomId, answer }) => {
        socket.to(roomId).emit("answer", { answer, from: socket.id });
    });

    //Forward ICE candidates
    socket.on("ice", ({ roomId, candidate }) => {
        socket.to(roomId).emit("ice", { candidate, from: socket.id });
    });

    //Disconnect
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
})