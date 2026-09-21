import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyBOXdaPOGQ6q1GloKApOa8EhQtpYhReAnI',
  authDomain: 'dialmax-fabc1.firebaseapp.com',
  projectId: 'dialmax-fabc1',
  storageBucket: 'dialmax-fabc1.firebasestorage.app',
  messagingSenderId: '1092355235206',
  appId: '1:1092355235206:web:4d658ff014b2b5fa16e007',
  measurementId: 'G-WMX7QQCL5E',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })
