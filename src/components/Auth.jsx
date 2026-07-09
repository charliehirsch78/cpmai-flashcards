import { useState } from 'react'
import { Mail, Lock, LogIn, UserPlus, AlertCircle, Loader } from 'lucide-react'
import { signUp, signIn } from '../lib/supabase'

export default function Auth({ onAuthSuccess }) {
  const [mode, setMode] = useState('signin') // 'signin' or 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match')
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters')
        }

        const result = await signUp(email, password)
        if (!result.success) {
          throw new Error(result.error || 'Sign up failed')
        }

        setError('Check your email to confirm your account!')
        setEmail('')
        setPassword('')
        setConfirmPassword('')
      } else {
        const result = await signIn(email, password)
        if (!result.success) {
          throw new Error(result.error || 'Sign in failed')
        }

        // Callback to parent to handle auth state
        if (result.user) {
          onAuthSuccess(result.user)
        }

        setEmail('')
        setPassword('')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              PMI-CPMAI
            </h1>
            <p className="text-slate-400 mt-2">
              {mode === 'signin' ? 'Sign in to sync your progress' : 'Create an account to sync across devices'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className={`mb-6 p-3 rounded-lg flex gap-2 ${
              error.includes('Check your email') 
                ? 'bg-green-900/30 border border-green-700 text-green-300' 
                : 'bg-red-900/30 border border-red-700 text-red-300'
            }`}>
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full bg-slate-700 text-white placeholder-slate-500 rounded-lg pl-10 pr-4 py-2 border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  required
                  minLength={6}
                  className="w-full bg-slate-700 text-white placeholder-slate-500 rounded-lg pl-10 pr-4 py-2 border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Confirm Password (signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••"
                    required
                    minLength={6}
                    className="w-full bg-slate-700 text-white placeholder-slate-500 rounded-lg pl-10 pr-4 py-2 border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-2 rounded-lg transition-all mt-6"
            >
              {loading ? (
                <Loader size={18} className="animate-spin" />
              ) : mode === 'signin' ? (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Sign Up
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin')
                  setError('')
                  setEmail('')
                  setPassword('')
                  setConfirmPassword('')
                }}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                {mode === 'signin' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

          {/* Info Text */}
          <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-400">
              {mode === 'signin' 
                ? '✓ Sign in to sync your progress across devices'
                : '✓ Create an account to save your learning progress and access it from any device'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
