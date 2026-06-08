import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { indexAPI } from '../lib/api'
import StatsRow from '../components/dashboard/StatsRow'
import RecentSearches from '../components/dashboard/RecentSearches'
import SavedGapsList from '../components/dashboard/SavedGapsList'
import QuickActions from '../components/dashboard/QuickActions'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [searchHistory, setSearchHistory] = useState([])
  const [savedGaps, setSavedGaps] = useState([])
  const [indexedTopics, setIndexedTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('overview')

  useEffect(() => {
    if (user) loadAll()
  }, [user])

  async function loadAll() {
    setLoading(true)
    try {
      const [historyRes, gapsRes, topicsRes] = await Promise.all([
        supabase
          .from('search_history')
          .select('*')
          .eq('user_id', user.id)
          .order('searched_at', { ascending: false }),
        supabase
          .from('saved_gaps')
          .select('*')
          .eq('user_id', user.id)
          .order('saved_at', { ascending: false }),
        indexAPI.listTopics()
      ])
      setSearchHistory(historyRes.data || [])
      setSavedGaps(gapsRes.data || [])
      setIndexedTopics(topicsRes.data || [])
    } catch (e) {
      console.error('Dashboard load error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function unsaveGap(gapId) {
    await supabase
      .from('saved_gaps')
      .delete()
      .eq('id', gapId)
      .eq('user_id', user.id)
    setSavedGaps(prev => prev.filter(g => g.id !== gapId))
  }

  async function deleteSearchHistory(historyId) {
    await supabase
      .from('search_history')
      .delete()
      .eq('id', historyId)
      .eq('user_id', user.id)
    setSearchHistory(prev => prev.filter(h => h.id !== historyId))
  }

  const displayName = profile?.full_name ||
    user?.email?.split('@')[0] || 'Researcher'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' : 'Good evening'

  const stats = {
    searches: searchHistory.length,
    savedGaps: savedGaps.length,
    topics: indexedTopics.length,
    uniqueTopics: [...new Set(searchHistory.map(h => h.topic_slug))].length
  }

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'history', label: `Searches (${stats.searches})` },
    { id: 'saved', label: `Saved Gaps (${stats.savedGaps})` },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-surface)',
      paddingTop: '60px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 40px'
      }}>
        {/* Greeting Header */}
        <div style={{ marginBottom: '32px' }}>
          <p style={{
            fontSize: '14px' ,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-ui)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}>{greeting}</p>
          <h1 style={{
            fontSize: '32px' ,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '6px',
            lineHeight: 1.2
          }}>
            Welcome back,{' '}
            <span style={{ color: 'var(--accent)' }}>{displayName}</span>
          </h1>
          <p style={{
            fontSize: '17px' ,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)',
            marginBottom: '32px'
          }}>Your research intelligence hub</p>
        </div>

        <StatsRow stats={stats} loading={loading} />
        <QuickActions navigate={navigate} />

        {/* Section Tabs */}
        <div style={{
          display: 'flex', gap: '4px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px', padding: '4px',
          marginBottom: '24px', width: 'fit-content'
        }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              style={{
                padding: '8px 16px', borderRadius: '7px', border: 'none',
                background: activeSection === tab.id
                  ? 'var(--bg-card)' : 'transparent',
                color: activeSection === tab.id
                  ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeSection === tab.id
                  ? 'var(--shadow-sm)' : 'none',
                fontSize: '15px' , fontFamily: 'var(--font-ui)',
                fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.2s', outline: 'none', whiteSpace: 'nowrap'
              }}
            >{tab.label}</button>
          ))}
        </div>

        {/* Section Content */}
        {activeSection === 'overview' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px'
          }}>
            <RecentSearches
              history={searchHistory.slice(0, 5)}
              loading={loading}
              navigate={navigate}
              onDelete={deleteSearchHistory}
              showAll={() => setActiveSection('history')}
            />
            <SavedGapsList
              gaps={savedGaps.slice(0, 5)}
              loading={loading}
              navigate={navigate}
              onUnsave={unsaveGap}
              showAll={() => setActiveSection('saved')}
            />
          </div>
        )}

        {activeSection === 'history' && (
          <RecentSearches
            history={searchHistory}
            loading={loading}
            navigate={navigate}
            onDelete={deleteSearchHistory}
            fullView
          />
        )}

        {activeSection === 'saved' && (
          <SavedGapsList
            gaps={savedGaps}
            loading={loading}
            navigate={navigate}
            onUnsave={unsaveGap}
            fullView
          />
        )}
      </div>
    </div>
  )
}
