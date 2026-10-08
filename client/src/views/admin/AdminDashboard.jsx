import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { 
  Users, 
  FileText, 
  Clock, 
  CheckCircle, 
  Award, 
  Send, 
  TrendingUp, 
  Download, 
  ArrowRight,
  ShieldAlert,
  Layers,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

export function AdminDashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/results/dashboard-stats');
      setStats(res);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="page-container"><p>Gathering Platform Telemetry...</p></div>;
  }

  return (
    <div className="page-container">
      
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--google-red)', textTransform: 'uppercase' }}>
              Command Center
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>System Engine Active</span>
          </div>
          <h1 style={{ fontSize: '1.85rem' }}>Agent Forge Administration</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Real-time competition supervision, participant intake, jury evaluation governance, and result publication.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={() => onNavigate('import-export')}>
            <FileSpreadsheet size={15} /> Export Master Excel
          </button>
          <button className="btn btn-blue" onClick={() => onNavigate('results')}>
            <Award size={15} /> Manage Results & Rankings
          </button>
        </div>
      </div>

      {/* Result Publication Status Strip */}
      <div className="forge-card" style={{ marginBottom: '24px', borderLeft: stats?.isGlobalPublished ? '4px solid var(--google-green)' : '4px solid var(--google-yellow-dark)' }}>
        <div className="forge-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {stats?.isGlobalPublished ? (
              <CheckCircle size={24} style={{ color: 'var(--google-green)' }} />
            ) : (
              <ShieldAlert size={24} style={{ color: 'var(--google-yellow-dark)' }} />
            )}
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>
                {stats?.isGlobalPublished ? 'Official Results: Live & Published to Participants' : 'Official Results: Unpublished (Locked from Participants)'}
              </h3>
              <p style={{ fontSize: '0.84rem' }}>
                {stats?.isGlobalPublished ? (
                  'Participants can view their score breakdown, individual rank, jury comments, and download official PDF scorecards.'
                ) : (
                  'Jury marks are strictly protected from participant visibility. Review scores in Results Preview before publishing.'
                )}
              </p>
            </div>
          </div>

          <button className={`btn btn-sm ${stats?.isGlobalPublished ? 'btn-outline' : 'btn-green'}`} onClick={() => onNavigate('results')}>
            {stats?.isGlobalPublished ? 'Review Published Rankings' : 'Open Publication Console'}
          </button>
        </div>
      </div>

      {/* 6 Primary Overview KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-border-blue">
          <div className="kpi-card-top">
            <span className="kpi-label">Total Participants</span>
            <Users size={18} style={{ color: 'var(--google-blue)' }} />
          </div>
          <div className="kpi-val">{stats?.totalParticipants || 0}</div>
          <div className="kpi-sub">Active registered competitors</div>
        </div>

        <div className="kpi-card kpi-border-blue">
          <div className="kpi-card-top">
            <span className="kpi-label">Total Submissions</span>
            <FileText size={18} style={{ color: 'var(--google-blue)' }} />
          </div>
          <div className="kpi-val">{stats?.totalSubmissions || 0}</div>
          <div className="kpi-sub">{stats?.submissionCompletionPct || 0}% intake completion</div>
        </div>

        <div className="kpi-card kpi-border-yellow">
          <div className="kpi-card-top">
            <span className="kpi-label">Under Review</span>
            <Clock size={18} style={{ color: 'var(--google-yellow-dark)' }} />
          </div>
          <div className="kpi-val">{stats?.underReviewCount || 0}</div>
          <div className="kpi-sub">In jury review queues</div>
        </div>

        <div className="kpi-card kpi-border-green">
          <div className="kpi-card-top">
            <span className="kpi-label">Evaluated</span>
            <CheckCircle size={18} style={{ color: 'var(--google-green)' }} />
          </div>
          <div className="kpi-val">{stats?.evaluatedCount || 0}</div>
          <div className="kpi-sub">{stats?.juryCompletionPct || 0}% jury progress</div>
        </div>

        <div className="kpi-card kpi-border-red">
          <div className="kpi-card-top">
            <span className="kpi-label">Average Score</span>
            <TrendingUp size={18} style={{ color: 'var(--google-red)' }} />
          </div>
          <div className="kpi-val">{stats?.avgScore || 0}</div>
          <div className="kpi-sub">Spread: {stats?.lowestScore || 0} to {stats?.highestScore || 0} pts</div>
        </div>

        <div className="kpi-card kpi-border-green">
          <div className="kpi-card-top">
            <span className="kpi-label">Highest Score</span>
            <Award size={18} style={{ color: 'var(--google-green)' }} />
          </div>
          <div className="kpi-val">{stats?.highestScore || 0}</div>
          <div className="kpi-sub">Leaderboard top mark /50</div>
        </div>
      </div>

      {/* Operational Workflows Hub */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Participant Management Card */}
        <div className="forge-card">
          <div className="forge-card-header">
            <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} style={{ color: 'var(--google-blue)' }} /> Participant Operations
            </h3>
            <span className="status-badge status-submitted">{stats?.totalParticipants} ENROLLED</span>
          </div>
          <div className="forge-card-body">
            <p style={{ fontSize: '0.88rem', marginBottom: '16px' }}>
              Add participants manually, reset passkeys, or bulk import official college registers from Excel (.xlsx) with automatic prefix passkey derivation.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-outline-blue btn-sm" onClick={() => onNavigate('participants')}>
                Manage Participants
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('import-export')}>
                Bulk Excel Intake
              </button>
            </div>
          </div>
        </div>

        {/* Jury Management Card */}
        <div className="forge-card">
          <div className="forge-card-header">
            <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} style={{ color: 'var(--google-green)' }} /> Jury Evaluation Panel
            </h3>
            <span className="status-badge status-evaluated">{stats?.pendingEvaluations} PENDING</span>
          </div>
          <div className="forge-card-body">
            <p style={{ fontSize: '0.88rem', marginBottom: '16px' }}>
              Monitor jury member progress, inspect individual criterion scores (10 pts each), assign case studies, or unlock evaluations for revisions.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-outline-blue btn-sm" onClick={() => onNavigate('jury')}>
                Jury Roster & Progress
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('submissions')}>
                Inspect Submissions
              </button>
            </div>
          </div>
        </div>

        {/* Result Publication Card */}
        <div className="forge-card">
          <div className="forge-card-header">
            <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={18} style={{ color: 'var(--google-red)' }} /> Results & Publication
            </h3>
            <span className="status-badge status-result-published">
              {stats?.isGlobalPublished ? 'PUBLISHED' : 'LOCKED'}
            </span>
          </div>
          <div className="forge-card-body">
            <p style={{ fontSize: '0.88rem', marginBottom: '16px' }}>
              Compute final aggregate scores, override marks if authorized, resolve tie ranks, preview official scorecards, and execute transactional publication.
            </p>
            <button className="btn btn-blue btn-sm" onClick={() => onNavigate('results')}>
              Go to Results & Publication
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
