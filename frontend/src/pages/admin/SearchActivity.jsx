import { useState, useEffect } from 'react'
import { indexAPI } from '../../lib/api'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
  Cell
} from 'recharts'

export default function SearchActivity() {
  const [dailyData, setDailyData] = useState([])
  const [hourlyData, setHourlyData] = useState([])
  const [topTopics, setTopTopics] = useState([])
  const [totalSearches, setTotalSearches] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await indexAPI.getAdminSearchHistory()
      const searches = res.data || []
      setTotalSearches(searches.length)

      // Daily counts for last 30 days
      const dailyCounts = {}
      const last30 = new Date()
      last30.setDate(last30.getDate() - 30)

      for (let i = 29; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toISOString().split('T')[0]
        dailyCounts[key] = 0
      }

      searches.forEach(s => {
        const day = s.searched_at?.split('T')[0]
        if (day && dailyCounts.hasOwnProperty(day)) {
          dailyCounts[day]++
        }
      })

      setDailyData(Object.entries(dailyCounts).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric'
        }),
        searches: count
      })))

      // Hourly distribution
      const hourlyCounts = Array(24).fill(0)
      searches.forEach(s => {
        if (s.searched_at) {
          const hour = new Date(s.searched_at).getHours()
          hourlyCounts[hour]++
        }
      })
      setHourlyData(hourlyCounts.map((count, hour) => ({
        hour: hour === 0 ? '12am' :
              hour < 12 ? `${hour}am` :
              hour === 12 ? '12pm' :
              `${hour - 12}pm`,
        searches: count
      })))

      // Top topics by search count
      const topicCounts = {}
      searches.forEach(s => {
        const label = s.query || s.topic_slug
        topicCounts[label] = (topicCounts[label] || 0) + 1
      })
      setTopTopics(
        Object.entries(topicCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([topic, count]) => ({ topic, count }))
      )

    } catch (e) {
      console.error('SearchActivity load error:', e)
    } finally {
      setLoading(false)
    }
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '8px', padding: '10px 14px',
        boxShadow: 'var(--shadow-md)'
      }}>
        <p style={{fontSize:'12px', color:'var(--text-secondary)',
          fontFamily:'var(--font-ui)', marginBottom:'4px'}}>
          {label}
        </p>
        <p style={{fontSize:'16px', fontWeight:700,
          color:'var(--text-primary)', fontFamily:'var(--font-display)'}}>
          {payload[0].value} searches
        </p>
      </div>
    )
  }

  if (loading) return (
    <div style={{textAlign:'center', padding:'60px',
      color:'var(--text-tertiary)', fontFamily:'var(--font-ui)'}}>
      Loading search activity...
    </div>
  )

  return (
    <div>
      <div style={{marginBottom:'24px'}}>
        <h1 style={{fontSize:'22px',
          fontFamily:'var(--font-display)', fontWeight:700,
          color:'var(--text-primary)', marginBottom:'4px'}}>
          Search Activity
        </h1>
        <p style={{fontSize:'14px', color:'var(--text-secondary)',
          fontFamily:'var(--font-body)'}}>
          Search patterns across the last 30 days.
          Total: {totalSearches} searches tracked.
        </p>
      </div>

      {/* Daily area chart */}
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:'12px', padding:'24px', marginBottom:'20px'
      }}>
        <h3 style={{fontSize:'14px', fontWeight:600,
          color:'var(--text-primary)', fontFamily:'var(--font-ui)',
          marginBottom:'20px'}}>
          Daily Search Volume (Last 30 Days)
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={dailyData}>
            <defs>
              <linearGradient id="searchGrad" x1="0" y1="0"
                x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)"
                  stopOpacity={0.15}/>
                <stop offset="95%" stopColor="var(--accent)"
                  stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3"
              stroke="var(--border)" vertical={false}/>
            <XAxis dataKey="date"
              tick={{fontSize:11, fill:'var(--text-tertiary)',
                fontFamily:'Cabinet Grotesk'}}
              axisLine={false} tickLine={false}
              interval={4}/>
            <YAxis
              tick={{fontSize:11, fill:'var(--text-tertiary)',
                fontFamily:'Cabinet Grotesk'}}
              axisLine={false} tickLine={false}/>
            <Tooltip content={<CustomTooltip/>}/>
            <Area type="monotone" dataKey="searches"
              stroke="var(--accent)" strokeWidth={2}
              fill="url(#searchGrad)"
              dot={false} activeDot={{r:4, fill:'var(--accent)'}}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Two columns: hourly + top topics */}
      <div style={{
        display:'grid', gridTemplateColumns:'1fr 1fr',
        gap:'20px'
      }}>

        {/* Hourly distribution */}
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:'12px', padding:'24px'
        }}>
          <h3 style={{fontSize:'14px', fontWeight:600,
            color:'var(--text-primary)', fontFamily:'var(--font-ui)',
            marginBottom:'20px'}}>
            Searches by Hour of Day
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3"
                stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="hour"
                tick={{fontSize:9, fill:'var(--text-tertiary)'}}
                axisLine={false} tickLine={false}
                interval={3}/>
              <YAxis tick={{fontSize:10, fill:'var(--text-tertiary)'}}
                axisLine={false} tickLine={false}/>
              <Tooltip
                contentStyle={{
                  background:'var(--bg-card)',
                  border:'1px solid var(--border)',
                  color:'var(--text-primary)',
                  borderRadius:'8px',
                  fontSize:'12px',
                  fontFamily:'Cabinet Grotesk'
                }}/>
              <Bar dataKey="searches" radius={[3,3,0,0]}>
                {hourlyData.map((entry, i) => (
                  <Cell key={i}
                    fill={entry.searches ===
                      Math.max(...hourlyData.map(d => d.searches))
                      ? 'var(--accent)' : 'var(--accent-light)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top searched topics */}
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:'12px', padding:'24px'
        }}>
          <h3 style={{fontSize:'14px', fontWeight:600,
            color:'var(--text-primary)', fontFamily:'var(--font-ui)',
            marginBottom:'16px'}}>
            Most Searched Topics
          </h3>
          <div style={{
            display:'flex', flexDirection:'column', gap:'8px'
          }}>
            {topTopics.map((item, i) => (
              <div key={i}>
                <div style={{
                  display:'flex', justifyContent:'space-between',
                  marginBottom:'4px'
                }}>
                  <span style={{
                    fontSize:'13px', color:'var(--text-secondary)',
                    fontFamily:'var(--font-ui)',
                    textTransform:'capitalize'
                  }}>{item.topic}</span>
                  <span style={{
                    fontSize:'13px', fontWeight:600,
                    color:'var(--accent)', fontFamily:'var(--font-ui)'
                  }}>{item.count}</span>
                </div>
                <div style={{
                  height:'4px', background:'var(--bg-surface)',
                  borderRadius:'2px', overflow:'hidden'
                }}>
                  <div style={{
                    height:'100%',
                    width: `${(item.count /
                      topTopics[0].count) * 100}%`,
                    background: i === 0 ? 'var(--accent)' : 'var(--border-strong)',
                    borderRadius:'2px',
                    transition:'width 0.5s ease'
                  }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
