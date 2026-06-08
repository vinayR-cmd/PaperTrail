import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Eye, EyeOff, AlertTriangle, CheckCircle2 } from 'lucide-react'

export default function Landing() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const mouseRef = useRef({ x: null, y: null })

  const [tab, setTab] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // If already logged in, redirect
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, loading])

  // Interactive network graph background simulation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    const particleCount = 50
    const particles = []
    const colors = [
      'rgba(67, 97, 238, 0.45)',  // Accent blue
      'rgba(124, 58, 237, 0.45)', // Accent violet
      'rgba(6, 182, 212, 0.45)',  // Accent cyan
      'rgba(59, 130, 246, 0.45)',  // Blue
    ]
    const labels = [
      'NLP', 'Transformers', 'LLM', '2025', 'arXiv', 'Neural Net', 'IEEE',
      'Knowledge Graph', 'Attention', 'GPT-4', 'Machine Learning', 'AI Observatory',
      'Vector DB', 'Semantic Search', 'Research Gap', 'Deep Learning', 'CVPR', 'NeurIPS',
      'Reinforcement', 'BERT', 'GNN', 'Graph ML', 'Contradiction'
    ]

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 4.5 + 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        label: Math.random() < 0.25 ? labels[Math.floor(Math.random() * labels.length)] : null,
        pulseSpeed: 0.02 + Math.random() * 0.03,
        pulsePhase: Math.random() * Math.PI * 2
      })
    }

    const maxDistance = 140
    const mouseRadius = 180

    const animate = () => {
      ctx.clearRect(0, 0, width, height)
      const mouse = mouseRef.current

      // Connect particles
      for (let i = 0; i < particleCount; i++) {
        const p1 = particles[i]

        p1.x += p1.vx
        p1.y += p1.vy

        if (p1.x < 0 || p1.x > width) p1.vx *= -1
        if (p1.y < 0 || p1.y > height) p1.vy *= -1

        p1.x = Math.max(0, Math.min(width, p1.x))
        p1.y = Math.max(0, Math.min(height, p1.y))

        // Gentle pull towards mouse
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - p1.x
          const dy = mouse.y - p1.y
          const dist = Math.hypot(dx, dy)
          if (dist < mouseRadius) {
            p1.x += (dx / dist) * 0.12
            p1.y += (dy / dist) * 0.12
          }
        }

        // Draw links between nodes
        for (let j = i + 1; j < particleCount; j++) {
          const p2 = particles[j]
          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const dist = Math.hypot(dx, dy)

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.12
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(67, 97, 238, ${alpha})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }

      // Draw mouse connections
      if (mouse.x !== null && mouse.y !== null) {
        for (let i = 0; i < particleCount; i++) {
          const p = particles[i]
          const dx = mouse.x - p.x
          const dy = mouse.y - p.y
          const dist = Math.hypot(dx, dy)
          if (dist < mouseRadius) {
            const alpha = (1 - dist / mouseRadius) * 0.15
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(mouse.x, mouse.y)
            ctx.strokeStyle = `rgba(124, 58, 237, ${alpha})`
            ctx.lineWidth = 1.0
            ctx.stroke()
          }
        }
      }

      // Draw nodes
      for (let i = 0; i < particleCount; i++) {
        const p = particles[i]

        p.pulsePhase += p.pulseSpeed
        const sizeOffset = Math.sin(p.pulsePhase) * 0.8
        const currentRadius = Math.max(1.5, p.radius + sizeOffset)

      ctx.beginPath()
      ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      
      ctx.shadowBlur = 6
      ctx.shadowColor = p.color
      ctx.fill()
      ctx.shadowBlur = 0

      if (p.label) {
        ctx.font = "11px 'Cabinet Grotesk', sans-serif"
        ctx.fillStyle = document.documentElement.classList.contains('dark')
          ? 'rgba(203, 213, 225, 0.65)'
          : 'rgba(75, 85, 99, 0.55)'
        ctx.fillText(p.label, p.x + p.radius + 6, p.y + 4)
      }
    }

    animationId = requestAnimationFrame(animate)
  }

  animate()

  return () => {
    window.removeEventListener('resize', handleResize)
    cancelAnimationFrame(animationId)
  }
}, [])

const handleMouseMove = (e) => {
  if (!containerRef.current) return
  const rect = containerRef.current.getBoundingClientRect()
  mouseRef.current = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

const handleMouseLeave = () => {
  mouseRef.current = { x: null, y: null }
}

const handleSignIn = async (e) => {
  e.preventDefault()
  setError('')
  setSubmitting(true)
  
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password
  })
  
  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      setError('Incorrect email or password.')
    } else if (error.message.includes('Email not confirmed')) {
      setError('Please verify your email first.')
    } else {
      setError(error.message)
    }
    setSubmitting(false)
    return
  }
  
  toast.success('Welcome back!')
  navigate(from, { replace: true })
}

const handleSignUp = async (e) => {
  e.preventDefault()
  setError('')
  
  if (password.length < 6) {
    setError('Password must be at least 6 characters.')
    return
  }
  if (password !== confirmPassword) {
    setError('Passwords do not match.')
    return
  }
  
  setSubmitting(true)
  
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: fullName } }
  })
  
  if (error) {
    if (error.message.includes('already registered')) {
      setError('Email already registered. Sign in instead.')
    } else {
      setError(error.message)
    }
    setSubmitting(false)
    return
  }
  
  if (data.session) {
    toast.success('Account created! Welcome to PaperTrail.')
    navigate('/dashboard', { replace: true })
  } else {
    setSuccessMessage('Check your email to verify your account.')
    setSubmitting(false)
  }
}

const handleGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/dashboard` }
  })
  if (error) setError(error.message)
}

if (loading) return null

return (
  <div
    ref={containerRef}
    onMouseMove={handleMouseMove}
    onMouseLeave={handleMouseLeave}
    style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--bg-page) 0%, var(--bg-surface) 100%)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'background-color 0.2s, color 0.2s'
    }}
  >
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
    <div style={{
      width: '100%', maxWidth: '400px',
      position: 'relative',
      zIndex: 1
    }}>
      {/* Logo */}
      <div style={{textAlign: 'center', marginBottom: '32px'}}>
        <h1 style={{
          fontSize: '32px' , fontFamily: 'var(--font-display)',
          fontWeight: 700, color: 'var(--text-primary)',
          marginBottom: '8px'
        }}>
          <span style={{color: 'var(--accent)'}}>P</span>aperTrail
        </h1>
        <p style={{
          fontSize: '16px' , color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)'
        }}>
          Research gap intelligence platform
        </p>
      </div>

      {/* Auth card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: 'var(--shadow-md)',
        transition: 'all 0.2s'
      }}>
        {/* Tab switcher */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-surface)',
          borderRadius: '8px',
          padding: '3px',
          marginBottom: '24px',
          border: '1px solid var(--border)'
        }}>
          {['signin', 'signup'].map(t => (
            <button
              key={t}
              onClick={() => {
                setTab(t)
                setError('')
                setSuccessMessage('')
              }}
              style={{
                flex: 1, padding: '8px',
                borderRadius: '6px', border: 'none',
                background: tab === t ? 'var(--bg-card)' : 'transparent',
                color: tab === t
                  ? 'var(--text-primary)'
                  : 'var(--text-secondary)',
                fontSize: '15px' ,
                fontFamily: 'var(--font-ui)', fontWeight: 600,
                cursor: 'pointer',
                boxShadow: tab === t
                  ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              {t === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)',
            borderRadius: '8px', padding: '10px 14px',
            marginBottom: '16px', fontSize: '15px' ,
            color: 'var(--danger)', fontFamily: 'var(--font-ui)',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <AlertTriangle size={16} style={{flexShrink: 0}} />
            {error}
          </div>
        )}

        {successMessage && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)',
            borderRadius: '8px', padding: '10px 14px',
            marginBottom: '16px', fontSize: '15px' ,
            color: 'var(--success)', fontFamily: 'var(--font-ui)',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <CheckCircle2 size={16} style={{flexShrink: 0}} />
            {successMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={tab === 'signin' ? handleSignIn : handleSignUp}>
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>

            {tab === 'signup' && (
              <input
                type="text"
                placeholder="Full name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  fontSize: '16px' , fontFamily: 'var(--font-body)',
                  color: 'var(--text-primary)', outline: 'none',
                  background: 'var(--bg-surface)',
                  transition: 'border-color 0.15s, background-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            )}

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              required
              style={{
                width: '100%', padding: '10px 14px',
                border: '1px solid var(--border)', borderRadius: '8px',
                fontSize: '16px' , fontFamily: 'var(--font-body)',
                color: 'var(--text-primary)', outline: 'none',
                background: 'var(--bg-surface)',
                transition: 'border-color 0.15s, background-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />

            <div style={{position: 'relative'}}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                required
                style={{
                  width: '100%', padding: '10px 40px 10px 14px',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  fontSize: '16px' , fontFamily: 'var(--font-body)',
                  color: 'var(--text-primary)', outline: 'none',
                  background: 'var(--bg-surface)',
                  transition: 'border-color 0.15s, background-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  color: 'var(--text-tertiary)', cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {tab === 'signup' && (
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  fontSize: '16px' , fontFamily: 'var(--font-body)',
                  color: 'var(--text-primary)', outline: 'none',
                  background: 'var(--bg-surface)',
                  transition: 'border-color 0.15s, background-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{
              width: '100%', marginTop: '16px',
              padding: '11px', fontSize: '16px' ,
              justifyContent: 'center',
              opacity: submitting ? 0.7 : 1,
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting
              ? (tab === 'signin' ? 'Signing in...' : 'Creating...')
              : (tab === 'signin' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          margin: '20px 0'
        }}>
          <div style={{flex:1, height:'1px', background:'var(--border)'}}/>
          <span style={{
            fontSize: '14px' , color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-ui)'
          }}>or</span>
          <div style={{flex:1, height:'1px', background:'var(--border)'}}/>
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogle}
          className="btn-secondary"
          style={{
            width: '100%', padding: '11px',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '10px'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </div>

      <p style={{
        textAlign: 'center', marginTop: '20px',
        fontSize: '14px' , color: 'var(--text-tertiary)',
        fontFamily: 'var(--font-ui)'
      }}>
        By continuing you agree to PaperTrail's Terms of Service
      </p>
    </div>
  </div>
)
}
