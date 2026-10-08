import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { 
  FileText, 
  Download, 
  Search, 
  Clock, 
  CheckCircle, 
  Unlock, 
  Eye, 
  X,
  ExternalLink,
  Award,
  AlertCircle
} from 'lucide-react';
import { Github } from '../../components/GithubIcon';

export function AdminSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [caseStudies, setCaseStudies] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCaseStudy, setSelectedCaseStudy] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Detail Modal
  const [activeSub, setActiveSub] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [loadingEvals, setLoadingEvals] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subs, csList] = await Promise.all([
        api.get('/submissions'),
        api.get('/case-studies')
      ]);
      setSubmissions(subs);
      setCaseStudies(csList);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const openDetailModal = async (sub) => {
    setActiveSub(sub);
    try {
      setLoadingEvals(true);
      const evs = await api.get(`/evaluations/submission/${sub.id}`);
      setEvaluations(evs);
    } catch (err) {
      console.error('Failed to load evaluations for submission:', err);
    } finally {
      setLoadingEvals(false);
    }
  };

  const handleUnlockEvaluation = async (evalId) => {
    if (!window.confirm('Are you sure you want to unlock this evaluation for the jury member to make corrections?')) return;
    try {
      await api.post(`/evaluations/${evalId}/unlock`);
      if (activeSub) {
        const evs = await api.get(`/evaluations/submission/${activeSub.id}`);
        setEvaluations(evs);
      }
      await loadData();
      alert('Evaluation unlocked successfully.');
    } catch (err) {
      alert(`Unlock failed: ${err.message}`);
    }
  };

  const downloadFile = async (subId, fileId, filename) => {
    try {
      const blob = await api.get(`/submissions/${subId}/files/${fileId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    }
  };

  const filtered = submissions.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = s.submission_id.toLowerCase().includes(q) ||
                        s.participant_name.toLowerCase().includes(q) ||
                        s.participant_code.toLowerCase().includes(q) ||
                        s.case_study_title.toLowerCase().includes(q);
    const matchCase = selectedCaseStudy ? String(s.case_study_id) === String(selectedCaseStudy) : true;
    const matchStatus = selectedStatus ? s.status === selectedStatus : true;
    return matchSearch && matchCase && matchStatus;
  });

  return (
    <div className="page-container">
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--google-blue)', textTransform: 'uppercase' }}>
              Submission Intake Ledger
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{submissions.length} Total Submissions</span>
          </div>
          <h1 style={{ fontSize: '1.75rem' }}>Submissions & Deliverables</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Supervise candidate artifacts, inspect multi-juror evaluations, and manage evaluation locks.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="forge-card" style={{ marginBottom: '20px' }}>
        <div className="forge-card-body" style={{ padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              placeholder="Search by ID, candidate, team, or track..."
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
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="UNDER REVIEW">UNDER REVIEW</option>
              <option value="EVALUATED">EVALUATED</option>
              <option value="RESULT PUBLISHED">RESULT PUBLISHED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="forge-card">
        <div className="table-responsive">
          <table className="forge-table">
            <thead>
              <tr>
                <th>Submission ID</th>
                <th>Candidate & Team</th>
                <th>Case Study</th>
                <th>GitHub Repo</th>
                <th>Uploaded Files</th>
                <th>Jury Evals</th>
                <th>Status</th>
                <th>Final Score</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px' }}>Loading submissions...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No matching submissions found.
                  </td>
                </tr>
              ) : (
                filtered.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--google-blue)' }}>
                      {s.submission_id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.participant_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {s.participant_code} • {s.team_name || 'Individual'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{s.case_study_code}</div>
                    </td>
                    <td>
                      <a href={s.github_url} target="_blank" rel="noreferrer" style={{ color: 'var(--google-blue)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}>
                        <Github size={13} /> View Repo
                      </a>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        {s.files?.length || 0} Files
                      </span>
                    </td>
                    <td>
                      <span className="status-badge status-evaluated" style={{ fontSize: '0.74rem' }}>
                        {s.eval_count || 0} Jurors Evaluated
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${
                        s.status === 'RESULT PUBLISHED' ? 'status-result-published' :
                        s.status === 'EVALUATED' ? 'status-evaluated' :
                        s.status === 'UNDER REVIEW' ? 'status-under-review' : 'status-submitted'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td>
                      {s.final_score !== null && s.final_score !== undefined ? (
                        <strong style={{ color: 'var(--google-blue)' }}>{s.final_score} / 50</strong>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openDetailModal(s)}>
                        <Eye size={13} /> Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Modal */}
      {activeSub && (
        <div className="modal-backdrop" onClick={() => setActiveSub(null)}>
          <div className="modal-dialog modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="status-badge status-submitted" style={{ fontSize: '0.72rem' }}>{activeSub.submission_id}</span>
                <h3 style={{ fontSize: '1.25rem', marginTop: '4px' }}>Submission Telemetry & Multi-Jury Evaluations</h3>
              </div>
              <button onClick={() => setActiveSub(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '75vh' }}>
              
              {/* Top Details */}
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Candidate</div>
                    <strong>{activeSub.participant_name} ({activeSub.participant_code})</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Case Study</div>
                    <strong>{activeSub.case_study_title}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Submitted Time</div>
                    <div>{new Date(activeSub.submission_timestamp).toLocaleString()}</div>
                  </div>
                </div>

                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                  <a href={activeSub.github_url} target="_blank" rel="noreferrer" className="btn btn-outline-blue btn-sm">
                    <Github size={14} /> Open Verified GitHub Repository
                  </a>
                </div>

                {activeSub.files && activeSub.files.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Uploaded Deliverable Archives:</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {activeSub.files.map(f => (
                        <button
                          key={f.id}
                          className="btn btn-secondary btn-sm"
                          onClick={() => downloadFile(activeSub.id, f.id, f.original_filename)}
                        >
                          <Download size={13} /> {f.original_filename} ({(f.file_size / (1024 * 1024)).toFixed(2)} MB)
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-Jury Independent Evaluations */}
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} style={{ color: 'var(--google-blue)' }} /> Independent Jury Evaluation Sheets ({evaluations.length})
                </h4>

                {loadingEvals ? (
                  <p>Loading jury evaluations...</p>
                ) : evaluations.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No jury evaluations recorded yet for this submission.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {evaluations.map(ev => (
                      <div key={ev.id} style={{ background: '#FFFFFF', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <div>
                            <strong>{ev.jury_name}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({ev.jury_code} • {ev.department})</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--google-blue)' }}>{ev.total_score} / 50</strong>
                            {ev.is_locked ? (
                              <button
                                className="btn btn-outline btn-sm"
                                style={{ color: 'var(--google-red)', padding: '3px 8px', fontSize: '0.72rem' }}
                                onClick={() => handleUnlockEvaluation(ev.id)}
                                title="Unlock evaluation for jury member"
                              >
                                <Unlock size={12} /> Unlock
                              </button>
                            ) : (
                              <span className="status-badge status-in-progress" style={{ fontSize: '0.7rem' }}>UNLOCKED</span>
                            )}
                          </div>
                        </div>

                        {/* 5-Criteria Mini Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', fontSize: '0.75rem', textAlign: 'center', background: 'var(--bg-secondary)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>C1 (Problem)</div>
                            <strong>{ev.criterion_1}/10</strong>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>C2 (Innov.)</div>
                            <strong>{ev.criterion_2}/10</strong>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>C3 (Tech)</div>
                            <strong>{ev.criterion_3}/10</strong>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>C4 (Impact)</div>
                            <strong>{ev.criterion_4}/10</strong>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-muted)' }}>C5 (Quality)</div>
                            <strong>{ev.criterion_5}/10</strong>
                          </div>
                        </div>

                        {ev.comments && (
                          <div style={{ marginTop: '10px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            <strong>Comments:</strong> "{ev.comments}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setActiveSub(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
