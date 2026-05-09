import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Unsubscribe,
  type User,
} from 'firebase/auth'
import { getFirebaseApp, isFirebaseConfigured } from './firebaseApp'

export type AuthUser = User

function getFirebaseAuth() {
  const app = getFirebaseApp()
  return app ? getAuth(app) : null
}

function requireFirebaseAuth() {
  const auth = getFirebaseAuth()
  if (!auth) throw new Error('ยังไม่ได้ตั้งค่า Firebase Auth กรุณากรอกค่า VITE_FIREBASE_* ใน .env.local')
  return auth
}

export function subscribeToAuthState(callback: (user: AuthUser | null) => void): Unsubscribe {
  const auth = getFirebaseAuth()
  if (!auth) {
    callback(null)
    return () => undefined
  }
  return onAuthStateChanged(auth, callback)
}

export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  const credential = await signInWithEmailAndPassword(requireFirebaseAuth(), email, password)
  return credential.user
}

export async function registerWithEmail(email: string, password: string): Promise<AuthUser> {
  const credential = await createUserWithEmailAndPassword(requireFirebaseAuth(), email, password)
  return credential.user
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(requireFirebaseAuth(), email)
}

export async function logout(): Promise<void> {
  await signOut(requireFirebaseAuth())
}

export function getAuthErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
  }
  if (code === 'auth/email-already-in-use') return 'อีเมลนี้ถูกสมัครใช้งานแล้ว'
  if (code === 'auth/invalid-email') return 'กรอกอีเมลให้ถูกต้อง'
  if (code === 'auth/weak-password') return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
  if (code === 'auth/too-many-requests') return 'พยายามหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่'
  if (error instanceof Error) return error.message
  return 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่'
}

export { isFirebaseConfigured }
