"use client"

import { createContext, useContext, useEffect, useState } from "react"
import {
  User,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth"
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { auth, googleProvider, db } from "@/lib/firebase"

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Create or update user document in Firestore
        await createOrUpdateUserDocument(user)
        setUser(user)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const createOrUpdateUserDocument = async (user: User) => {
    const userDocRef = doc(db, "users", user.uid)
    const userDoc = await getDoc(userDocRef)

    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLoginAt: serverTimestamp(),
    }

    if (!userDoc.exists()) {
      // Create new user document
      await setDoc(userDocRef, {
        ...userData,
        createdAt: serverTimestamp(),
        totalGenerations: 0,
        preferences: {
          theme: "light",
          notifications: true,
        },
      })
    } else {
      // Update existing user document
      await setDoc(userDocRef, userData, { merge: true })
    }
  }

  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      await signInWithPopup(auth, googleProvider)
      // Success handled by onAuthStateChanged listener
    } catch (error: any) {
      console.error("Error signing in with Google:", error)
      
      // Handle specific error cases for better UX
      if (error.code === 'auth/popup-closed-by-user') {
        // User closed popup - this is not really an error, just user choice
        return;
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error("Popup was blocked by your browser. Please allow popups for this site and try again.");
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error("Network error. Please check your connection and try again.");
      } else {
        throw new Error("Failed to sign in. Please try again.");
      }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
      throw error
    }
  }

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
