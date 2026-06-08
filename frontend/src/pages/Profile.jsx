import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import {
  ArrowLeft, User, Mail, Calendar,
  Shield, Bell, Trash2, Save, Eye, EyeOff, AlertTriangle
} from 'lucide-react'

export default function Profile() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('account')
  const [fullName, setFullName] = useState(
    profile?.full_name || ''
  )
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const initials = (profile?.full_name || user?.email || 'U')
    .charAt(0).toUpperCase()

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
    : 'Unknown'

  async function handleSaveName() {
    if (!fullName.trim()) {
      toast.error('Name cannot be empty')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
      if (error) throw error
      toast.success('Name updated successfully!')
    } catch (e) {
      toast.error('Failed to update: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (error) throw error
      toast.success('Password updated!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e) {
      toast.error('Failed: ' + e.message)
    } finally {
      setChangingPassword(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const tabs = [
    { id: 'account', label: 'Account' },
    { id: 'security', label: 'Security' },
    { id: 'danger', label: 'Danger Zone' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      padding: '90px 24px 80px',
      maxWidth: '720px',
      margin: '0 auto',
      position: 'relative',
      zIndex: 10
    }}>

      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'none', border: 'none',
          color: 'var(--text-tertiary)', fontSize: '15px' ,
          fontFamily: 'var(--font-ui)', cursor: 'pointer',
          marginBottom: '32px', padding: 0,
          transition: 'color 0.2s'
        }}
        onMouseEnter={e =>
          e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={e =>
          e.currentTarget.style.color = 'var(--text-tertiary)'}
      >
        <ArrowLeft size={14} />
        Back to Dashboard
      </button>

      {/* Avatar + name hero */}
      <div className="glass-card" style={{
        padding: '28px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '24px'
      }}>
        <div style={{
          width: '72px', height: '72px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #4f8ef7, #7c3aed)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px' ,
          fontFamily: 'var(--font-display)',
          fontWeight: 700, color: '#fff',
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(79,142,247,0.15)'
        }}>
          {initials}
        </div>
        <div style={{flex: 1}}>
          <h1 style={{
            fontSize: '25px' ,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '4px'
          }}>
            {profile?.full_name || 'Researcher'}
          </h1>
          <p style={{
            fontSize: '16px' ,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)',
            marginBottom: '8px'
          }}>{user?.email}</p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 10px',
            background: 'rgba(16,217,126,0.1)',
            border: '1px solid rgba(16,217,126,0.2)',
            borderRadius: '99px'
          }}>
            <div style={{
              width: '6px', height: '6px',
              borderRadius: '50%',
              background: '#10d97e'
            }}/>
            <span style={{
              fontSize: '13px' ,
              color: '#10d97e',
              fontFamily: 'var(--font-ui)',
              fontWeight: 600
            }}>Active Account</span>
          </div>
        </div>
        <div style={{
          textAlign: 'right',
          flexShrink: 0
        }}>
          <p style={{
            fontSize: '13px' ,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-ui)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '4px'
          }}>Member Since</p>
          <p style={{
            fontSize: '15px' ,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-ui)'
          }}>{memberSince}</p>
        </div>
      </div>

      <div style={{
        display: 'flex', gap: '4px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '10px', padding: '4px',
        marginBottom: '20px',
        width: 'fit-content'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 20px',
              borderRadius: '7px', border: 'none',
              background: activeTab === tab.id
                ? tab.id === 'danger'
                  ? 'rgba(239,68,68,0.1)'
                  : 'var(--accent-light)'
                : 'transparent',
              color: activeTab === tab.id
                ? tab.id === 'danger' ? '#ef4444' : 'var(--accent)'
                : 'var(--text-tertiary)',
              fontSize: '15px' ,
              fontFamily: 'var(--font-ui)',
              fontWeight: 500, cursor: 'pointer',
              transition: 'all 0.2s', outline: 'none'
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* ACCOUNT TAB */}
      {activeTab === 'account' && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '16px'
        }}>

          {/* Full name */}
          <div className="glass-card" style={{padding: '24px'}}>
            <div style={{
              display: 'flex', alignItems: 'center',
              gap: '8px', marginBottom: '16px'
            }}>
              <User size={15} color="var(--text-tertiary)"/>
              <h3 style={{
                fontSize: '15px' ,
                fontFamily: 'var(--font-ui)', fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.08em'
              }}>Full Name</h3>
            </div>
            <div style={{
              display: 'flex', gap: '12px', alignItems: 'center'
            }}>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
                style={{
                  flex: 1,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'var(--text-primary)',
                  fontSize: '16px' ,
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  transition: 'border-color 0.2s, background-color 0.2s'
                }}
                onFocus={e =>
                  e.target.style.borderColor = 'var(--accent)'}
                onBlur={e =>
                  e.target.style.borderColor = 'var(--border)'}
                onKeyDown={e =>
                  e.key === 'Enter' && handleSaveName()}
              />
              <button
                onClick={handleSaveName}
                disabled={saving}
                className="btn-primary"
                style={{
                  padding: '10px 16px', fontSize: '15px' ,
                  display: 'flex', alignItems: 'center', gap: '6px',
                  opacity: saving ? 0.7 : 1,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  flexShrink: 0
                }}
              >
                <Save size={13}/>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Email (read only) */}
          <div className="glass-card" style={{padding: '24px'}}>
            <div style={{
              display: 'flex', alignItems: 'center',
              gap: '8px', marginBottom: '16px'
            }}>
              <Mail size={15} color="var(--text-tertiary)"/>
              <h3 style={{
                fontSize: '15px' ,
                fontFamily: 'var(--font-ui)', fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.08em'
              }}>Email Address</h3>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center',
              gap: '12px'
            }}>
              <input
                value={user?.email || ''}
                readOnly
                style={{
                  flex: 1,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'var(--text-tertiary)',
                  fontSize: '16px' ,
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  cursor: 'not-allowed'
                }}
              />
              <span style={{
                fontSize: '13px' ,
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-ui)',
                flexShrink: 0
              }}>Cannot be changed</span>
            </div>
          </div>

          {/* Account info */}
          <div className="glass-card" style={{padding: '24px'}}>
            <div style={{
              display: 'flex', alignItems: 'center',
              gap: '8px', marginBottom: '16px'
            }}>
              <Calendar size={15} color="var(--text-tertiary)"/>
              <h3 style={{
                fontSize: '15px' ,
                fontFamily: 'var(--font-ui)', fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.08em'
              }}>Account Info</h3>
            </div>
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '12px'
            }}>
              {[
                { label: 'User ID', value: user?.id?.substring(0, 16) + '...' },
                { label: 'Auth Provider', value: user?.app_metadata?.provider || 'email' },
                { label: 'Account Created', value: memberSince },
                { label: 'Last Sign In', value: user?.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric',
                        year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })
                    : 'Unknown'
                }
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: i < 3
                    ? '1px solid var(--border-subtle)'
                    : 'none'
                }}>
                  <span style={{
                    fontSize: '15px' ,
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-ui)'
                  }}>{item.label}</span>
                  <span style={{
                    fontSize: '15px' ,
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)'
                  }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECURITY TAB */}
      {activeTab === 'security' && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '16px'
        }}>

          <div className="glass-card" style={{padding: '24px'}}>
            <div style={{
              display: 'flex', alignItems: 'center',
              gap: '8px', marginBottom: '20px'
            }}>
              <Shield size={15} color="var(--text-tertiary)"/>
              <h3 style={{
                fontSize: '15px' ,
                fontFamily: 'var(--font-ui)', fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.08em'
              }}>Change Password</h3>
            </div>

            <div style={{
              display: 'flex', flexDirection: 'column', gap: '12px'
            }}>
              <div style={{position: 'relative'}}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="New password (min 6 chars)"
                  style={{
                    width: '100%',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 40px 10px 14px',
                    color: 'var(--text-primary)',
                    fontSize: '16px' ,
                    fontFamily: 'var(--font-body)',
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s, background-color 0.2s'
                  }}
                  onFocus={e =>
                    e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e =>
                    e.target.style.borderColor = 'var(--border)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px',
                    top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    color: 'var(--text-tertiary)', cursor: 'pointer',
                    padding: 0, display: 'flex'
                  }}
                >
                  {showPassword
                    ? <EyeOff size={15}/>
                    : <Eye size={15}/>}
                </button>
              </div>

              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                style={{
                  width: '100%',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'var(--text-primary)',
                  fontSize: '16px' ,
                  fontFamily: 'var(--font-body)',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s, background-color 0.2s'
                }}
                onFocus={e =>
                  e.target.style.borderColor = 'var(--accent)'}
                onBlur={e =>
                  e.target.style.borderColor = 'var(--border)'}
              />

              <button
                onClick={handleChangePassword}
                disabled={
                  changingPassword ||
                  !newPassword ||
                  !confirmPassword
                }
                className="btn-primary"
                style={{
                  padding: '11px',
                  fontSize: '16px' ,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: (changingPassword ||
                    !newPassword || !confirmPassword) ? 0.6 : 1,
                  cursor: changingPassword ? 'not-allowed' : 'pointer'
                }}
              >
                <Shield size={14}/>
                {changingPassword
                  ? 'Updating Password...'
                  : 'Update Password'}
              </button>
            </div>
          </div>

          {/* Sign out */}
          <div className="glass-card" style={{padding: '24px'}}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <p style={{
                  fontSize: '16px' , fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-ui)', marginBottom: '4px'
                }}>Sign Out</p>
                <p style={{
                  fontSize: '14px' ,
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-body)'
                }}>
                  Sign out of your account on this device
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="btn-ghost"
                style={{
                  fontSize: '15px' ,
                  padding: '9px 18px',
                  flexShrink: 0
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DANGER ZONE TAB */}
      {activeTab === 'danger' && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '16px'
        }}>

          {/* Clear search history */}
          <div className="glass-card" style={{
            padding: '24px',
            borderColor: 'rgba(239,68,68,0.15)'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <p style={{
                  fontSize: '16px' , fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-ui)', marginBottom: '4px'
                }}>Clear Search History</p>
                <p style={{
                  fontSize: '14px' ,
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-body)'
                }}>
                  Delete all your search history permanently
                </p>
              </div>
              <button
                onClick={async () => {
                  if (!window.confirm(
                    'Delete all search history? This cannot be undone.'
                  )) return
                  try {
                    await supabase
                      .from('search_history')
                      .delete()
                      .eq('user_id', user.id)
                    toast.success('Search history cleared')
                  } catch (e) {
                    toast.error('Failed: ' + e.message)
                  }
                }}
                style={{
                  padding: '9px 18px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '8px',
                  color: '#ef4444',
                  fontSize: '15px' ,
                  fontFamily: 'var(--font-ui)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background =
                    'rgba(239,68,68,0.2)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background =
                    'rgba(239,68,68,0.1)'
                }}
              >
                <Trash2 size={13}/>
                Clear History
              </button>
            </div>
          </div>

          {/* Clear saved gaps */}
          <div className="glass-card" style={{
            padding: '24px',
            borderColor: 'rgba(239,68,68,0.15)'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <p style={{
                  fontSize: '16px' , fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-ui)', marginBottom: '4px'
                }}>Clear Saved Gaps</p>
                <p style={{
                  fontSize: '14px' ,
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-body)'
                }}>
                  Remove all your bookmarked research gaps
                </p>
              </div>
              <button
                onClick={async () => {
                  if (!window.confirm(
                    'Delete all saved gaps? This cannot be undone.'
                  )) return
                  try {
                    await supabase
                      .from('saved_gaps')
                      .delete()
                      .eq('user_id', user.id)
                    toast.success('Saved gaps cleared')
                  } catch (e) {
                    toast.error('Failed: ' + e.message)
                  }
                }}
                style={{
                  padding: '9px 18px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '8px',
                  color: '#ef4444',
                  fontSize: '15px' ,
                  fontFamily: 'var(--font-ui)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background =
                    'rgba(239,68,68,0.2)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background =
                    'rgba(239,68,68,0.1)'
                }}
              >
                <Trash2 size={13}/>
                Clear Gaps
              </button>
            </div>
          </div>

          {/* Warning note */}
          <div style={{
            padding: '14px 16px',
            background: 'rgba(239,68,68,0.05)',
            border: '1px solid rgba(239,68,68,0.1)',
            borderRadius: '8px',
            fontSize: '14px' ,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-body)',
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <span>
              Actions in the Danger Zone are permanent and
              cannot be undone. Please proceed with caution.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
