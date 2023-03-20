require('dotenv').config();
const path = require('path');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const socketio = require("socket.io");
const formatMessage = require('./utils/messages');
const { userJoin, getCurrentUser, userLeave, getRoomUsers  } = require('./utils/users');
const createAdapter = require("@socket.io/redis-adapter").createAdapter;
const redis = require("redis");
const { createClient } = redis;

const io = socketio(server);
const botName ="hubSandy";


(async () => {
  pubClient = createClient({ url: "redis://127.0.0.1:6379" });
  await pubClient.connect();
  subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
})();


// set static folder
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
   
    socket.on("joinRoom", ({username, room}) => {

        const user = userJoin(socket.id, username, room);

        socket.join(user.room);

        // Welcome current user 
        socket.emit('message', 
        formatMessage(botName, "Welcome to hubSandy, we are here to assist with your enquiries"));

        // Broadcast when a new user connects to a room, excluding the new user
        socket.broadcast
        .to(user.room)
        .emit('message', formatMessage(botName, `${username} has joined the chat`));

        // Send user's and room info
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });

    });


    // Listen to chatMessage and send it back to everyone including the sender
    socket.on('chatMessage', (data) => {
        const user = getCurrentUser(socket.id);
        io.to(user.room).emit('message', formatMessage(user.username, data));
    });


    // Runs when client disconnect
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);
        if(user){
            io.to(user.room).emit('message', formatMessage(botName, `${user.username} has left the chat`));
        }

        // Send user's and room info
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });
    })

})

const port = process.env.PORT || 4000;
server.listen(port, () => console.log(`App listening on http://localhost:${port}`))