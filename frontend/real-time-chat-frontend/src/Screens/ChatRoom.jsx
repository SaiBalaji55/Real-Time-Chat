import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext'; 
import { supabase } from '../supabaseClient';

const ChatRoom = ({ contact, isOnline }) => { 
    const { user } = useAuth(); 
    const { socket } = useSocket(); 
    const [newMessage, setNewMessage] = useState('');
    
    const [messages, setMessages] = useState([]); 
    const [conversationId, setConversationId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const messagesEndRef = useRef(null);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // 1. Initialize the Chat Room Data
    useEffect(() => {
        const initChat = async () => {
            setIsLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;

                const convRes = await fetch('http://localhost:3000/api/conversations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ user_two_id: contact.id })
                });
                
                const convData = await convRes.json();
                if (!convRes.ok) throw new Error(convData.error);
                
                const convId = convData.conversation.id;
                setConversationId(convId);

                if (socket) {
                    socket.emit('joinRoom', convId);
                }

                const msgRes = await fetch(`http://localhost:3000/api/messages/${convId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (msgRes.ok) {
                    const msgData = await msgRes.json();
                    setMessages(msgData);
                }
            } catch (error) {
                console.error("Failed to initialize chat:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (contact?.id) {
            initChat();
        }
    }, [contact.id, socket]);

    // 2. Listen for Live Incoming Messages
    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (incomingMessage) => {
            setMessages((prevMessages) => {
                if (prevMessages.find(msg => msg.id === incomingMessage.id)) return prevMessages;
                return [...prevMessages, incomingMessage];
            });
        };

        socket.on('receiveMessage', handleReceiveMessage);

        return () => {
            socket.off('receiveMessage', handleReceiveMessage);
        };
    }, [socket]);

    // 3. NEW: Automatically Mark Incoming Messages as Read
    useEffect(() => {
        const markAsRead = async () => {
            if (!conversationId || messages.length === 0) return;
            
            // Check if there are unread messages from the OTHER user
            const hasUnread = messages.some(msg => !msg.is_read && msg.sender_id !== user.id);
            if (!hasUnread) return;

            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                
                // Tell the PostgreSQL database they are read
                await fetch(`http://localhost:3000/api/messages/${conversationId}/read`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                // Tell the socket server to notify the sender instantly
                if (socket) {
                    socket.emit('markMessagesRead', { conversation_id: conversationId });
                }
                
                // Update local state so they don't trigger again
                setMessages(prev => prev.map(msg => 
                    msg.sender_id !== user.id ? { ...msg, is_read: true } : msg
                ));
            } catch (error) {
                console.error("Failed to mark read:", error);
            }
        };

        markAsRead();
    }, [messages, conversationId, socket, user.id]);

    // 4. NEW: Listen for the other user reading YOUR messages
    useEffect(() => {
        if (!socket) return;

        const handleMessagesRead = ({ conversation_id }) => {
            if (conversation_id === conversationId) {
                // Update all my sent messages to show the glowing neon ticks!
                setMessages(prev => prev.map(msg => ({ ...msg, is_read: true })));
            }
        };

        socket.on('messagesWereRead', handleMessagesRead);
        
        return () => socket.off('messagesWereRead', handleMessagesRead);
    }, [socket, conversationId]);


    // 5. Auto-scroll when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 6. Send outgoing messages
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket || !conversationId) return;

        socket.emit('sendMessage', {
            conversation_id: conversationId,
            content: newMessage
        });

        setNewMessage(''); 
    };

    return (
        <div className="flex flex-col h-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative">
            
            {/* The Header */}
            <div className="w-full bg-white/5 backdrop-blur-2xl border-b border-white/10 p-4 flex items-center justify-between z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <img 
                        src={contact?.avatar || "https://i.pravatar.cc/150"} 
                        alt="Contact Avatar" 
                        className="w-10 h-10 rounded-full object-cover border border-white/20"
                    />
                    <div>
                        <h2 className="text-white font-semibold text-lg leading-tight">
                            {contact?.name || "Unknown User"}
                        </h2>
                        <div className="flex items-center gap-2">
                            {isOnline ? (
                                <>
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39FF14] opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#39FF14] shadow-[0_0_8px_#39FF14]"></span>
                                    </span>
                                    <span className="text-xs text-[#39FF14] tracking-wide">Online</span>
                                </>
                            ) : (
                                <>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gray-500"></span>
                                    <span className="text-xs text-gray-500 tracking-wide">Offline</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-4 text-gray-400">
                    <button className="hover:text-white transition-colors"><span className="text-xl">📞</span></button>
                    <button className="hover:text-white transition-colors"><span className="text-xl">⋮</span></button>
                </div>
            </div>

            {/* The Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 scroll-smooth relative">
                {isLoading ? (
                    <div className="text-center text-gray-500 my-auto">Loading messages...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 my-auto">Say hi to {contact?.name}!</div>
                ) : (
                    messages.map((msg) => (
                        <div 
                            key={msg.id} 
                            className={`flex flex-col max-w-[70%] ${msg.sender_id === user.id ? 'self-end items-end' : 'self-start items-start'}`}
                        >
                            <div 
                                className={`px-5 py-3 shadow-lg backdrop-blur-md text-white text-sm md:text-base ${
                                    msg.sender_id === user.id 
                                    ? 'bg-gradient-to-br from-green-600 to-[#00b300] rounded-2xl rounded-tr-sm shadow-[0_4px_15px_rgba(57,255,20,0.15)] border border-green-400/30' 
                                    : 'bg-gray-800/80 rounded-2xl rounded-tl-sm border border-white/5'
                                }`}
                            >
                                {msg.content}
                            </div>
                            
                            <div className="flex items-center gap-1 mt-1 px-1">
                                <span className="text-xs text-gray-500">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                
                                {msg.sender_id === user.id && (
                                    <svg 
                                        xmlns="http://www.w3.org/2000/svg" 
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="2.5" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        className={`w-4 h-4 ml-1 transition-colors duration-300 ${
                                            msg.is_read 
                                            ? 'text-[#00FFFF] drop-shadow-[0_0_6px_rgba(0,255,255,0.8)]' 
                                            : 'text-gray-500'
                                        }`}
                                    >
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                        <path d="M24 10.5L13.5 21l-3-3"></path>
                                    </svg>
                                )}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* The Input Area */}
            <div className="p-6 pt-2 w-full mt-auto">
                <form 
                    onSubmit={handleSendMessage} 
                    className="flex items-center gap-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-4 py-2 shadow-2xl transition-all focus-within:border-[#39FF14]/50 focus-within:bg-white/15 focus-within:shadow-[0_10px_30px_rgba(57,255,20,0.1)]"
                >
                    <button type="button" className="text-gray-400 hover:text-white transition-colors p-2">
                        <span className="text-xl">📎</span>
                    </button>
                    <input 
                        type="text" 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Message..."
                        disabled={isLoading}
                        className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-sm md:text-base px-2 disabled:opacity-50"
                    />
                    <button 
                        type="submit" 
                        disabled={!newMessage.trim() || isLoading}
                        className="bg-[#39FF14] text-black rounded-full p-2.5 flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(57,255,20,0.4)]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </form>
            </div>
            
        </div>
    );
};

export default ChatRoom;