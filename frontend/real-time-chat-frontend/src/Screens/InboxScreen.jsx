import { useState, useEffect } from 'react';
import ChatRoom from './ChatRoom';
import { useAuth } from '../context/AuthContext'; 
import { supabase } from '../supabaseClient';
import { useSocket } from '../context/SocketContext'; // 1. Import socket hook

const InboxScreen = () => {
    const { user } = useAuth(); 
    const { socket } = useSocket(); // 2. Extract socket instance
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedChat, setSelectedChat] = useState(null);
    
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const [inboxChats, setInboxChats] = useState([]);
    const [isLoadingInbox, setIsLoadingInbox] = useState(true);

    const [onlineUsers, setOnlineUsers] = useState([]);

    const fetchInbox = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch('http://localhost:3000/api/conversations', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setInboxChats(data);
            }
        } catch (error) {
            console.error("Failed to load inbox:", error);
        } finally {
            setIsLoadingInbox(false);
        }
    };

    useEffect(() => {
        fetchInbox();
    }, []);

    // NEW: Listen for live online/offline updates
    useEffect(() => {
        if (!socket) return;

        socket.on('getOnlineUsers', (users) => {
            setOnlineUsers(users);
        });

        return () => socket.off('getOnlineUsers');
    }, [socket]);

    // 3. NEW: Real-time sidebar listener
    useEffect(() => {
        if (!socket) return;

        const handleNewMessagePreview = (incomingMessage) => {
            setInboxChats((prevChats) => {
                // Find if the conversation already exists in our sidebar list
                const chatIndex = prevChats.findIndex(c => c.conversation_id === incomingMessage.conversation_id);

                if (chatIndex !== -1) {
                    // Update existing chat with the latest message and pull it to the top
                    const updatedChat = {
                        ...prevChats[chatIndex],
                        latest_message: {
                            content: incomingMessage.content,
                            created_at: incomingMessage.created_at,
                            sender_id: incomingMessage.sender_id
                        }
                    };

                    // Remove old instance and place updated chat at index 0 (top)
                    const filteredChats = prevChats.filter(c => c.conversation_id !== incomingMessage.conversation_id);
                    return [updatedChat, ...filteredChats];
                } else {
                    // If it's a brand new conversation, re-fetch the full inbox to grab contact profiles
                    fetchInbox();
                    return prevChats;
                }
            });
        };

        socket.on('receiveMessage', handleNewMessagePreview);

        return () => {
            socket.off('receiveMessage', handleNewMessagePreview);
        };
    }, [socket]);

    useEffect(() => {
        const searchUsers = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;

                const response = await fetch(`http://localhost:3000/api/profiles/search?query=${searchQuery}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    setSearchResults(data);
                }
            } catch (error) {
                console.error("Search failed:", error);
            } finally {
                setIsSearching(false);
            }
        };

        const delaySearch = setTimeout(() => {
            searchUsers();
        }, 300);

        return () => clearTimeout(delaySearch);
    }, [searchQuery, user]);

    const handleChatSelect = (contactInfo) => {
        setSelectedChat(contactInfo);
        setSearchQuery(''); 
        fetchInbox(); 
    };

    return (
        <div className="h-screen flex p-6 gap-6 bg-[#121212] overflow-hidden font-sans">
            
            {/* The Floating Sidebar */}
            <div className="w-80 flex-col flex bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden shrink-0 relative z-10">
                
                {/* Header & Search Bar */}
                <div className="p-6 pb-4 border-b border-white/5">
                    <h1 className="text-2xl font-bold text-white mb-6 tracking-wide">Messages</h1>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Search usernames or phones..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/10 backdrop-blur-md border border-white/10 rounded-full py-2.5 px-5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#39FF14] transition-colors"
                        />
                    </div>
                </div>

                {/* Chat List Area */}
                <div className="flex-1 overflow-y-auto">
                    {searchQuery.trim() ? (
                        isSearching ? (
                            <div className="p-4 text-center text-gray-400 text-sm">Searching...</div>
                        ) : searchResults.length > 0 ? (
                            searchResults.map((contact) => (
                                <div 
                                    key={contact.id}
                                    onClick={() => handleChatSelect({
                                        id: contact.id,
                                        name: contact.full_name || contact.username,
                                        avatar: contact.avatar_url || 'https://i.pravatar.cc/150'
                                    })}
                                    className="w-full text-left flex items-center gap-4 p-4 hover:bg-white/10 transition-colors duration-200 cursor-pointer select-none border-b border-white/5 border-l-4 border-l-transparent"
                                >
                                    <img src={contact.avatar_url || 'https://i.pravatar.cc/150'} alt={contact.username} className="w-12 h-12 rounded-full object-cover border border-white/10 shrink-0 pointer-events-none" />
                                    <div className="flex-1 min-w-0 pointer-events-none">
                                        <h3 className="text-white font-semibold text-sm truncate">{contact.full_name || contact.username}</h3>
                                        <p className="text-xs text-gray-500">@{contact.username}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-gray-400 text-sm">No users found.</div>
                        )
                    ) : 
                    
                    isLoadingInbox ? (
                        <div className="p-4 text-center text-gray-400 text-sm">Loading chats...</div>
                    ) : inboxChats.length > 0 ? (
                        inboxChats.map((chat) => (
                            <div 
                                key={chat.conversation_id}
                                onClick={() => handleChatSelect({
                                    id: chat.contact.id,
                                    name: chat.contact.full_name || chat.contact.username,
                                    avatar: chat.contact.avatar_url || 'https://i.pravatar.cc/150'
                                })}
                                className={`w-full text-left flex items-center gap-4 p-4 hover:bg-white/10 transition-colors duration-200 cursor-pointer select-none border-b border-white/5 last:border-0 relative z-20 ${
                                    selectedChat?.id === chat.contact.id ? 'bg-white/10 border-l-4 border-l-[#39FF14]' : 'border-l-4 border-l-transparent'
                                }`}
                            >
                                <img src={chat.contact.avatar_url || 'https://i.pravatar.cc/150'} alt={chat.contact.username} className="w-12 h-12 rounded-full object-cover border border-white/10 shrink-0 pointer-events-none" />
                                <div className="flex-1 min-w-0 pointer-events-none">
                                    <h3 className="text-white font-semibold text-sm truncate">{chat.contact.full_name || chat.contact.username}</h3>
                                    <p className="text-sm text-gray-400 truncate">
                                        {chat.latest_message ? chat.latest_message.content : "No messages yet"}
                                    </p>
                                </div>
                                {chat.latest_message && (
                                    <div className="flex flex-col items-end gap-2 shrink-0 pointer-events-none">
                                        <span className="text-xs text-gray-500">
                                            {new Date(chat.latest_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center text-gray-500 text-sm border border-dashed border-white/10 rounded-xl m-4">
                            Your inbox is empty. Search for a username to start a chat!
                        </div>
                    )}
                </div>
            </div>

            {/* The Chat Room Area */}
            <div className="flex-1 min-w-0 flex relative z-10">
                {selectedChat ? (
                    <ChatRoom 
                        contact={selectedChat} 
                        isOnline={onlineUsers.includes(selectedChat.id)} 
                    />
                ) : (
                    <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl flex items-center justify-center relative overflow-hidden w-full">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#39FF14]/10 rounded-full blur-[100px]"></div>
                        <div className="text-center relative z-10">
                            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                                <span className="text-3xl">👋</span>
                            </div>
                            <h2 className="text-xl text-white font-medium">Your Messages</h2>
                            <p className="text-gray-400 mt-2 text-sm">Select a chat to start messaging.</p>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default InboxScreen;