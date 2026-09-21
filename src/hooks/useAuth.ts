import { useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import { ensureUserDoc } from '../lib/firestore'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
      if (u) {
        ensureUserDoc(u.uid, {
          displayName: u.displayName,
          photoURL: u.photoURL,
          email: u.email,
        }).catch(() => {})
      }
    })
    return unsub
  }, [])

  const signIn = async () => {
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    try {
      if (isMobile) {
        await signInWithRedirect(auth, googleProvider)
      } else {
        await signInWithPopup(auth, googleProvider)
      }
    } catch (err) {
      // Popup blocked or failed — fall back to redirect
      if (!isMobile) {
        try {
          await signInWithRedirect(auth, googleProvider)
        } catch {
          // surface to caller
          throw err
        }
      } else {
        throw err
      }
    }
  }

  const logout = () => signOut(auth)

  return { user, loading, signIn, logout }
}
