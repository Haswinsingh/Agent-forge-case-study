import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { 
  FileText, 
  Clock, 
  Award, 
  CheckCircle, 
  AlertTriangle, 
  Download, 
  ArrowRight,
  Shield,
  Layers,
  FileCode,
  Calendar
} from 'lucide-react';
import { Github } from '../../components/GithubIcon';

export function ParticipantDashboard({ onNavigate }) {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [caseStudy, setCaseStudy] = useState(null);
  const [resultState, setResultState] = useState({ locked: true, submission: null });
  const [loading, setLoading] = useState(true);

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
      if (csList && csList.length > 0) {
        setCaseStudy(csList[0]);
      }

      // Check results
      try {
        const res = await api.get('/results/my-result');
        setResultState(res);
      } catch (e) {
        // Results not published yet
        setResultState({ locked: true });
      }
    } catch (err) {
      console.error('Failed to load participant dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const mySub = submissions[0];

  // Helper for status badge
  const getStatusBadge = () => {
    if (!mySub) {
      return (
        <span className="status-badge status-not-started">
          <span className="dot"></span> NOT STARTED
        </span>
      );
    }
    const statusMap = {
      'SUBMITTED': <span className="status-badge status-submitted"><span className="dot"></span> SUBMITTED</span>,
      'UNDER REVIEW': <span className="status-badge status-under-review"><span className="dot"></span> UNDER REVIEW</span>,
      'EVALUATED': <span className="status-badge status-evaluated"><span className="dot"></span> EVALUATED</span>,
      'RESULT PUBLISHED': <span className="status-badge status-result-published"><span className="dot"></span> RESULT PUBLISHED</span>
    };
    return statusMap[mySub.status] || <span className="status-badge status-in-progress"><span className="dot"></span> {mySub.status}</span>;
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

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '60px 0' }}>
        <p>Loading Participant Telemetry...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Welcome Banner */}
      <div className="forge-card" style={{ marginBottom: '28px', background: 'linear-gradient(to right, #FFFFFF, #F8F9FA)', borderLeft: '4px solid var(--google-blue)' }}>
        <div className="forge-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--google-blue)', textTransform: 'uppercase' }}>
                Participant Console
              </span>
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ID: {user?.participant?.participant_id || user?.participant_id || 'AF-PART-001'}</span>
            </div>
            <h1 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Welcome, {user?.name}</h1>
            <p style={{ fontSize: '0.88rem' }}>
              Team: <strong style={{ color: 'var(--text-primary)' }}>{user?.participant?.team_name || 'Individual Track'}</strong> • Email: {user?.email}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Workflow Status</div>
              <div style={{ marginTop: '4px' }}>{getStatusBadge()}</div>
            </div>
            {!mySub ? (
              <button className="btn btn-blue" onClick={() => onNavigate('submission')}>
                Submit Solution <ArrowRight size={16} />
              </button>
            ) : (
              <button className="btn btn-outline-blue" onClick={() => onNavigate('submission')}>
                View My Submission
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Assigned Case Study & Submission Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        
        {/* Case Study Card */}
        <div className="forge-card active-border-blue">
          <div className="forge-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={18} style={{ color: 'var(--google-blue)' }} />
              <h3 style={{ fontSize: '1.1rem' }}>Assigned Case Study</h3>
            </div>
            {caseStudy && (
              <span className="status-badge status-submitted" style={{ fontSize: '0.7rem' }}>
                {caseStudy.case_study_id}
              </span>
            )}
          </div>
          <div className="forge-card-body">
            {caseStudy ? (
              <>
                <h4 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  {caseStudy.title}
                </h4>
                <p style={{ fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '20px', color: 'var(--text-secondary)' }}>
                  {caseStudy.description}
                </p>

                <div style={{
                  background: 'var(--bg-secondary)',
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} style={{ color: 'var(--google-red)' }} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>Submission Deadline:</span>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {new Date(caseStudy.deadline).toLocaleDateString()} at {new Date(caseStudy.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => onNavigate('case-study')}>
                    Read Full Problem Statement
                  </button>
                  {!mySub && (
                    <button className="btn btn-blue btn-sm" onClick={() => onNavigate('submission')}>
                      Start Submission
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p>No assigned case study available yet.</p>
            )}
          </div>
        </div>

        {/* Submission Tracking Card */}
        <div className="forge-card active-border-green">
          <div className="forge-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Github size={18} style={{ color: 'var(--text-primary)' }} />
              <h3 style={{ fontSize: '1.1rem' }}>Submission & Files</h3>
            </div>
            {getStatusBadge()}
          </div>
          <div className="forge-card-body">
            {mySub ? (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Submission ID
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--google-blue)', fontFamily: 'monospace', marginTop: '2px' }}>
                    {mySub.submission_id}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Verified GitHub Repository
                  </div>
                  <a
                    href={mySub.github_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: 'var(--google-blue)',
                      fontSize: '0.88rem',
                      fontWeight: 500,
                      textDecoration: 'none',
                      marginTop: '2px',
                      wordBreak: 'break-all'
                    }}
                  >
                    <Github size={15} /> {mySub.github_url}
                  </a>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Uploaded Solution Documents ({mySub.files?.length || 0})
                  </div>
                  {mySub.files && mySub.files.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {mySub.files.map(f => (
                        <div key={f.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.82rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                            <FileCode size={15} style={{ color: 'var(--google-green)', flexShrink: 0 }} />
                            <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {f.original_filename}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                              ({(f.file_size / (1024 * 1024)).toFixed(2)} MB)
                            </span>
                          </div>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                            onClick={() => downloadFile(mySub.id, f.id, f.original_filename)}
                          >
                            <Download size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No attached binary files.</p>
                  )}
                </div>

                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Submitted on: {new Date(mySub.submission_timestamp).toLocaleString()}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Clock size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
                <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '6px' }}>No Submission Received</h4>
                <p style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
                  You have not submitted your solution for this case study yet.
                </p>
                <button className="btn btn-blue btn-sm" onClick={() => onNavigate('submission')}>
                  Submit Your Work Now
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Results Governance Banner */}
      <div className="forge-card" style={{ borderLeft: resultState.locked ? '4px solid var(--google-yellow-dark)' : '4px solid var(--google-green)' }}>
        <div className="forge-card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: resultState.locked ? 'var(--google-yellow-light)' : 'var(--google-green-light)',
              color: resultState.locked ? 'var(--google-yellow-dark)' : 'var(--google-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {resultState.locked ? <Shield size={22} /> : <Award size={22} />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '3px' }}>
                {resultState.locked ? 'Official Evaluation Results: Locked' : 'Official Results Published!'}
              </h3>
              <p style={{ fontSize: '0.85rem' }}>
                {resultState.locked ? (
                  'Jury evaluation is ongoing or pending Administrative publication. Per strict security rules, marks remain confidential until published.'
                ) : (
                  `Your submission scored ${resultState.submission?.final_score}/50 with an official rank of #${resultState.submission?.rank || '—'}!`
                )}
              </p>
            </div>
          </div>

          <div>
            {resultState.locked ? (
              <span className="status-badge status-under-review">
                🔒 WAITING FOR ADMIN PUBLICATION
              </span>
            ) : (
              <button className="btn btn-green" onClick={() => onNavigate('result')}>
                <Award size={16} /> View Scorecard & PDF
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
