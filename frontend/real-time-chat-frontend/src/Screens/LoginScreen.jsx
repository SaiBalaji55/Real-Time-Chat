import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { Navigate } from 'react-router-dom';

const LoginScreen = () => {
    const { user } = useAuth();

    const handleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
        });
        if (error) console.error("Login Error:", error.message);
    };

    // If the user is already authenticated, redirect them away from the login screen
    if (user) {
        return <Navigate to="/inbox" replace />;
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'sans-serif' }}>
            <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                <h1 style={{ marginBottom: '10px', color: '#333' }}>Welcome to ChatApp</h1>
                <p style={{ marginBottom: '30px', color: '#666' }}>Sign in to connect with your friends.</p>
                
                <button 
                    onClick={handleLogin} 
                    style={{ 
                        padding: '12px 24px', 
                        fontSize: '16px', 
                        cursor: 'pointer', 
                        backgroundColor: '#4285F4', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '6px',
                        fontWeight: 'bold'
                    }}
                >
                    Log In with Google
                </button>
            </div>
        </div>
    );
};

export default LoginScreen;