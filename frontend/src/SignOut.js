// src/SignOut.js
import React from 'react';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

function SignOut() {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log("Signed out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return <button className="btn btn-outline" onClick={handleSignOut}>Sign Out</button>;
}

export default SignOut;