import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { supabase } from './src/supabaseClient.js';
import conversationRoutes from './src/routes/conversationRoutes.js';
import profileRoutes from './src/routes/profileRoutes.js';
// import authRoutes from './src/routes/authRoutes.js';

dotenv.config();
const app = express();

const server = http.createServer(app);
// Initialize Socket.IO server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Test the Supabase connection
async function testConnection() {
  const { data, error } = await supabase.from('users').select('*').limit(1);

  if (error) {
    console.error('Connection failed:', error.message);
  } else {
    console.log('Connection successful! Database returned:', data);
  }
}

testConnection();

app.use(cors());
app.use(express.json());

app.use('/api', conversationRoutes);
app.use('/api/profiles', profileRoutes);


// app.use('/api/auth', authRoutes);

// Socket.IO authentication middleware
// Socket.IO authentication middleware
io.use(async (socket, next) => {
    // 1. Look for the token in the auth object (Used by React/Frontend)
    let token = socket.handshake.auth?.token;

    // 2. If not found, look for it in the Headers (Used by Postman)
    if (!token && socket.handshake.headers?.authorization) {
        const authHeader = socket.handshake.headers.authorization;
        // Strip out the "Bearer " part to just get the raw token
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else {
            token = authHeader;
        }
    }

    // 3. If STILL no token, reject the connection
    if (!token) {
      return next(new Error('Authentication error: Token is missing'));
    }

    // 4. Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
    
    // 5. Success! Attach user and proceed
    socket.user = user;
    next();
});

// NEW: Global Map to track who is currently connected (socket.id -> user.id)
const onlineUsers = new Map();

io.on('connection', (socket) => {
    console.log(`🟢 Secure connection established: ${socket.user.email} (Socket ID: ${socket.id})`);
    
    // 1. When a user connects, add them to the ledger
    onlineUsers.set(socket.id, socket.user.id);
    
    // 2. Broadcast the unique array of online user IDs to everyone
    io.emit('getOnlineUsers', [...new Set(onlineUsers.values())]);

    // Handle joining a room 1-on-1 chat
    socket.on('joinRoom', (conversationId) => {
        if (!conversationId) {
            return socket.emit('error','joinRoom event received without a conversationId');
        }
        socket.join(conversationId);
        console.log(`👤 User ${socket.user.email} joined room: ${conversationId}`);

        socket.emit('joinedRoomConfirmation', {
            message: `Successfully joined room ${conversationId}`
        });
    });

    socket.on('sendMessage', async (messagePayload) => {
        const { conversation_id, content } = messagePayload;

        if (!conversation_id || !content) {
            return socket.emit('error', 'sendMessage event received with incomplete payload');
        }
        console.log(`📩 Message from ${socket.user.email} to room [${conversation_id}]:`, content);

        const { data: savedMessage, error } = await supabase.from('messages').insert([
          {
              sender_id: socket.user.id,
              conversation_id: conversation_id,
              content: content
          }
        ])
        .select()
        .single();

        if (error) {
            console.error('❌ Supabase Save Error:', error.message);
            return socket.emit('error', 'Failed to save message to database.');
        }

        io.to(conversation_id).emit('receiveMessage', {
            id: savedMessage.id,
            conversation_id: savedMessage.conversation_id,
            sender_id: savedMessage.sender_id,
            sender_email: socket.user.email,
            content: savedMessage.content,
            created_at: savedMessage.created_at
        });
    });

    // 3. NEW: When a user closes the tab or loses internet, remove them
    socket.on('disconnect', () => {
        console.log(`🔴 Connection closed: ${socket.user.email}`);
        onlineUsers.delete(socket.id);
        io.emit('getOnlineUsers', [...new Set(onlineUsers.values())]);
    });

    // NEW: Listen for read receipts and broadcast them to the other user
    socket.on('markMessagesRead', ({ conversation_id }) => {
        // Broadcast specifically to the OTHER user in the same room
        socket.to(conversation_id).emit('messagesWereRead', { conversation_id });
    });
});

app.get('/', (req,res)=>{
    res.send("Hello World")
})

server.listen(3000, ()=> {
    console.log("Server is Run an PORT 3000")
})