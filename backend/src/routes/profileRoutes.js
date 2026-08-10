import express from 'express';
import { supabase } from '../supabaseClient.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/setup', async (req,res)=>{
    const {auth_id, full_name, username, phone_number} = req.body;

    if(!auth_id || !username){
        return res.status(400).json({error: 'auth_id and username are required'});
    }

    try{
        const {data, error} = await supabase
            .from('profiles')
            .upsert([{id: auth_id, // This must match their Supabase Auth ID
                full_name: full_name, 
                username: username, 
                phone_number: phone_number 
            }], { onConflict: 'id' })
            .select()
            .single();

        if(error){
            return res.status(500).json({error: error.message});
        }
        res.status(201).json({ message: 'Profile updated successfully', profile: data });
    }catch(error){
        if(error.code === '23505') { // Unique violation error code
            return res.status(400).json({ error: 'Username already exists' });
        }
        console.error('Profile Setup Error:', error.message);
        res.status(500).json({ error: 'Failed to set up profile' });
    }
})


router.get('/search', requireAuth, async (req, res) => {
    const {query} = req.query;
    const currentUserId = req.user.id; // Extract the authenticated user's ID

    if(!query || query.trim() === ''){
        return res.status(400).json({error: 'Search Query parameter is required'});
    }

    try{
        const {data:users, error}= await supabase
            .from('profiles')
            .select('id, full_name, username, phone_number, avatar_url')
            .neq('id', currentUserId) // Ensure the user doesn't see themselves in the results
            .or(`username.ilike.%${query}%,phone_number.ilike.%${query}%`)
            .limit(15); // Limit results to prevent massive data payloads
        if(error){
            return res.status(500).json({error: error.message});
        }
        res.status(200).json(users);
    }catch(error){
        console.error('User Search Error:', error.message);
        res.status(500).json({ error: 'Failed to search for users' });
    }
})

export default router;