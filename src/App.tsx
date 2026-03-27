import React, { useState, useEffect } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Users, Activity, Save, TrendingUp } from 'lucide-react';
import { supabase } from './lib/supabase';

const METRICS = [
  { id: 'teamwork', label: 'Team work / Followership' },
  { id: 'attitude', label: 'Attitude / Hou-Ren-Sou' },
  { id: 'autonomy', label: 'Autonomy / Ownership' },
  { id: 'learning', label: 'Willingness to learn' },
  { id: 'devSkill', label: 'Development skill' },
  { id: 'reqAnalysis', label: 'Requirement analysis' },
  { id: 'devSpeed', label: 'Development speed / quality' },
  { id: 'goals', label: 'Self-Directed goals' }
];

interface Member {
  id: string;
  name: string;
  role: string;
  timezone: string;
}

function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const defaultScores = {
    teamwork: 7,
    attitude: 8,
    autonomy: 6,
    learning: 9,
    devSkill: 7,
    reqAnalysis: 6,
    devSpeed: 8,
    goals: 7
  };

  const [scores, setScores] = useState<Record<string, number>>(defaultScores);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase.from('members').select('*').order('name');
      if (error) {
        console.error('Error fetching members:', error);
      } else if (data && data.length > 0) {
        setMembers(data);
        setActiveMemberId(data[0].id);
      }
    };
    fetchMembers();
  }, []);

  useEffect(() => {
    if (!activeMemberId) return;

    const fetchLatestEvaluation = async () => {
      // First restore to default while waiting for DB (prevents data bleed)
      setScores({
        teamwork: 7, attitude: 8, autonomy: 6, learning: 9, 
        devSkill: 7, reqAnalysis: 6, devSpeed: 8, goals: 7
      });
      setNotes('');

      const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .eq('member_id', activeMemberId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const latest = data[0];
        setScores({
          teamwork: latest.teamwork,
          attitude: latest.attitude,
          autonomy: latest.autonomy,
          learning: latest.learning,
          devSkill: latest.dev_skill,
          reqAnalysis: latest.req_analysis,
          devSpeed: latest.dev_speed,
          goals: latest.goals
        });
        setNotes(latest.notes || '');
      }
    };

    fetchLatestEvaluation();
  }, [activeMemberId]);

  const handleMemberChange = (id: string) => {
    setActiveMemberId(id);
  };

  const activeMember = members.find(m => m.id === activeMemberId);

  if (!activeMember) return <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}><h2>Loading Team...</h2><p style={{color: 'var(--text-muted)'}}>Have you set up the 'members' table in Supabase?</p></div>;

  // Transform scores for the Radar Chart
  const chartData = METRICS.map(m => ({
    subject: m.label.split('/')[0], // Shorten name for chart
    A: scores[m.id],
    fullMark: 10,
  }));

  // Dummy trend data
  const trendData = [
    { name: 'Week 1', score: 6.5 },
    { name: 'Week 2', score: 6.8 },
    { name: 'Week 3', score: 7.2 },
    { name: 'Week 4', score: Math.round((Object.values(scores).reduce((a, b) => a + b, 0) / 8) * 10) / 10 },
  ];

  const handleScoreChange = (id: string, value: number) => {
    setScores(prev => ({ ...prev, [id]: value }));
  };

  const currentAverage = (Object.values(scores).reduce((a, b) => a + b, 0) / 8).toFixed(1);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('evaluations').insert([
        {
          member_id: activeMemberId,
          teamwork: scores.teamwork,
          attitude: scores.attitude,
          autonomy: scores.autonomy,
          learning: scores.learning,
          dev_skill: scores.devSkill,
          req_analysis: scores.reqAnalysis,
          dev_speed: scores.devSpeed,
          goals: scores.goals,
          notes: notes
        }
      ]);

      if (error) throw error;
      alert('Evaluation saved successfully!');
      setNotes('');
    } catch (err: any) {
      console.error('Error saving evaluation:', err.message);
      alert('Failed to save evaluation.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container">
      <header className="header-bar">
        <div className="app-title">
          <Activity size={32} />
          <h2>TeamPulse Validation</h2>
        </div>
        <div>
          <button className="btn-outline flex items-center gap-2" style={{ gap: '0.5rem' }}>
            <Users size={18} />
            {members.length} Members in Database
          </button>
        </div>
      </header>

      <div className="dashboard-layout">
        {/* Sidebar: Team Members */}
        <div className="glass-panel member-list">
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Team Directory</h3>
          {members.map(member => (
            <div
              key={member.id}
              className={`member-item ${activeMemberId === member.id ? 'active' : ''}`}
              onClick={() => handleMemberChange(member.id)}
            >
              <div className="avatar">
                {member.name.charAt(0)}
              </div>
              <div className="member-info">
                <h4>{member.name}</h4>
                <p>{member.role}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="main-content">

          {/* Top Span: Header of active member */}
          <div className="glass-panel full-width flex justify-between items-center">
            <div>
              <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{activeMember?.name}</h1>
              <p style={{ color: 'var(--text-muted)' }}>{activeMember?.role} &bull; Timezone: {activeMember?.timezone}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Current Average</p>
              <h2 style={{ fontSize: '2.5rem', color: 'var(--accent-color)' }}>{currentAverage}<span style={{ fontSize: '1rem', color: "var(--text-muted)" }}>/10</span></h2>
            </div>
          </div>

          {/* Radar Chart */}
          <div className="glass-panel" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '1rem' }}>Skill Overview</h3>
            <div style={{ width: '100%', height: '320px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: 'transparent' }} axisLine={false} />
                  <Radar
                    name="Performance"
                    dataKey="A"
                    stroke="var(--primary-color)"
                    fill="var(--primary-color)"
                    fillOpacity={0.5}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-main)', border: 'var(--glass-border)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--primary-color)' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trend Line Chart */}
          <div className="glass-panel" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
              <h3>Performance Trend</h3>
              <TrendingUp size={20} color="var(--accent-color)" />
            </div>
            <div style={{ width: '100%', height: '320px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 10]} stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-main)', border: 'var(--glass-border)', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="var(--accent-color)" strokeWidth={3} dot={{ r: 6, fill: 'var(--bg-main)', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Evaluation Form */}
          <div className="glass-panel full-width">
            <h3 style={{ marginBottom: '1.5rem' }}>Weekly Evaluation Form</h3>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>

              {/* Sliders Input */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', gridColumn: '1 / -1' }}>
                {METRICS.map(metric => (
                  <div key={metric.id} className="metric-row">
                    <div className="metric-header">
                      <label className="form-label" style={{ marginBottom: 0 }}>{metric.label}</label>
                      <span className="metric-value">{scores[metric.id]} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={scores[metric.id]}
                      onChange={(e) => handleScoreChange(metric.id, parseInt(e.target.value))}
                    />
                  </div>
                ))}
              </div>

              {/* Notes & Submit */}
              <div className="full-width">
                <div className="form-group">
                  <label className="form-label">Weekly Notes / Feedback</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    placeholder="Enter specific examples, improvements seen, or areas of concern..."
                    style={{ resize: 'vertical' }}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  ></textarea>
                </div>
                <div className="flex justify-between items-center" style={{ marginTop: '1.5rem' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Data will be synced to Supabase</p>
                  <button 
                    className="btn-primary flex items-center gap-2" 
                    style={{ gap: '0.5rem' }}
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    <Save size={18} />
                    {isSaving ? 'Saving...' : 'Save Evaluation'}
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;
