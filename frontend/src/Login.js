// src/Login.js
import React, { useState, useEffect } from 'react';
import { auth, googleProvider, firestore } from './firebase';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

function Login() {
  const [text, setText] = useState('');
  const fullText = "Simulate trading. Test algorithms. Master the market.";

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      setText(fullText.slice(0, index + 1));
      index++;
      if (index === fullText.length) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userRef = doc(firestore, `users/${user.uid}`);
      const snapshot = await getDoc(userRef);
      if (!snapshot.exists()) {
        await setDoc(userRef, {
          name: user.displayName,
          email: user.email,
          balance: 100000,
          portfolio: [],
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error during sign in:", error);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      background: '#f9fafb', // Force Light Mode background
      color: '#111827',      // Force Dark Text
      transition: 'all 0.3s'
    }}>
      <div className="card" style={{ textAlign: 'center', maxWidth: '400px', width: '100%', background: 'white' }}>
        <h1 style={{ marginBottom: '10px', fontSize: '2.5rem' }}>
          Mock <span style={{color: '#7c3aed'}}>Market</span>
        </h1>
        
        <p style={{ 
          color: '#6b7280', 
          marginBottom: '30px', 
          minHeight: '24px', 
          fontFamily: 'monospace'
        }}>
          {text}<span className="cursor">|</span>
        </p>

        <button className="btn btn-primary" style={{ width: '100%', padding: '12px' }} onClick={signInWithGoogle}>
          Sign in with Google
        </button>
      </div>

      <style>{`
        .cursor { animation: blink 1s step-end infinite; }
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}

export default Login;