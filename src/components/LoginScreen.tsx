import { useState } from 'react'
import { LogoMark, GoogleIcon } from './Icons'

export default function LoginScreen({ onSignIn }: { onSignIn: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async () => {
    setBusy(true)
    setError(null)
    try {
      await onSignIn()
    } catch {
      setError('Sign-in failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-brand-700 via-brand-600 to-brand-800 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur ring-1 ring-white/20 flex items-center justify-center shadow-xl shadow-brand-900/30">
          <LogoMark className="w-12 h-12 text-white" />
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-white">Dialmax</h1>
        <p className="mt-2 text-brand-100 text-base leading-relaxed">
          Upload your leads. Work the queue.
          <br />
          Log every call in seconds.
        </p>

        <button
          onClick={handleSignIn}
          disabled={busy}
          className="mt-10 inline-flex items-center justify-center gap-3 rounded-2xl bg-white px-8 py-4 text-base font-semibold text-slate-800 shadow-lg shadow-brand-900/20 transition-all duration-200 hover:bg-slate-50 hover:shadow-xl hover:shadow-brand-900/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-lg disabled:hover:bg-white"
        >
          {busy ? (
            <span className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          ) : (
            <GoogleIcon className="w-5 h-5" />
          )}
          {busy ? 'Signing in…' : 'Continue with Google'}
        </button>

        {error && <p className="mt-4 text-sm text-rose-200">{error}</p>}

        <p className="mt-12 text-xs text-brand-200/80">
          Your leads stay private to your account.
        </p>
      </div>
    </div>
  )
}
