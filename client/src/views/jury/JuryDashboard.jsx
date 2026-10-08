import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { JuryEvaluationModal } from './JuryEvaluationModal';
import { 
  FileCheck, 
  Clock, 
  Award, 
  Download, 
  Search, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Edit3
} from 'lucide-react';

export function JuryDashboard() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [activeModalSub, setActiveModalSub] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [exportingExcel, setExportingExcel] = useState(false);

  useEffect(() => {
    loadJurySubmissions();
  }, []);

  const loadJurySubmissions = async () => {
    try {
      setLoading(true);
      const list = await api.get('/submissions');
      setSubmissions(list);
    } catch (err) {
      console.error('Failed to load jury queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const evaluatedCount = submissions.filter(s => s.jury_eval_status === 'submitted').length;
  const pendingCount = submissions.length - evaluatedCount;
  const scoredSubs = submissions.filter(s => s.my_eval_score !== null && s.my_eval_score !== undefined);
  const avgScore = scoredSubs.length > 0 
    ? +(scoredSubs.reduce((acc, s) => acc + s.my_eval_score, 0) / scoredSubs.length).toFixed(2) 
    : 0;

  const handleDownloadExcel = async () => {
    try {
      setExportingExcel(true);
      const blob = await api.get('/reports/excel/jury', { responseType: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Agent_Forge_Jury_Evaluations_${user?.jury?.jury_id || 'Jury'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExportingExcel(false);
    }
  };

  const filtered = submissions.filter(s => {
    const q = search.toLowerCase();
    return s.submission_id.toLowerCase().includes(q) ||
           s.participant_name.toLowerCase().includes(q) ||
           s.participant_code.toLowerCase().includes(q) ||
           s.case_study_title.toLowerCase().includes(q);
  });

  return (
    <div className="page-container">
      
      {/* Top Welcome & Actions Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--google-blue)', textTransform: 'uppercase' }}>
              Jury Evaluation Chamber
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ID: {user?.jury?.jury_id || user?.jury_id}</span>
          </div>
          <h1 style={{ fontSize: '1.75rem' }}>Assigned Submissions Queue</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Review candidate repositories, inspect solution bundles, and award 5-criteria standardized points.
          </p>
        </div>

        <button
          onClick={handleDownloadExcel}
          disabled={exportingExcel}
          className="btn btn-outline"
        >
          <Download size={15} />
          {exportingExcel ? 'Exporting...' : 'Export My Evaluations (.xlsx)'}
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-border-blue">
          <div className="kpi-card-top">
            <span className="kpi-label">Assigned Submissions</span>
            <FileCheck size={18} style={{ color: 'var(--google-blue)' }} />
          </div>
          <div className="kpi-val">{submissions.length}</div>
          <div className="kpi-sub">Total allocated to your panel</div>
        </div>

        <div className="kpi-card kpi-border-green">
          <div className="kpi-card-top">
            <span className="kpi-label">Evaluated</span>
            <CheckCircle size={18} style={{ color: 'var(--google-green)' }} />
          </div>
          <div className="kpi-val">{evaluatedCount}</div>
          <div className="kpi-sub">Finalized & submitted scores</div>
        </div>

        <div className="kpi-card kpi-border-yellow">
          <div className="kpi-card-top">
            <span className="kpi-label">Pending</span>
            <Clock size={18} style={{ color: 'var(--google-yellow-dark)' }} />
          </div>
          <div className="kpi-val">{pendingCount}</div>
          <div className="kpi-sub">Awaiting evaluation / draft</div>
        </div>

        <div className="kpi-card kpi-border-red">
          <div className="kpi-card-top">
            <span className="kpi-label">Average Score Given</span>
            <Award size={18} style={{ color: 'var(--google-red)' }} />
          </div>
          <div className="kpi-val">{avgScore}</div>
          <div className="kpi-sub">Average out of 50.00 pts</div>
        </div>
      </div>

      {/* Table Container */}
      <div className="forge-card">
        <div className="forge-card-header" style={{ flexWrap: 'wrap', gap: '14px' }}>
          <h3 style={{ fontSize: '1.1rem' }}>Submissions Roster</h3>
          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              placeholder="Search ID, participant or case study..."
              className="form-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '34px', paddingRight: '12px', fontSize: '0.84rem' }}
            />
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="table-responsive">
          <table className="forge-table">
            <thead>
              <tr>
                <th>Submission ID</th>
                <th>Participant & Team</th>
                <th>Case Study</th>
                <th>Submitted Timestamp</th>
                <th>Evaluation Status</th>
                <th>Your Score</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px' }}>Loading submissions...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No matching submissions assigned to your queue.
                  </td>
                </tr>
              ) : (
                filtered.map(sub => {
                  const isDone = sub.jury_eval_status === 'submitted';
                  const isDraft = sub.jury_eval_status === 'draft';

                  return (
                    <tr key={sub.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--google-blue)' }}>
                        {sub.submission_id}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{sub.participant_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {sub.participant_code} • {sub.team_name || 'Individual'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{sub.case_study_title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub.case_study_code}</div>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(sub.submission_timestamp).toLocaleDateString()}{' '}
                        {new Date(sub.submission_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        {isDone ? (
                          <span className="status-badge status-evaluated">
                            <span className="dot"></span> EVALUATED
                          </span>
                        ) : isDraft ? (
                          <span className="status-badge status-in-progress">
                            <span className="dot"></span> DRAFT SAVED
                          </span>
                        ) : (
                          <span className="status-badge status-under-review">
                            <span className="dot"></span> PENDING REVIEW
                          </span>
                        )}
                      </td>
                      <td>
                        {sub.my_eval_score !== null && sub.my_eval_score !== undefined ? (
                          <strong style={{ color: 'var(--google-blue)', fontSize: '0.92rem' }}>
                            {sub.my_eval_score} / 50
                          </strong>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className={`btn btn-sm ${isDone ? 'btn-outline' : 'btn-blue'}`}
                          onClick={() => setActiveModalSub(sub)}
                        >
                          {isDone ? (
                            <>
                              <Eye size={14} /> Review
                            </>
                          ) : (
                            <>
                              <Edit3 size={14} /> Evaluate
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evaluation Modal */}
      {activeModalSub && (
        <JuryEvaluationModal
          submission={activeModalSub}
          onClose={() => setActiveModalSub(null)}
          onSaved={() => {
            loadJurySubmissions();
          }}
        />
      )}

    </div>
  );
}
