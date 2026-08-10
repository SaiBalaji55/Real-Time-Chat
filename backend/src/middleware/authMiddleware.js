import { supabase } from '../supabaseClient.js';

export const requireAuth = async (req, res, next) => {
    // 1. Look for the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    // 2. Extract the raw token
    const token = authHeader.split(' ')[1];

    // 3. Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }

    // 4. Attach the authenticated user to the request object so routes can use it
    req.user = user;
    
    // 5. Continue to the actual route
    next();
};