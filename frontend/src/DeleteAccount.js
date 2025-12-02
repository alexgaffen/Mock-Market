// src/DeleteAccount.js
import React from 'react';
import { auth, firestore } from './firebase';
import { doc, deleteDoc } from 'firebase/firestore';

function DeleteAccount() {
  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      try {
        const user = auth.currentUser;
        if (user) {
          // Optionally, delete user data from Firestore
          const userRef = doc(firestore, 'users', user.uid);
          await deleteDoc(userRef);
          // Delete the Firebase user account
          await user.delete();
          alert("Account deleted successfully.");
          // Optionally, you might redirect the user to a login screen here
        } else {
          alert("No authenticated user found.");
        }
      } catch (error) {
        console.error("Error deleting account:", error);
        alert("Error deleting account: " + error.message);
      }
    }
  };

  return <button className="btn btn-danger" style={{marginLeft: '10px'}} onClick={handleDelete}>Delete Account</button>;
}

export default DeleteAccount;