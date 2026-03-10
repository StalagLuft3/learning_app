import { useEffect, useState } from 'react';
import { isAuthenticated, redirectToLogin } from '../commonFunctions/auth.js';

const ProtectedRoute = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      console.log('Checking authentication...');
      try {
        const authResult = await isAuthenticated();
        console.log('Authentication result:', authResult);
        
        if (!authResult) {
          console.log('Not authenticated, redirecting to login');
          redirectToLogin();
          return;
        }
        
        // User is authenticated
        setAuthenticated(true);
        setIsChecking(false);
      } catch (error) {
        console.error('Error checking authentication:', error);
        redirectToLogin();
      }
    };

    checkAuth();
  }, []);

  // Show loading while checking authentication
  if (isChecking) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <p>Checking authentication...</p>
        <p style={{ fontSize: '14px', color: '#666' }}>Please wait while we verify your login status</p>
      </div>
    );
  }

  // Render protected content if authenticated
  return authenticated ? children : null;
};

export default ProtectedRoute;
