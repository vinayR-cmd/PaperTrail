import { useState, useEffect } from 'react'
import { indexAPI } from '../../lib/api'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

export default function UserGrowth() {
  const [users, setUsers] = useState([])
  const [dailySignups, setDailySignups] = useState([])
  const [activityData, setActivityData] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      // All users from admin endpoint
      const usersRes = await indexAPI.getAdminProfiles()
      const allUsers = usersRes.data || []
      setUsers(allUsers)

      // Daily signups last 30 days
      const dailyCounts = {}
      for (let i = 29; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toISOString().split('T')[0]
        dailyCounts[key] = 0
      }

      allUsers.forEach(u => {
        const day = u.created_at?.split('T')[0]
        if (day && dailyCounts.hasOwnProperty(day)) {
          dailyCounts[day]++
        }
      })

      // Cumulative signups
      let cumulative = allUsers.filter(u => {
        const d = new Date(u.created_at)
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 30)
        return d < cutoff
      }).length

      const dailyArr = Object.entries(dailyCounts).map(
        ([date, count]) => {
          cumulative += count
          return {
            date: new Date(date).toLocaleDateString('en-US', {
              month:'short', day:'numeric'
            }),
            newUsers: count,
            total: cumulative
          }
        }
      )
      setDailySignups(dailyArr)

      // Activity per user (searches) from admin endpoint
      const searchRes = await indexAPI.getAdminSearchHistory()
      const searchCounts = {}
      searchRes.data?.forEach(s => {
        searchCounts[s.user_id] =
          (searchCounts[s.user_id] || 0) + 1
      })

      // Saved gaps per user from admin endpoint
      const savedRes = await indexAPI.getAdminSavedGaps()
      const savedCounts = {}
      savedRes.data?.forEach(s => {
        savedCounts[s.user_id] =
          (savedCounts[s.user_id] || 0) + 1
      })

      // Activity buckets
      const buckets = [
        { label:'Power (10+)', count:0 },
        { label:'Active (5-9)', count:0 },
        { label:'Casual (2-4)', count:0 },
        { label:'Once (1)', count:0 },
        { label:'Never', count:0 },
      ]

      allUsers.forEach(u => {
        const s = searchCounts[u.id] || 0
        if (s >= 10) buckets[0].count++
        else if (s >= 5) buckets[1].count++
        else if (s >= 2) buckets[2].count++
        else if (s === 1) buckets[3].count++
        else buckets[4].count++
      })

      setActivityData(buckets)

      // Active users (searched in last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const activeUserIds = new Set(
        (searchRes.data || [])
          .filter(s => new Date(s.searched_at) >= sevenDaysAgo)
          .map(s => s.user_id)
      )

      setStats({
        total: allUsers.length,
        active7d: activeUserIds.size,
        admins: allUsers.filter(u => u.is_admin).length,
        avgSearches: allUsers.length > 0
          ? Math.round(
              Object.values(searchCounts)
                .reduce((a, b) => a + b, 0) /
              allUsers.length * 10
            ) / 10
          : 0,
        totalSaved: Object.values(savedCounts)
          .reduce((a, b) => a + b, 0)
      })

    } catch (e) {
      console.error('UserGrowth error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{textAlign:'center', padding:'60px',
      color:'var(--text-tertiary)', fontFamily:'var(--font-ui)'}}>
      Loading user data...
    </div>
  )

  return (
    <div>
      <div style={{marginBottom:'24px'}}>
        <h1 style={{fontSize:'22px',
          fontFamily:'var(--font-display)', fontWeight:700,
          color:'var(--text-primary)', marginBottom:'4px'}}>
          User Growth
        </h1>
        <p style={{fontSize:'14px', color:'var(--text-secondary)',
          fontFamily:'var(--font-body)'}}>
          User registration trends and engagement metrics.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(5,1fr)',
          gap:'14px', marginBottom:'24px'
        }}>
          {[
            { label:'Total Users', value:stats.total,
              color:'var(--accent)' },
            { label:'Active (7d)', value:stats.active7d,
              color:'var(--success)' },
            { label:'Avg Searches/User',
              value:stats.avgSearches, color:'var(--warning)' },
            { label:'Total Saves', value:stats.totalSaved,
              color:'var(--accent)' },
            { label:'Admins', value:stats.admins,
              color:'var(--text-primary)' },
          ].map((s, i) => (
            <div key={i} style={{
              background:'var(--bg-card)', border:'1px solid var(--border)',
              borderRadius:'10px', padding:'16px'
            }}>
              <p style={{fontSize:'24px', fontWeight:700,
                color: s.color,
                fontFamily:'var(--font-display)',
                marginBottom:'4px'}}>{s.value}</p>
              <p style={{fontSize:'12px', color:'var(--text-secondary)',
                fontFamily:'var(--font-ui)'}}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{
        display:'grid', gridTemplateColumns:'2fr 1fr',
        gap:'20px', marginBottom:'20px'
      }}>
        {/* Growth chart */}
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:'12px', padding:'24px'
        }}>
          <h3 style={{fontSize:'14px', fontWeight:600,
            color:'var(--text-primary)', fontFamily:'var(--font-ui)',
            marginBottom:'20px'}}>
            User Growth (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailySignups}>
              <defs>
                <linearGradient id="userGrad"
                  x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)"
                    stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="var(--accent)"
                    stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3"
                stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="date"
                tick={{fontSize:10, fill:'var(--text-tertiary)'}}
                axisLine={false} tickLine={false}
                interval={6}/>
              <YAxis tick={{fontSize:10, fill:'var(--text-tertiary)'}}
                axisLine={false} tickLine={false}/>
              <Tooltip
                contentStyle={{
                  background:'var(--bg-card)',
                  border:'1px solid var(--border)',
                  color:'var(--text-primary)',
                  borderRadius:'8px', fontSize:'12px'
                }}/>
              <Area type="monotone" dataKey="newUsers"
                name="New Users"
                stroke="var(--accent)" strokeWidth={2}
                fill="url(#userGrad)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Activity segments */}
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:'12px', padding:'24px'
        }}>
          <h3 style={{fontSize:'14px', fontWeight:600,
            color:'var(--text-primary)', fontFamily:'var(--font-ui)',
            marginBottom:'16px'}}>
            Engagement Segments
          </h3>
          <div style={{
            display:'flex', flexDirection:'column', gap:'10px'
          }}>
            {activityData.map((seg, i) => (
              <div key={i}>
                <div style={{
                  display:'flex',
                  justifyContent:'space-between',
                  marginBottom:'4px'
                }}>
                  <span style={{fontSize:'13px',
                    color:'var(--text-secondary)',
                    fontFamily:'var(--font-ui)'}}>
                    {seg.label}
                  </span>
                  <span style={{fontSize:'13px',
                    fontWeight:600, color:'var(--accent)',
                    fontFamily:'var(--font-ui)'}}>
                    {seg.count}
                  </span>
                </div>
                <div style={{height:'6px',
                  background:'var(--bg-surface)', borderRadius:'3px',
                  overflow:'hidden'}}>
                  <div style={{
                    height:'100%',
                    width: users.length > 0
                      ? `${(seg.count/users.length)*100}%`
                      : '0%',
                    background: i === 0 ? 'var(--accent)' :
                                i === 1 ? 'var(--accent-hover)' :
                                i === 2 ? 'var(--border-strong)' :
                                i === 3 ? 'var(--border)' : 'var(--bg-surface)',
                    borderRadius:'3px'
                  }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User table */}
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:'12px', overflow:'hidden'
      }}>
        <div style={{
          padding:'16px 20px',
          borderBottom:'1px solid var(--border)'
        }}>
          <h3 style={{fontSize:'14px', fontWeight:600,
            color:'var(--text-primary)', fontFamily:'var(--font-ui)'}}>
            All Users ({users.length})
          </h3>
        </div>
        <table style={{width:'100%',
          borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'var(--bg-surface)'}}>
              {['User','Name','Joined','Role'].map((h,i) => (
                <th key={i} style={{
                  padding:'10px 16px', textAlign:'left',
                  fontSize:'11px', fontWeight:700,
                  color:'var(--text-tertiary)', fontFamily:'var(--font-ui)',
                  textTransform:'uppercase',
                  letterSpacing:'0.08em',
                  borderBottom:'1px solid var(--border)'
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={i}
                style={{borderBottom:'1px solid var(--border)'}}
                onMouseEnter={e =>
                  e.currentTarget.style.background = 'var(--bg-surface)'}
                onMouseLeave={e =>
                  e.currentTarget.style.background = 'var(--bg-card)'}
              >
                <td style={{padding:'12px 16px'}}>
                  <div style={{
                    display:'flex', alignItems:'center',
                    gap:'10px'
                  }}>
                    <div style={{
                      width:'32px', height:'32px',
                      borderRadius:'50%',
                      background:'var(--accent-light)',
                      display:'flex', alignItems:'center',
                      justifyContent:'center',
                      fontSize:'13px', fontWeight:700,
                      color:'var(--accent)', flexShrink:0
                    }}>
                      {u.email?.[0]?.toUpperCase()}
                    </div>
                    <span style={{fontSize:'13px',
                      color:'var(--text-primary)',
                      fontFamily:'var(--font-ui)'}}>
                      {u.email}
                    </span>
                  </div>
                </td>
                <td style={{padding:'12px 16px',
                  fontSize:'13px', color:'var(--text-secondary)',
                  fontFamily:'var(--font-ui)'}}>
                  {u.full_name || '—'}
                </td>
                <td style={{padding:'12px 16px',
                  fontSize:'12px', color:'var(--text-tertiary)',
                  fontFamily:'var(--font-ui)'}}>
                  {u.created_at
                    ? new Date(u.created_at)
                        .toLocaleDateString('en-US', {
                          month:'short', day:'numeric',
                          year:'numeric'
                        })
                    : '—'}
                </td>
                <td style={{padding:'12px 16px'}}>
                  {u.is_admin ? (
                    <span style={{
                      fontSize:'11px', fontWeight:600,
                      padding:'2px 10px', borderRadius:'99px',
                      background:'var(--accent-light)',
                      color:'var(--accent)',
                      border:'1px solid var(--border-strong)',
                      fontFamily:'var(--font-ui)'
                    }}>Admin</span>
                  ) : (
                    <span style={{
                      fontSize:'11px', color:'var(--text-tertiary)',
                      fontFamily:'var(--font-ui)'
                    }}>User</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
