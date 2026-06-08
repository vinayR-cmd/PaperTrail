import { useEffect, useState } from 'react'
import { indexAPI } from '../../lib/api'

export default function AdminOverview() {
  const [stats, setStats] = useState({ users: 0, gaps: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await indexAPI.getAdminOverviewStats()
        
        setStats({ 
          users: res.data?.users || 0, 
          gaps: res.data?.gaps || 0 
        })
      } catch (err) {
        console.error('Error loading admin stats:', err)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  return (
    <div>
      <h1 style={{ 
        fontSize: '28px', 
        fontWeight: 700, 
        marginBottom: '8px',
        fontFamily: 'var(--font-display)',
        color: 'var(--text-primary)'
      }}>
        Overview
      </h1>
      <p style={{ 
        color: 'var(--text-secondary)', 
        marginBottom: '32px',
        fontSize: '16px'
      }}>
        System health and high-level metrics.
      </p>

      {loading ? (
        <div style={{ color: 'var(--text-secondary)' }}>Loading metrics...</div>
      ) : (
        <div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: '24px',
            marginBottom: '32px'
          }}>
            {/* Users Stat */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h3 style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '14px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '12px'
              }}>Total Users</h3>
              <div style={{ 
                fontSize: '36px', 
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-display)'
              }}>
                {stats.users}
              </div>
            </div>

            {/* Gaps Stat */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h3 style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '14px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '12px'
              }}>Saved Gaps</h3>
              <div style={{ 
                fontSize: '36px', 
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-display)'
              }}>
                {stats.gaps}
              </div>
            </div>
          </div>

          {/* Vector Database Status */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '14px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '16px'
            }}>Vector Database Status (Supabase pgvector)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Collection Name</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px' }}>paper_embeddings (pgvector)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Status</span>
                <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '14px' }}>Persistent · Survives restarts · 384 dimensions</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
