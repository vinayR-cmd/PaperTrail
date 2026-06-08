import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Eye, EyeOff, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function AuthModal({ isOpen, initialTab = 'signin', onClose }) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const navigate = useNavigate()

  const handleSignIn = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      })
      
      if (error) {
        // Map Supabase error messages to user-friendly ones
        if (error.message.includes('Invalid login credentials')) {
          setError('Incorrect email or password. Please try again.')
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please verify your email before signing in.')
        } else if (error.message.includes('Too many requests')) {
          setError('Too many attempts. Please wait a few minutes.')
        } else {
          setError(error.message)
        }
        setLoading(false)
        return
      }
      
      // Success
      toast.success('Welcome back!')
      onClose()
      
      const redirectTo = sessionStorage.getItem('redirectTo') || '/dashboard'
      sessionStorage.removeItem('redirectTo')
      navigate(redirectTo)
      
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError(null)
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    
    setLoading(true)
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: { full_name: fullName || '' }
        }
      })
      
      if (error) {
        if (error.message.includes('already registered')) {
          setError('This email is already registered. Try signing in.')
        } else if (error.message.includes('Password should be')) {
          setError('Password must be at least 6 characters.')
        } else {
          setError(error.message)
        }
        setLoading(false)
        return
      }
      
      // Success — check if email confirmation needed
      if (data.user && !data.session) {
        setError(null)
        // Show success message instead of error
        setSuccessMessage('Account created! Check your email to verify.')
      } else {
        toast.success('Account created! Welcome to PaperTrail.')
        onClose()
        const redirectTo = sessionStorage.getItem('redirectTo') || '/dashboard'
        sessionStorage.removeItem('redirectTo')
        navigate(redirectTo)
      }
      
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    })
    if (error) setError(error.message)
  }

  const handleAuth = (e) => {
    if (activeTab === 'signin') {
      handleSignIn(e)
    } else {
      handleSignUp(e)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(2, 2, 8, 0.8)',
            backdropFilter: 'blur(8px)',
          }}
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="glass-card"
          style={{
            width: '100%',
            maxWidth: '440px',
            padding: '32px',
            position: 'relative',
            zIndex: 1001,
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
            border: '1px solid var(--border-card)',
            background: 'rgba(15, 21, 32, 0.85)',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'color 0.2s',
            }}
            className="hover:text-white"
          >
            <X size={20} />
          </button>

          {/* Title */}
          <h2
            className="font-display"
            style={{
              fontSize: '28px' ,
              fontWeight: 600,
              marginBottom: '24px',
              color: 'var(--text-primary)',
            }}
          >
            {activeTab === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>

          {/* Tab Selector */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: '24px',
              position: 'relative',
            }}
          >
             <button
              onClick={() => {
                setActiveTab('signin')
                setError('')
                setSuccessMessage('')
              }}
              style={{
                flex: 1,
                paddingBottom: '12px',
                background: 'transparent',
                border: 'none',
                color: activeTab === 'signin' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-ui)',
                fontWeight: 600,
                fontSize: '16px' ,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'color 0.3s',
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab('signup')
                setError('')
                setSuccessMessage('')
              }}
              style={{
                flex: 1,
                paddingBottom: '12px',
                background: 'transparent',
                border: 'none',
                color: activeTab === 'signup' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-ui)',
                fontWeight: 600,
                fontSize: '16px' ,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'color 0.3s',
              }}
            >
              Create Account
            </button>

            {/* Sliding indicator */}
            <div
              style={{
                position: 'absolute',
                bottom: -1,
                height: '2px',
                width: '50%',
                background: 'var(--accent-blue)',
                left: activeTab === 'signin' ? '0%' : '50%',
                transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>

          {/* Error display */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              <AlertTriangle size={18} style={{color: '#ef4444', flexShrink:0}} />
              <p style={{
                fontSize: '15px' ,
                color: '#ef4444',
                fontFamily: 'var(--font-ui)',
                margin: 0,
                lineHeight: 1.5,
                textAlign: 'left'
              }}>{error}</p>
            </div>
          )}

          {/* Success display */}
          {successMessage && (
            <div style={{
              background: 'rgba(16,217,126,0.08)',
              border: '1px solid rgba(16,217,126,0.25)',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              <CheckCircle2 size={18} style={{color: '#10d97e', flexShrink:0}} />
              <p style={{
                fontSize: '15px' ,
                color: '#10d97e',
                fontFamily: 'var(--font-ui)',
                margin: 0,
                lineHeight: 1.5,
                textAlign: 'left'
              }}>{successMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {activeTab === 'signup' && (
              <div className="flex flex-col gap-1.5 text-left">
                <label
                  style={{
                    fontSize: '14px' ,
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-ui)',
                    fontWeight: 500,
                  }}
                >
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setError(''); }}
                  placeholder="John Doe"
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-card)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    color: 'var(--text-primary)',
                    fontSize: '16px' ,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  className="focus:border-accent-blue! placeholder:text-zinc-600"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5 text-left">
              <label
                style={{
                  fontSize: '14px' ,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 500,
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  color: 'var(--text-primary)',
                  fontSize: '16px' ,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                className="focus:border-accent-blue! placeholder:text-zinc-600"
              />
            </div>

            <div className="flex flex-col gap-1.5 text-left relative">
              <label
                style={{
                  fontSize: '14px' ,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 500,
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-card)',
                    borderRadius: '8px',
                    padding: '12px 48px 12px 16px',
                    color: 'var(--text-primary)',
                    fontSize: '16px' ,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  className="focus:border-accent-blue! placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                  className="hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {activeTab === 'signup' && (
              <div className="flex flex-col gap-1.5 text-left relative">
                <label
                  style={{
                    fontSize: '14px' ,
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-ui)',
                    fontWeight: 500,
                  }}
                >
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-card)',
                      borderRadius: '8px',
                      padding: '12px 48px 12px 16px',
                      color: 'var(--text-primary)',
                      fontSize: '16px' ,
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    className="focus:border-accent-blue! placeholder:text-zinc-600"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary cursor-pointer disabled:cursor-not-allowed"
              style={{
                width: '100%',
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                minHeight: '44px',
              }}
            >
              {loading ? (
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
              ) : activeTab === 'signin' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '24px 0',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            <span
              style={{
                padding: '0 12px',
                fontSize: '13px' ,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-ui)',
                fontWeight: 600,
                letterSpacing: '0.05em',
              }}
            >
              or continue with
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          </div>

          {/* Google OAuth Button */}
          <button
            onClick={handleGoogleSignIn}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-card)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              padding: '12px 16px',
              fontSize: '16px' ,
              fontFamily: 'var(--font-ui)',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            className="hover:border-accent-blue! hover:bg-white/5"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </motion.div>
      </div>
      
      {/* Dynamic spinner Keyframe styles */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </AnimatePresence>
  )
}
