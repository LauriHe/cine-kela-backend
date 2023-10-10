const express = require('express');
const app = express();
const http = require('http').createServer(app);
io = require('socket.io')(http);
const path = require('path');

app.use(express.static('public'));

app.use(express.static(path.join(__dirname, 'build')));

app.get('/*', function(req,res) {
		res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const users = [];
const messagesLimit = 50;
let messages1 = [];
let messages2 = [];
let messages3 = [];

const donateGoal = 200;
let donateProgress = 0;
let donateGoalReached = false;

io.use((socket, next) => {
  const username = socket.handshake.auth.username;

  if (users.includes(username)) {
    console.log('username taken');
    return next(new Error('username taken'));
  }
  if (!username) {
    console.log('no username');
    return next(new Error('invalid username'));
  }
  socket.username = username;
  users.push(username);
  next();
});

io.on('connection', (socket) => {
  const username = socket.handshake.auth.username;
  let currentRoom = 'room1';
  console.log('a user connected.', 'name: ' + username, 'id: ' + socket.id);

  socket.on('disconnect', () => {
    console.log('a user disconnected', socket.id);
    users.splice(users.indexOf(username), 1);
    console.log(users);
  });

  socket.on('join', (room) => {
    socket.join(room);
    currentRoom = room;
    if (room === 'room1') {
      io.to(socket.id).emit('chat messages', messages1);
    }
    if (room === 'room2') {
      io.to(socket.id).emit('chat messages', messages2);
    }
    if (room === 'room3') {
      io.to(socket.id).emit('chat messages', messages3);
    }
    console.log('user joined room', room);
  });

  socket.on('chat messages', (msg, emoji) => {
    if (msg !== '') {

      const timestamp = new Date().toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });

      if (currentRoom === 'room1') {
        messages1.unshift({ msg, username, timestamp, emoji });
        messages1.length > messagesLimit && (messages1 = messages1.slice(0, messagesLimit));
      }
      if (currentRoom === 'room2') {
        messages2.unshift({ msg, username, timestamp, emoji });
        messages2.length > messagesLimit && (messages2 = messages2.slice(0, messagesLimit));
      }
      if (currentRoom === 'room3') {
        messages3.unshift({ msg, username, timestamp, emoji });
        messages3.length > messagesLimit && (messages3 = messages3.slice(0, messagesLimit));
      }
    }

    if (currentRoom === 'room1') io.to('room1').emit('chat messages', messages1);
    if (currentRoom === 'room2') io.to('room2').emit('chat messages', messages2);
    if (currentRoom === 'room3') io.to('room3').emit('chat messages', messages3);
  });

  socket.on('donations', (donateAmount, donateMessage) => {
    donateProgress += parseInt(donateAmount);
    io.emit('donations', { username, donateAmount, donateMessage, donateProgress, donateGoal });
    if (donateProgress >= donateGoal && !donateGoalReached) {
      io.emit('donationGoalReached', donateGoal);
      donateGoalReached = true;
      console.log('donation goal reached!');
    }
    console.log(username + ' donated ' + donateAmount + ' with message: ' + donateMessage);
    console.log('donateProgress: ' + donateProgress + ' / ' + donateGoal);
  });
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});
