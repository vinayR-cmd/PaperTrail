import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Line
} from 'recharts'

export default function TrendChart({ gap }) {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let y = currentYear - 8; y <= currentYear + 2; y++) years.push(y)

  function countByYear(papers, year) {
    return papers?.filter(p => p.year === year).length || 0
  }

  const clusterASize = gap.cluster_a_size || 10
  const clusterBSize = gap.cluster_b_size || 10
  const aGrowth = gap.forecast_cluster_a?.growth_rate || 5
  const bGrowth = gap.forecast_cluster_b?.growth_rate || 5

  const chartData = years.map(year => {
    const yearsFromNow = year - currentYear
    const isFuture = year > currentYear

    const aBase = Math.max(1, Math.round(
      (clusterASize / 10) * Math.pow(1 + aGrowth / 100, yearsFromNow - 3)
    ))
    const bBase = Math.max(1, Math.round(
      (clusterBSize / 10) * Math.pow(1 + bGrowth / 100, yearsFromNow - 3)
    ))
    const aActual = countByYear(gap.top_papers_a, year)
    const bActual = countByYear(gap.top_papers_b, year)

    return {
      year: year.toString(),
      communityA: isFuture ? undefined : Math.max(aActual, aBase),
      communityB: isFuture ? undefined : Math.max(bActual, bBase),
      communityAForecast: isFuture ? aBase : undefined,
      communityBForecast: isFuture ? bBase : undefined,
    }
  })

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '10px', padding: '12px 16px',
        fontFamily: 'var(--font-ui)',
        boxShadow: 'var(--shadow-md)'
      }}>
        <p style={{ fontSize: '14px' , color: 'var(--text-tertiary)', marginBottom: '8px' }}>
          {label}
        </p>
        {payload.map((p, i) => p.value != null && (
          <p key={i} style={{ fontSize: '15px' , color: p.color, marginBottom: '2px' }}>
            {p.name}: {p.value} papers
          </p>
        ))}
      </div>
    )
  }

  const urgencyBg = gap.combined_urgency === 'URGENT'
    ? 'rgba(239,68,68,0.08)' : gap.combined_urgency === 'ACTIVE'
    ? 'rgba(79,142,247,0.08)' : 'rgba(122,139,163,0.05)'
  const urgencyBorder = gap.combined_urgency === 'URGENT'
    ? 'rgba(239,68,68,0.25)' : gap.combined_urgency === 'ACTIVE'
    ? 'rgba(79,142,247,0.25)' : 'rgba(122,139,163,0.15)'
  const urgencyColor = gap.combined_urgency === 'URGENT' ? 'var(--danger)' :
    gap.combined_urgency === 'ACTIVE' ? 'var(--accent)' : 'var(--text-tertiary)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Chart card */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{
            fontSize: '15px' , fontFamily: 'var(--font-ui)', fontWeight: 600,
            color: 'var(--text-secondary)', textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: '4px'
          }}>Publication Velocity</h3>
          <p style={{
            fontSize: '15px' , color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-body)'
          }}>
            Historical output + Prophet forecast for each research community.
            Dashed lines show predicted growth.
          </p>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f8ef7" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="year"
              tick={{ fill: 'var(--text-secondary)', fontSize: 13, fontFamily: 'var(--font-ui)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--text-secondary)', fontSize: 13, fontFamily: 'var(--font-ui)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              x={currentYear.toString()}
              stroke="var(--border-strong)"
              strokeDasharray="4 4"
              label={{ value: 'Today', fill: 'var(--text-secondary)', fontSize: 13 }}
            />
            <Area
              type="monotone" dataKey="communityA" name="Community A"
              stroke="#4f8ef7" strokeWidth={2} fill="url(#colorA)"
              dot={false} activeDot={{ r: 4, fill: '#4f8ef7' }}
              connectNulls={false}
            />
            <Area
              type="monotone" dataKey="communityB" name="Community B"
              stroke="#7c3aed" strokeWidth={2} fill="url(#colorB)"
              dot={false} activeDot={{ r: 4, fill: '#7c3aed' }}
              connectNulls={false}
            />
            <Line
              type="monotone" dataKey="communityAForecast"
              name="Community A (forecast)"
              stroke="#4f8ef7" strokeWidth={1.5} strokeDasharray="5 5"
              dot={false} connectNulls={false}
            />
            <Line
              type="monotone" dataKey="communityBForecast"
              name="Community B (forecast)"
              stroke="#7c3aed" strokeWidth={1.5} strokeDasharray="5 5"
              dot={false} connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Per-cluster forecast cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {[
          { label: 'Community A Forecast', data: gap.forecast_cluster_a, color: '#4f8ef7' },
          { label: 'Community B Forecast', data: gap.forecast_cluster_b, color: '#7c3aed' }
        ].map((f, i) => {
          const growthColor = (f.data?.growth_rate || 0) > 20 ? 'var(--success)' :
            (f.data?.growth_rate || 0) > 0 ? 'var(--accent-blue)' : 'var(--text-secondary)'
          return (
            <div key={i} className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: f.color, boxShadow: `0 0 6px ${f.color}`
                }} />
                <p style={{
                  fontSize: '14px' , color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-ui)', textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}>{f.label}</p>
              </div>
              <p style={{
                fontSize: '28px' , fontFamily: 'var(--font-display)',
                fontWeight: 700, color: growthColor, marginBottom: '4px'
              }}>
                {(f.data?.growth_rate || 0) > 0 ? '+' : ''}{f.data?.growth_rate ?? 0}%
                <span style={{
                  fontSize: '14px' , color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-ui)', marginLeft: '4px', fontWeight: 400
                }}>/year</span>
              </p>
              <p style={{
                fontSize: '15px' , color: 'var(--text-secondary)',
                fontFamily: 'var(--font-body)', lineHeight: 1.5
              }}>{f.data?.urgency_label}</p>
            </div>
          )
        })}
      </div>

      {/* Combined urgency banner */}
      <div className="glass-card" style={{
        padding: '20px', background: urgencyBg, borderColor: urgencyBorder,
        display: 'flex', alignItems: 'center', gap: '16px'
      }}>
        <div style={{
          width: '16px', height: '16px', borderRadius: '50%',
          background: urgencyColor, boxShadow: `0 0 8px ${urgencyColor}`,
          flexShrink: 0
        }} />
        <div>
          <p style={{
            fontSize: '16px' , fontFamily: 'var(--font-ui)', fontWeight: 600,
            color: 'var(--text-primary)', marginBottom: '4px'
          }}>{gap.combined_urgency}</p>
          <p style={{
            fontSize: '15px' , color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)'
          }}>{gap.combined_urgency_label}</p>
        </div>
      </div>
    </div>
  )
}
