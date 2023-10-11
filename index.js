const express = require('express');
const app = express();
const http = require('http').createServer(app);
io = require('socket.io')(http);
const path = require('path');

// Serve static files for the React app
app.use(express.static('public'));

// Make sure all routes go to index.html
// This is to make sure react router works correctly
app.use(express.static(path.join(__dirname, 'build')));

app.get('/*', function(req,res) {
		res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const users = []; // List of connected users
const messagesLimit = 50; // Limit the amount of messages stored in memory

// Messages for each room
let messages1 = [];
let messages2 = [];
let messages3 = [];

const donateGoal = 200; // Donation goal in euros
let donateProgress = 0; // Current donation progress
let donateGoalReached = false; // Is the donation goal reached

// Handle username submissions
io.use((socket, next) => {
  const username = socket.handshake.auth.username;

  // Check if username is already taken
  if (users.includes(username)) {
    console.log('username taken');
    return next(new Error('username taken'));
  }

  // Check if username is provided
  if (!username) {
    console.log('no username');
    return next(new Error('invalid username'));
  }

  // Set username and add to list of connected users
  socket.username = username;
  users.push(username);
  next();
});

// When a user successfully connects
io.on('connection', (socket) => {
  const username = socket.handshake.auth.username;  // Get username from socket
  let currentRoom = 'room1';  // By default join user to room1
  console.log('a user connected.', 'name: ' + username, 'id: ' + socket.id);

  // When a user disconnects remove them from the list of connected users
  socket.on('disconnect', () => {
    console.log('a user disconnected', socket.id);
    users.splice(users.indexOf(username), 1);
    console.log(users);
  });

  // Join a user to the requested room
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

  // Handle chat messages
  socket.on('chat messages', (msg, emoji) => {

    // If message is not empty
    if (msg !== '') {

      // Get current time
      const timestamp = new Date().toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });

      // Add message to the correct room array and limit the amount of messages stored in memory
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

    // Send messages to the correct room
    if (currentRoom === 'room1') io.to('room1').emit('chat messages', messages1);
    if (currentRoom === 'room2') io.to('room2').emit('chat messages', messages2);
    if (currentRoom === 'room3') io.to('room3').emit('chat messages', messages3);
  });

  // Handle donations
  socket.on('donations', (donateAmount, donateMessage) => {

    // Update donation progress
    donateProgress += parseInt(donateAmount);

    // Send donation data to all users
    io.emit('donations', { username, donateAmount, donateMessage, donateProgress, donateGoal });

    // If donation goal is reached send a message to all users
    if (donateProgress >= donateGoal && !donateGoalReached) {
      io.emit('donationGoalReached', donateGoal);
      donateGoalReached = true;
      console.log('donation goal reached!');
    }

    console.log(username + ' donated ' + donateAmount + ' with message: ' + donateMessage);
    console.log('donateProgress: ' + donateProgress + ' / ' + donateGoal);
  });
});

// Start the server on port 3000
http.listen(3000, () => {
  console.log('listening on *:3000');
});
