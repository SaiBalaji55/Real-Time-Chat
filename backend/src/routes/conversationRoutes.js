import express from 'express';
import { supabase } from '../supabaseClient.js'; //
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router(); //[cite: 5]

// ADDED: requireAuth middleware
router.post('/conversations', requireAuth, async (req, res) => {
    // CHANGED: user_one_id is securely extracted from the verified token, not the body
    const user_one_id = req.user.id; 
    const { user_two_id } = req.body; 

    // CHANGED: Only need to check for user_two_id now
    if (!user_two_id) {
        return res.status(400).json({ error: 'user_two_id is required' });
    }
    
    try {
        const { data: existingChat, error: searchError } = await supabase
            .from('conversations')
            .select('*')
            .or(`and(user_one_id.eq.${user_one_id},user_two_id.eq.${user_two_id}),and(user_one_id.eq.${user_two_id},user_two_id.eq.${user_one_id})`)
            .maybeSingle(); //[cite: 5]
            
        if (existingChat) {
            return res.status(200).json({ conversation: existingChat }); //[cite: 5]
        }
        
        const { data: newChat, error: insertError } = await supabase
            .from('conversations')
            .insert([{ user_one_id, user_two_id }])
            .select()
            .maybeSingle(); //[cite: 5]
            
        if (insertError) {
            return res.status(500).json({ error: insertError.message }); //[cite: 5]
        }
        
        res.status(201).json({ conversation: newChat }); //[cite: 5]
    } catch(error) {
        console.error('Conversation Error:', error.message); //[cite: 5]
        res.status(500).json({ error: 'Failed to start conversation' }); //[cite: 5]
    }
});

// ADDED: requireAuth middleware
router.get('/messages/:conversationId', requireAuth, async (req, res) => {
    const { conversationId } = req.params; //[cite: 5]
    const userId = req.user.id; // ADDED: Extract the requesting user's ID

    if (!conversationId) {
        return res.status(400).json({ error: 'Conversation ID is required' }); //[cite: 5]
    }

    try {
        // ADDED: Security check to ensure the user is a participant in this conversation
        const { data: conversation, error: convError } = await supabase
            .from('conversations')
            .select('user_one_id, user_two_id')
            .eq('id', conversationId)
            .single();

        if (convError || !conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        if (conversation.user_one_id !== userId && conversation.user_two_id !== userId) {
            return res.status(403).json({ error: 'Forbidden: You do not have access to this chat' });
        }

        // Existing message fetch logic executes only if the security check passes
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true }); //[cite: 5]

        if (error) throw error; //[cite: 5]

        res.status(200).json(messages); //[cite: 5]
    } catch (error) {
        console.error('Fetch Messages Error:', error.message); //[cite: 5]
        res.status(500).json({ error: 'Failed to fetch message history' }); //[cite: 5]
    }
});

router.get('/conversations', requireAuth, async (req, res) => {
    const userId = req.user.id;

    try{
        const {data: conversations, error} = await supabase
            .from('conversations')
            .select('*')
            .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`); //[cite: 5]

        if(error){
            return res.status(500).json({error: error.message});
        }

        if(!conversations || conversations.length === 0){
            return res.status(200).json([]);
        }
        const inbox = await Promise.all(conversations.map(async (conv) => {
            const isUserOne = conv.user_one_id === userId;
            const otherUserId = isUserOne ? conv.user_two_id : conv.user_one_id;

            const{data:profile} = await supabase
                .from('profiles')
                .select('id, full_name, username, phone_number, avatar_url')
                .eq('id', otherUserId)
                .single();

            const { data: messages } = await supabase
                .from('messages')
                .select('content, created_at, sender_id, is_read') // Assuming you add is_read later
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: false })
                .limit(1);
            
            const latestMessage = messages && messages.length > 0 ? messages[0] : null;
            return {
                conversation_id: conv.id,
                contact: profile || { id: otherUserId, username: 'Unknown User' },
                latest_message: latestMessage
            };
        }))
        inbox.sort((a, b) => {
            const dateA = a.latest_message ? new Date(a.latest_message.created_at).getTime() : 0;
            const dateB = b.latest_message ? new Date(b.latest_message.created_at).getTime() : 0;
            return dateB - dateA;
        })
        res.status(200).json(inbox);
    }catch(error){
        console.error('Inbox Fetch Error:', error.message);
        res.status(500).json({ error: 'Failed to load inbox' });
    }
})

router.put('/messages/:conversationId/read', requireAuth, async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.id;

    if (!conversationId) {
        return res.status(400).json({ error: 'Conversation ID is required' });
    }

    try{
        const { data: conversation, error: convError } = await supabase
            .from('conversations')
            .select('user_one_id, user_two_id')
            .eq('id', conversationId)
            .single();

        if (convError || !conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        if (conversation.user_one_id !== userId && conversation.user_two_id !== userId) {
                return res.status(403).json({ error: 'Forbidden: You do not have access to this chat' });
        }

        const { data: updatedMessages, error } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('conversation_id', conversationId)
            .neq('sender_id', userId) 
            .eq('is_read', false) // Only update ones that are actually false
            .select();
        
        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ 
            message: 'Messages marked as read', 
            updated_count: updatedMessages.length 
        });
    }catch(error){
        console.error('Mark as Read Error:', error.message);
        res.status(500).json({ error: 'Failed to mark messages as read' });
    }
})

export default router; //[cite: 5]