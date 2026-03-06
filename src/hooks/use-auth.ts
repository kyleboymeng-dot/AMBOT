
"use client"

import { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { Role } from '@/lib/mock-data';

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  gradeLevel?: string;
  section?: string;
}

export function useAuth() {
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setError(null);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: userData.name || firebaseUser.displayName || 'User',
              role: (userData.role as Role) || 'student',
              avatar: userData.avatar,
              gradeLevel: userData.gradeLevel,
              section: userData.section,
            });
          } else {
            // Profile document missing in Firestore. Use warn to avoid triggering the full-screen Next.js error overlay.
            console.warn(`No user profile found for UID: ${firebaseUser.uid}. This is a data configuration issue: your Firestore document ID must match your Auth UID.`);
            setError("Your account exists but your portal profile is missing. Please contact the administrator.");
            setUser(null);
          }
        } catch (err: any) {
          console.warn("Error fetching user profile:", err);
          setError("Failed to load user profile.");
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db]);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return { user, login, logout, loading, error };
}
