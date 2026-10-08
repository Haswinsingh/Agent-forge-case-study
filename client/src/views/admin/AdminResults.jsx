import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { 
  Award, 
  Send, 
  RotateCcw, 
  Edit3, 
  Search, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  ShieldAlert, 
  Lock, 
  X,
  FileSpreadsheet,
  FileText
} from 'lucide-react';

export function AdminResults() {
  const [resultsData, setResultsData] = useState([]);
  const [caseStudies, setCaseStudies] = useState([]);
  const [isPublished, setIsPublished] = useState(false);
  const [selectedCaseStudy, setSelectedCaseStudy] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('rank'); // 'rank', 'score', 'name'
  const [loading, setLoading] = useState(true);

  // Publish Confirmation Modal State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Unpublish Confirmation Modal State
  const [showUnpublishModal, setShowUnpublishModal] = useState(false);

  // Score Override Modal State
  const [overrideModalSub, setOverrideModalSub] = useState(null);
  const [overrideScore, setOverrideScore] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  useEffect(() => {
    loadResults();
  }, [selectedCaseStudy, sortBy]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCaseStudy) params.append('case_study_id', selectedCaseStudy);
      if (sortBy) params.append('sort', sortBy);

      const [res, csList] = await Promise.all([
        api.get(`/results/preview?${params.toString()}`),
        api.get('/case-studies')
      ]);

      setResultsData(res.results || []);
      setIsPublished(res.isPublished);
      setCaseStudies(csList);
    } catch (err) {
      console.error('Failed to load results:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      await api.post('/results/publish', {
        confirmation: 'CONFIRM_PUBLISH'
      });
      setShowPublishModal(false);
      await loadResults();
      alert('Official results published successfully! Participants can now view scorecards and download certificates.');
    } catch (err) {
      alert(`Publish failed: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    try {
      await api.post('/results/unpublish');
      setShowUnpublishModal(false);
      await loadResults();
      alert('Results retracted. Participant visibility is now locked.');
    } catch (err) {
      alert(`Unpublish failed: ${err.message}`);
    }
  };

  const handleSaveOverride = async (e) => {
    e.preventDefault();
    if (!overrideModalSub) return;
    try {
      setIsSavingOverride(true);
      await api.post('/results/override', {
        submission_id: overrideModalSub.id,
        override_score: overrideScore !== '' ? parseFloat(overrideScore) : undefined,
        remarks: adminRemarks
      });
      setOverrideModalSub(null);
      await loadResults();
    } catch (err) {
      alert(`Override failed: ${err.message}`);
    } finally {
      setIsSavingOverride(false);
    }
  };

  const filtered = resultsData.filter(r => {
    const q = search.toLowerCase();
    return r.participant_name.toLowerCase().includes(q) ||
           r.participant_code.toLowerCase().includes(q) ||
           r.submission_id.toLowerCase().includes(q) ||
           r.case_study_title.toLowerCase().includes(q);
  });

  return (
    <div className="page-container">
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--google-red)', textTransform: 'uppercase' }}>
              Final Adjudication & Rankings
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span className={`status-badge ${isPublished ? 'status-result-published' : 'status-under-review'}`}>
              {isPublished ? 'RESULTS LIVE' : 'RESULTS LOCKED'}
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem' }}>Result Management & Publication</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Supervise aggregated marks, adjust score overrides, review tie breaks, and trigger atomic result release.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {isPublished ? (
            <button className="btn btn-outline" style={{ color: 'var(--google-red)' }} onClick={() => setShowUnpublishModal(true)}>
              <RotateCcw size={15} /> Unpublish Results
            </button>
          ) : (
            <button className="btn btn-green" onClick={() => setShowPublishModal(true)}>
              <Send size={15} /> Publish Results to Participants
            </button>
          )}
        </div>
      </div>

      {/* Filter & Sort Bar */}
      <div className="forge-card" style={{ marginBottom: '20px' }}>
        <div className="forge-card-body" style={{ padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              placeholder="Search candidate, team, or track..."
              className="form-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <div style={{ width: '220px' }}>
            <select
              className="form-select"
              value={selectedCaseStudy}
              onChange={e => setSelectedCaseStudy(e.target.value)}
            >
              <option value="">All Case Studies</option>
              {caseStudies.map(cs => (
                <option key={cs.id} value={cs.id}>{cs.case_study_id}</option>
              ))}
            </select>
          </div>

          <div style={{ width: '180px' }}>
            <select
              className="form-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="rank">Sort by Rank</option>
              <option value="score">Sort by Score (High to Low)</option>
              <option value="name">Sort by Candidate Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Ledger Table */}
      <div className="forge-card">
        <div className="table-responsive">
          <table className="forge-table">
            <thead>
              <tr>
                <th style={{ width: '70px' }}>Rank</th>
                <th>Candidate & Team</th>
                <th>Case Study</th>
                <th>Jury Evaluations</th>
                <th>Raw Jury Avg</th>
                <th>Final Score (/50)</th>
                <th>Admin Override</th>
                <th>Remarks</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px' }}>Computing rankings ledger...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No evaluated submissions matching query.
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id}>
                    <td>
                      {r.rank ? (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: r.rank === 1 ? 'var(--google-yellow-light)' : r.rank <= 3 ? 'var(--google-blue-light)' : 'var(--bg-tertiary)',
                          color: r.rank === 1 ? 'var(--google-yellow-dark)' : r.rank <= 3 ? 'var(--google-blue)' : 'var(--text-primary)',
                          fontWeight: 700,
                          fontSize: '0.88rem'
                        }}>
                          #{r.rank}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.participant_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {r.participant_code} • {r.team_name || 'Individual'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.case_study_code}</div>
                    </td>
                    <td>
                      <span className="status-badge status-evaluated" style={{ fontSize: '0.75rem' }}>
                        {r.jury_eval_count} Jurors
                      </span>
                    </td>
                    <td style={{ fontSize: '0.88rem' }}>
                      {r.raw_avg_score ? +(r.raw_avg_score).toFixed(2) : '—'}
                    </td>
                    <td>
                      <strong style={{ fontSize: '1rem', color: 'var(--google-blue)' }}>
                        {r.final_score !== null ? r.final_score : '—'}
                      </strong>
                    </td>
                    <td>
                      {r.admin_score_override !== null ? (
                        <span style={{ color: 'var(--google-red)', fontWeight: 600, fontSize: '0.82rem' }}>
                          Manual: {r.admin_score_override}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>
                      )}
                    </td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {r.admin_remarks || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setOverrideModalSub(r);
                          setOverrideScore(r.final_score !== null ? String(r.final_score) : '');
                          setAdminRemarks(r.admin_remarks || '');
                        }}
                      >
                        <Edit3 size={13} /> Edit Score / Note
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Large Publish Confirmation Dialog */}
      {showPublishModal && (
        <div className="modal-backdrop" onClick={() => setShowPublishModal(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '2px solid var(--google-green)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Send size={22} style={{ color: 'var(--google-green)' }} />
                <h3 style={{ fontSize: '1.25rem' }}>PUBLISH RESULTS</h3>
              </div>
              <button onClick={() => setShowPublishModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="alert-box alert-warning">
                <AlertTriangle size={20} />
                <div>
                  <strong>Important Confirmation:</strong>
                  <div style={{ marginTop: '2px' }}>
                    Publishing results will make the selected scores, individual rank standings, and evaluation scorecards visible to all active participants immediately.
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Rankings will be locked into official participant portals, and tamper-evident PDF scorecards will be unlocked for download.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowPublishModal(false)}>
                Cancel
              </button>
              <button className="btn btn-green" disabled={isPublishing} onClick={handlePublish}>
                {isPublishing ? 'Executing Publication...' : 'PUBLISH RESULTS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unpublish Modal */}
      {showUnpublishModal && (
        <div className="modal-backdrop" onClick={() => setShowUnpublishModal(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', color: 'var(--google-red)' }}>Confirm Results Retraction</h3>
              <button onClick={() => setShowUnpublishModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
                Are you sure you want to retract published results? This will immediately lock participant scorecards and mark result visibility as pending.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowUnpublishModal(false)}>Cancel</button>
              <button className="btn btn-red" onClick={handleUnpublish}>Confirm Unpublish</button>
            </div>
          </div>
        </div>
      )}

      {/* Score Override Modal */}
      {overrideModalSub && (
        <div className="modal-backdrop" onClick={() => setOverrideModalSub(null)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem' }}>Override Final Score & Remarks</h3>
              <button onClick={() => setOverrideModalSub(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveOverride}>
              <div className="modal-body">
                <p style={{ fontSize: '0.88rem', marginBottom: '16px' }}>
                  Candidate: <strong>{overrideModalSub.participant_name}</strong> ({overrideModalSub.participant_code})
                </p>

                <div className="form-group">
                  <label className="form-label">Final Score Override (0 - 50)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="50"
                    className="form-input"
                    value={overrideScore}
                    onChange={e => setOverrideScore(e.target.value)}
                  />
                  <div className="form-hint">
                    Raw Jury Average: {overrideModalSub.raw_avg_score || 'N/A'}. Entering a score overrides the automated average calculation.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Administrator Remarks / Special Note</label>
                  <textarea
                    rows={3}
                    placeholder="Notes on committee review, special honors, or tie-break rationale..."
                    className="form-textarea"
                    value={adminRemarks}
                    onChange={e => setAdminRemarks(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setOverrideModalSub(null)}>Cancel</button>
                <button type="submit" disabled={isSavingOverride} className="btn btn-blue">
                  {isSavingOverride ? 'Saving...' : 'Save Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
