import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Activity, Weight, Ruler, Droplets, Heart, Thermometer,
  Gauge, Zap, Calendar, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle2,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Dot,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { getHealthReports } from '../../api/donors';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SpinnerCenter } from '../../components/ui/Spinner';

/* ─── Custom chart tooltip ─────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '0.75rem 1rem',
      fontSize: '0.8125rem',
    }}>
      <div style={{ fontWeight: 700, marginBottom: '0.375rem', color: 'var(--text-secondary)' }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: <span style={{ color: 'var(--text-primary)' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ─── Eligibility badge (existing, unchanged) ─────────────────── */
function EligibilityBadge({ status }) {
  const map = {
    ELIGIBLE:       { variant: 'success', label: 'Eligible' },
    HOLD:           { variant: 'danger',  label: 'On Hold' },
    MEDICAL_REVIEW: { variant: 'info',    label: 'Medical Review' },
    NOT_ELIGIBLE:   { variant: 'neutral', label: 'Not Eligible' },
    PENDING:        { variant: 'warning', label: 'Pending' },
  };
  const { variant, label } = map[status] || { variant: 'neutral', label: status || '—' };
  return <Badge variant={variant}>{label}</Badge>;
}

/* ─── Metric status helpers ───────────────────────────────────── */
function getHemoglobinStatus(v, gender) {
  if (!v) return null;
  const low = gender === 'Female' ? 12 : 13;
  return v >= low && v <= 17.5 ? 'normal' : 'attention';
}
function getBPStatus(sys, dia) {
  if (!sys || !dia) return null;
  return sys >= 90 && sys <= 120 && dia >= 60 && dia <= 80 ? 'normal' : 'attention';
}
function getBMIStatus(bmi) {
  if (!bmi) return null;
  return bmi >= 18.5 && bmi <= 24.9 ? 'normal' : 'attention';
}
function getPulseStatus(p) {
  if (!p) return null;
  return p >= 60 && p <= 100 ? 'normal' : 'attention';
}
function getTempStatus(t) {
  if (!t) return null;
  return t >= 36.1 && t <= 37.2 ? 'normal' : 'attention';
}
function getSugarStatus(s) {
  if (!s) return null;
  return s >= 70 && s <= 99 ? 'normal' : 'attention';
}

function StatusPill({ status }) {
  if (!status) return null;
  return status === 'normal' ? (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
      fontSize: '0.6875rem', fontWeight: 600, color: 'var(--accent-400)',
      background: 'rgba(16,185,129,0.12)', borderRadius: '999px',
      padding: '0.1rem 0.5rem',
    }}>
      <CheckCircle2 size={10} /> Normal
    </span>
  ) : (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
      fontSize: '0.6875rem', fontWeight: 600, color: 'var(--warning-400)',
      background: 'rgba(245,158,11,0.12)', borderRadius: '999px',
      padding: '0.1rem 0.5rem',
    }}>
      <AlertTriangle size={10} /> Attention
    </span>
  );
}

/* ─── Individual metric card ──────────────────────────────────── */
function MetricCard({ icon, label, value, unit, status, accent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--bg-elevated)',
        border: `1px solid ${accent ? 'rgba(99,102,241,0.25)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* subtle top accent line */}
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: 'linear-gradient(90deg, var(--primary-500), var(--primary-400))',
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--primary-400)',
        }}>
          {icon}
        </div>
        <StatusPill status={status} />
      </div>
      <div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>{label}</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
          {value ?? '—'}
          {value != null && unit && (
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
              {unit}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Health Score Trend compact ─────────────────────────────── */
function ScoreTrend({ current, previous }) {
  if (current == null) return null;
  let trend = 'stable';
  let diff = null;
  if (previous != null) {
    if (current > previous + 1) trend = 'improving';
    else if (current < previous - 1) trend = 'declining';
    diff = current - previous;
  }

  const scoreColor = current >= 80
    ? 'var(--accent-400)'
    : current >= 60
    ? 'var(--warning-400)'
    : 'var(--primary-400)';

  const trendConfig = {
    improving: { icon: <TrendingUp size={14} />, label: 'Improving', color: 'var(--accent-400)', bg: 'rgba(16,185,129,0.12)' },
    declining:  { icon: <TrendingDown size={14} />, label: 'Declining', color: 'var(--primary-400)', bg: 'rgba(239,68,68,0.10)' },
    stable:     { icon: <Minus size={14} />, label: 'Stable', color: 'var(--text-muted)', bg: 'var(--bg-surface)' },
  };
  const tc = trendConfig[trend];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
    }}>
      {/* Circle score */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          border: `3px solid ${scoreColor}`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-elevated)',
        }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{current}</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>/100</span>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>Current Score</div>
      </div>

      <div style={{ flex: 1, minWidth: 120 }}>
        {previous != null && (
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Previous: <strong style={{ color: 'var(--text-primary)' }}>{previous}</strong>
            {diff !== null && (
              <span style={{ marginLeft: '0.4rem', color: diff >= 0 ? 'var(--accent-400)' : 'var(--primary-400)', fontWeight: 700 }}>
                ({diff >= 0 ? '+' : ''}{diff})
              </span>
            )}
          </div>
        )}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
          padding: '0.3rem 0.75rem', borderRadius: '999px',
          background: tc.bg, color: tc.color,
          fontSize: '0.8125rem', fontWeight: 700,
        }}>
          {tc.icon} {tc.label}
        </span>
        {previous == null && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            More check-ups will show your trend.
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Metric definitions for trend graph ─────────────────────── */
const TREND_METRICS = [
  { key: 'healthScore',       label: 'Health Score',      unit: '/100',    color: 'var(--primary-400)',    dataKey: (r) => r.healthScore },
  { key: 'weight',            label: 'Weight',            unit: 'kg',      color: '#f59e0b',              dataKey: (r) => r.weight },
  { key: 'hemoglobin',        label: 'Hemoglobin',        unit: 'g/dL',    color: 'var(--accent-400)',    dataKey: (r) => r.hemoglobin },
  { key: 'systolicBP',        label: 'Blood Pressure',    unit: 'mmHg',    color: '#8b5cf6',              dataKey: (r) => r.systolicBP },
  { key: 'pulse',             label: 'Pulse Rate',        unit: 'bpm',     color: '#ef4444',              dataKey: (r) => r.pulse },
  { key: 'temperature',       label: 'Body Temperature',  unit: '°C',      color: '#06b6d4',              dataKey: (r) => r.temperature },
  { key: 'fastingBloodSugar', label: 'Blood Sugar',       unit: 'mg/dL',   color: '#ec4899',              dataKey: (r) => r.fastingBloodSugar },
  { key: 'bmi',               label: 'BMI',               unit: '',        color: '#10b981',              dataKey: (r) => r.bmi },
];

/* ─── Health Trend Graph ──────────────────────────────────────── */
function HealthTrendGraph({ reports }) {
  const [selectedKey, setSelectedKey] = useState('healthScore');

  const metric = TREND_METRICS.find((m) => m.key === selectedKey);

  // Chronological order for graph (oldest first)
  const chronoReports = [...reports].reverse();

  const chartData = chronoReports.map((r) => ({
    date: format(new Date(r.createdAt), 'MMM yy'),
    value: metric.dataKey(r),
  })).filter((d) => d.value != null);

  const hasEnoughData = chartData.length >= 2;

  return (
    <Card style={{ marginBottom: '1.5rem' }}>
      <div style={{ padding: '1.25rem 1.5rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <div className="card-title">Health Trend</div>
            <div className="text-xs text-muted mt-1">Monthly values from your health reports</div>
          </div>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              padding: '0.4rem 0.8rem',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {TREND_METRICS.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {!hasEnoughData ? (
        <div style={{
          padding: '2rem 1.5rem 1.5rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.875rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          {chartData.length === 1 ? (
            <>
              <Activity size={28} style={{ color: 'var(--primary-400)', opacity: 0.6 }} />
              <div>
                <strong style={{ color: 'var(--text-secondary)' }}>{metric.label}: {chartData[0]?.value} {metric.unit}</strong>
              </div>
              <div style={{ maxWidth: 360, lineHeight: 1.6 }}>
                Your health trend will appear as more monthly check-ups are recorded.
              </div>
            </>
          ) : (
            <>
              <Activity size={28} style={{ color: 'var(--primary-400)', opacity: 0.6 }} />
              <div>No data available for this metric yet.</div>
            </>
          )}
        </div>
      ) : (
        <div style={{ padding: '0 0.5rem 1rem' }}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                name={`${metric.label}${metric.unit ? ` (${metric.unit})` : ''}`}
                stroke={metric.color}
                strokeWidth={2.5}
                dot={{ fill: metric.color, r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--bg-elevated)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

/* ─── Main page ───────────────────────────────────────────────── */
export default function HealthReportsPage() {
  const { donor, user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!donor?._id) { setLoading(false); return; }
    getHealthReports(donor._id)
      .then((res) => setReports(res.data.healthReports || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [donor]);

  if (loading) return <SpinnerCenter />;

  // Reports come newest-first from API
  const latest = reports[0] ?? null;
  const previous = reports[1] ?? null;
  const gender = user?.gender;

  // Last blood donation date — from donor record's lastDonationDate or medicalResponses
  const lastDonation = donor?.lastDonationDate
    ? format(new Date(donor.lastDonationDate), 'MMM d, yyyy')
    : latest?.medicalResponses?.lastDonationDate
    ? format(new Date(latest.medicalResponses.lastDonationDate), 'MMM d, yyyy')
    : null;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Health Reports</h1>
        <p className="page-subtitle">Track your health metrics over time</p>
      </div>

      {reports.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Activity size={24} /></div>
            <div className="empty-title">No health reports yet</div>
            <div className="empty-desc">Your health reports will appear here after your first medical check-up appointment.</div>
          </div>
        </div>
      ) : (
        <>
          {/* ── A. Latest Health Metrics ── */}
          <Card style={{ marginBottom: '1.5rem' }}>
            <CardHeader
              title="Latest Health Metrics"
              subtitle={latest ? `From your ${latest.reportType === 'INITIAL' ? 'initial' : latest.reportType === 'MONTHLY' ? 'monthly' : 'follow-up'} check-up on ${format(new Date(latest.createdAt), 'MMMM d, yyyy')}` : ''}
              action={<EligibilityBadge status={latest?.calculatedStatus} />}
            />
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: '0.75rem',
              padding: '0 0 0.25rem',
            }}>
              <MetricCard
                icon={<Weight size={16} />}
                label="Weight"
                value={latest?.weight}
                unit="kg"
              />
              <MetricCard
                icon={<Ruler size={16} />}
                label="Height"
                value={latest?.height}
                unit="cm"
              />
              <MetricCard
                icon={<Gauge size={16} />}
                label="BMI"
                value={latest?.bmi != null ? latest.bmi.toFixed(1) : null}
                status={getBMIStatus(latest?.bmi)}
              />
              <MetricCard
                icon={<Droplets size={16} />}
                label="Hemoglobin"
                value={latest?.hemoglobin}
                unit="g/dL"
                status={getHemoglobinStatus(latest?.hemoglobin, gender)}
              />
              <MetricCard
                icon={<Heart size={16} />}
                label="Blood Pressure"
                value={latest?.systolicBP && latest?.diastolicBP
                  ? `${latest.systolicBP}/${latest.diastolicBP}`
                  : null}
                unit="mmHg"
                status={getBPStatus(latest?.systolicBP, latest?.diastolicBP)}
              />
              <MetricCard
                icon={<Activity size={16} />}
                label="Pulse Rate"
                value={latest?.pulse}
                unit="bpm"
                status={getPulseStatus(latest?.pulse)}
              />
              <MetricCard
                icon={<Thermometer size={16} />}
                label="Body Temperature"
                value={latest?.temperature}
                unit="°C"
                status={getTempStatus(latest?.temperature)}
              />
              <MetricCard
                icon={<Zap size={16} />}
                label="Blood Sugar"
                value={latest?.fastingBloodSugar}
                unit="mg/dL"
                status={getSugarStatus(latest?.fastingBloodSugar)}
              />
              <MetricCard
                icon={<Calendar size={16} />}
                label="Last Blood Donation"
                value={lastDonation ?? 'None on record'}
              />
            </div>
          </Card>

          {/* ── C. Health Score Trend (compact) ── */}
          <Card style={{ marginBottom: '1.5rem' }}>
            <CardHeader title="Health Score" subtitle="Your current screening score" />
            <ScoreTrend
              current={latest?.healthScore}
              previous={previous?.healthScore}
            />
          </Card>

          {/* ── B. Health Trend Graph ── */}
          <HealthTrendGraph reports={reports} />

          {/* ── Report History (unchanged) ── */}
          <Card>
            <CardHeader title="Report History" subtitle={`${reports.length} report${reports.length !== 1 ? 's' : ''} on file`} />
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Health Score</th>
                    <th>Hemoglobin</th>
                    <th>BP (Sys/Dia)</th>
                    <th>Pulse</th>
                    <th>Weight</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <motion.tr
                      key={r._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <td style={{ fontWeight: 600 }}>{format(new Date(r.createdAt), 'MMM d, yyyy')}</td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {r.reportType === 'INITIAL' ? 'Initial' : r.reportType === 'MONTHLY' ? 'Monthly' : 'Follow-up'}
                      </td>
                      <td>
                        <span style={{
                          fontWeight: 800, fontSize: '1rem',
                          color: r.healthScore >= 80 ? 'var(--accent-400)' : r.healthScore >= 60 ? 'var(--warning-400)' : 'var(--primary-400)',
                        }}>
                          {r.healthScore ?? '—'}
                        </span>
                      </td>
                      <td>{r.hemoglobin ? `${r.hemoglobin} g/dL` : '—'}</td>
                      <td>{r.systolicBP && r.diastolicBP ? `${r.systolicBP}/${r.diastolicBP} mmHg` : '—'}</td>
                      <td>{r.pulse ? `${r.pulse} bpm` : '—'}</td>
                      <td>{r.weight ? `${r.weight} kg` : '—'}</td>
                      <td>
                        <EligibilityBadge status={r.calculatedStatus} />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
