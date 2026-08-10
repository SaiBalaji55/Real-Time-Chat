import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import ProfileSetupScreen from './screens/ProfileSetupScreen';
import InboxScreen from './screens/InboxScreen';

function App() {
  const { user, loading } = useAuth();

  // Show a blank screen or spinner while Supabase checks the session on load
  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;

  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<LoginScreen />} />

        {/* Profile Setup Route */}
        <Route 
          path="/setup" 
          element={
            user ? <ProfileSetupScreen /> : <Navigate to="/" />
          } 
        />

        {/* Protected Route: Inbox */}
        <Route 
          path="/inbox" 
          element={
            user ? <InboxScreen /> : <Navigate to="/" />
          } 
        />
        
        {/* We will add /chat/:id routes here next */}
      </Routes>
    </Router>
  );
}

export default App;