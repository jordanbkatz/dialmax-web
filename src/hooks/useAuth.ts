import { useEffect, useState } from 'react'
import {
  getRedirectResult,
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
    let isMounted = true

    // Check if user is returning from a redirect sign-in flow
    getRedirectResult(auth)
      .then((cred) => {
        if (cred?.user && isMounted) {
          setUser(cred.user)
          ensureUserDoc(cred.user.uid, {
            displayName: cred.user.displayName,
            photoURL: cred.user.photoURL,
            email: cred.user.email,
          }).catch((e) => console.warn('ensureUserDoc failed:', e))
        }
      })
      .catch((err) => {
        console.warn('getRedirectResult error:', err)
      })

    const unsub = onAuthStateChanged(auth, (u) => {
      if (isMounted) {
        setUser(u)
        setLoading(false)
      }
      if (u) {
        ensureUserDoc(u.uid, {
          displayName: u.displayName,
          photoURL: u.photoURL,
          email: u.email,
        }).catch((e) => console.warn('ensureUserDoc failed:', e))
      }
    })

    return () => {
      isMounted = false
      unsub()
    }
  }, [])

  const signIn = async () => {
    try {
      // Primary: Use popup (works smoothly on modern mobile iOS/Android and desktop)
      const cred = await signInWithPopup(auth, googleProvider)
      if (cred.user) {
        setUser(cred.user)
        await ensureUserDoc(cred.user.uid, {
          displayName: cred.user.displayName,
          photoURL: cred.user.photoURL,
          email: cred.user.email,
        })
      }
    } catch (err: unknown) {
      const authErr = err as { code?: string }
      // If popup was blocked or failed due to popup restrictions, fall back to redirect
      if (
        authErr?.code === 'auth/popup-blocked' ||
        authErr?.code === 'auth/cancelled-popup-request'
      ) {
        await signInWithRedirect(auth, googleProvider)
        return
      }
      if (authErr?.code === 'auth/popup-closed-by-user') {
        // User dismissed the popup
        return
      }
      throw err
    }
  }

  const logout = () => signOut(auth)

  return { user, loading, signIn, logout }
}

