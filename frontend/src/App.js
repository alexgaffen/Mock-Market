// src/App.js
import React, { useState, useEffect } from 'react';
import { auth, firestore } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore'; 
import Login from './Login';
import StockSearch from './StockSearch';
import Portfolio from './Portfolio';
import SignOut from './SignOut';
import DeleteAccount from './DeleteAccount';

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [memberSince, setMemberSince] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const userRef = doc(firestore, 'users', currentUser.uid);
          const snapshot = await getDoc(userRef);
          
          if (snapshot.exists()) {
            const data = snapshot.data();
            
            // 1. Handle Theme
            if (data.theme) {
              setTheme(data.theme);
            }

            // 2. Handle "Member Since" (Read Only)
            if (data.createdAt) {
                try {
                    const dateObj = new Date(data.createdAt);
                    // Formats to: "Nov 27, 2023"
                    setMemberSince(dateObj.toLocaleDateString(undefined, { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    }));
                } catch (e) {
                    console.error("Date formatting error", e);
                }
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setTheme('light'); 
        setMemberSince(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    if (user) {
      try {
        const userRef = doc(firestore, 'users', user.uid);
        await updateDoc(userRef, { theme: newTheme });
      } catch (error) {
        console.error("Error saving theme:", error);
      }
    }
  };

  if (!user) return <Login />;

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">Mock <span>Market</span></div>
          
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {/* Theme Toggle */}
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </button>

            <div style={{width: '1px', height: '30px', background: 'var(--border)'}}></div>

            {/* User Info (Inline) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '600' }}>
                  {user.email}
                </span>
                
                {memberSince && (
                    <>
                        <span style={{ color: 'var(--border)' }}>|</span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            Member since: {memberSince}
                        </span>
                    </>
                )}
            </div>

            <div style={{width: '1px', height: '30px', background: 'var(--border)', marginLeft: '5px'}}></div>

            {/* Account Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <SignOut />
              <DeleteAccount />
            </div>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="dashboard-grid">
          <div className="col-left">
            <StockSearch />
          </div>
          <div className="col-right">
            <Portfolio />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;