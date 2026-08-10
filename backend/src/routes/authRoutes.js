import express from "express";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

router.post('/send-otp', async (req, res) => {
    const {email, full_name} = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    const { data, error } = await supabase.auth.signInWithOtp({
        email: email
    })
    if(error){
        return res.status(400).json({ error: error.message });
    }

    if(full_name){
        const {error : dbError} = await supabase.from('users').upsert([{email, full_name}], {onConflict: 'email'});
        if(dbError){
            return res.status(400).json({ error: dbError.message });
        }
    }

    res.status(200).json({ message: 'OTP sent successfully' });
}) 

router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    if(!email || !otp){
        return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const {data: {session}, error} = await supabase.auth.verifyOtp({
        type: 'email',
        token: otp,
        email: email
    })

    if(error){
        return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    await supabase.from('users').update({is_verified: true}).eq('email', email);

    res.status(200).json({
        message: 'Authentication successful',
        token: session.access_token, 
        user: session.user,
    })
})

export default router;