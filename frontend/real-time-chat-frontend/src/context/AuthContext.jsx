import {createContext, useContext, useEffect, useState} from 'react';
import {supabase} from '../supabaseClient.jsx';

const AuthContext = createContext({});

export const AuthProvider = ({children}) => {

    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({data: {session}}) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        const {data:{subscription}} = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };

    }, []);

    return (
        <AuthContext.Provider value={{user, session, loading}}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

// 4. Create a Custom Hook for easy access
export const useAuth = () => {
    return useContext(AuthContext);
};