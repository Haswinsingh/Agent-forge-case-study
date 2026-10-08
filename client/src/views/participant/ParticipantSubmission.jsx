import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X, 
  File, 
  Lock, 
  Download,
  ArrowRight
} from 'lucide-react';
import { Github } from '../../components/GithubIcon';

export function ParticipantSubmission({ onNavigate }) {
  const { user } = useAuth();
  const [caseStudy, setCaseStudy] = useState(null);
  const [existingSub, setExistingSub] = useState(null);
  const [solutionDescription, setSolutionDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubmissionState();
  }, []);

  const loadSubmissionState = async () => {
    try {
      setLoading(true);
      const [csList, subs] = await Promise.all([
        api.get('/case-studies'),
        api.get('/submissions')
      ]);

      if (csList && csList.length > 0) {
        setCaseStudy(csList[0]);
      }

      if (subs && subs.length > 0) {
        const sub = subs[0];
        setExistingSub(sub);
        setSolutionDescription(sub.solution_description || '');
        setGithubUrl(sub.github_url || '');
      }
    } catch (err) {
      console.error('Failed to load submission state:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    // Validation
    const allowedExts = ['.pdf', '.doc', '.docx', '.zip', '.ppt', '.pptx', '.xls', '.xlsx'];
    const validFiles = [];

    for (const f of files) {
      const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
      if (!allowedExts.includes(ext)) {
        setErrorMessage(`File '${f.name}' has invalid extension. Allowed: PDF, DOC, DOCX, ZIP, PPT, PPTX, XLS, XLSX`);
        return;
      }
      if (f.size > 50 * 1024 * 1024) {
        setErrorMessage(`File '${f.name}' exceeds the 50MB size limit.`);
        return;
      }
      validFiles.push(f);
    }

    setErrorMessage('');
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (idx) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const isValidGithub = (url) => {
    return /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+(\/.*)?$/.test(url.trim());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!caseStudy) {
      setErrorMessage('No active case study found.');
      return;
    }

    if (!githubUrl || !isValidGithub(githubUrl)) {
      setErrorMessage('Please provide a valid GitHub repository URL (e.g. https://github.com/organization/project).');
      return;
    }

    if (!solutionDescription.trim()) {
      setErrorMessage('Please provide a brief technical summary of your solution.');
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(15);

      const formData = new FormData();
      formData.append('case_study_id', caseStudy.id);
      formData.append('solution_description', solutionDescription);
      formData.append('github_url', githubUrl);

      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      // Simulate progressive feedback
      const progressTimer = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 85) {
            clearInterval(progressTimer);
            return 85;
          }
          return prev + 15;
        });
      }, 100);

      const res = await api.post('/submissions', formData);
      clearInterval(progressTimer);
      setUploadProgress(100);

      setSuccessInfo(res);
      await loadSubmissionState();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to complete submission.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  if (loading) {
    return <div className="page-container"><p>Loading Submission Portal...</p></div>;
  }

  // If already submitted and locked
  const isLocked = existingSub && existingSub.is_locked;

  return (
    <div className="page-container" style={{ maxWidth: '960px' }}>
      
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', color: 'var(--text-primary)' }}>Submit Case Study Solution</h1>
        <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Provide your verified GitHub repository, technical documentation, and presentation files.
        </p>
      </div>

      {successInfo && (
        <div className="alert-box alert-success" style={{ marginBottom: '24px' }}>
          <CheckCircle size={20} />
          <div>
            <strong>Submission Received Successfully!</strong>
            <div style={{ marginTop: '2px' }}>
              Your unique Submission ID is: <code>{successInfo.submission_id}</code>. Your project has entered the jury review queue.
            </div>
          </div>
        </div>
      )}

      {isLocked ? (
        /* Submitted and Locked View */
        <div className="forge-card" style={{ borderLeft: '4px solid var(--google-green)' }}>
          <div className="forge-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Lock size={18} style={{ color: 'var(--google-green)' }} />
              <h3 style={{ fontSize: '1.1rem' }}>Submission Finalized & Locked</h3>
            </div>
            <span className="status-badge status-submitted">{existingSub.status}</span>
          </div>
          <div className="forge-card-body">
            <div className="alert-box alert-info" style={{ marginBottom: '20px' }}>
              <CheckCircle size={18} />
              <span>
                Your solution is securely recorded with ID <strong>{existingSub.submission_id}</strong>. Per competition integrity regulations, submissions cannot be altered after lock.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Participant
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 500, marginTop: '2px' }}>
                  {user?.name} ({user?.participant?.participant_id || user?.participant_id})
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Case Study
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 500, marginTop: '2px' }}>
                  {caseStudy?.title}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Submission Timestamp
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 500, marginTop: '2px' }}>
                  {new Date(existingSub.submission_timestamp).toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                GitHub Repository
              </div>
              <a href={existingSub.github_url} target="_blank" rel="noreferrer" style={{ color: 'var(--google-blue)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                <Github size={16} /> {existingSub.github_url}
              </a>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Solution Summary
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                {existingSub.solution_description}
              </div>
            </div>

            {existingSub.files && existingSub.files.length > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Uploaded Files ({existingSub.files.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {existingSub.files.map(f => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{f.original_filename}</span>
                      <a href={`/api/submissions/${existingSub.id}/files/${f.id}/download`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                        <Download size={13} /> Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Submission Form */
        <div className="forge-card">
          <div className="forge-card-header">
            <h3 style={{ fontSize: '1.1rem' }}>Enter Solution Parameters</h3>
            {caseStudy && <span className="status-badge status-submitted">{caseStudy.case_study_id}</span>}
          </div>
          <div className="forge-card-body">
            
            {errorMessage && (
              <div className="alert-box alert-error">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              
              {/* Participant & Case Study Metadata */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Participant ID</label>
                  <input
                    type="text"
                    disabled
                    className="form-input"
                    value={user?.participant?.participant_id || user?.participant_id || 'AF-PART-001'}
                    style={{ background: 'var(--bg-tertiary)' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    disabled
                    className="form-input"
                    value={user?.name || ''}
                    style={{ background: 'var(--bg-tertiary)' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Assigned Case Study</label>
                  <input
                    type="text"
                    disabled
                    className="form-input"
                    value={caseStudy?.title || 'Loading...'}
                    style={{ background: 'var(--bg-tertiary)' }}
                  />
                </div>
              </div>

              {/* GitHub Repository URL */}
              <div className="form-group">
                <label className="form-label">
                  GitHub Repository URL <span className="required">*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="url"
                    required
                    placeholder="https://github.com/organization/case-study-solution"
                    className={`form-input ${githubUrl && !isValidGithub(githubUrl) ? 'error' : ''}`}
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    style={{ paddingLeft: '38px' }}
                  />
                  <Github size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
                <div className="form-hint">
                  Must be a valid GitHub repo link. Make sure jury members have access.
                </div>
              </div>

              {/* Solution Description */}
              <div className="form-group">
                <label className="form-label">
                  Solution Summary & Technical Description <span className="required">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Outline your agent architecture, verification methodology, key algorithms, and testing results..."
                  className="form-textarea"
                  value={solutionDescription}
                  onChange={(e) => setSolutionDescription(e.target.value)}
                />
              </div>

              {/* File Upload Dropzone */}
              <div className="form-group">
                <label className="form-label">
                  Solution Deliverables & Files (PDF, DOCX, ZIP, PPTX, XLSX)
                </label>
                <label className="dropzone-box" style={{ display: 'block' }}>
                  <input
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.zip,.ppt,.pptx,.xls,.xlsx"
                  />
                  <UploadCloud size={38} style={{ color: 'var(--google-blue)', margin: '0 auto 10px' }} />
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Click to browse or drag and drop files here
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Supported: PDF, DOC/DOCX, ZIP, PPT/PPTX, XLS/XLSX (Max 50MB per file)
                  </div>
                </label>

                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                  <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedFiles.map((f, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <File size={16} style={{ color: 'var(--google-blue)' }} />
                          <span style={{ fontSize: '0.86rem', fontWeight: 500 }}>{f.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ({(f.size / (1024 * 1024)).toFixed(2)} MB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          style={{ background: 'none', border: 'none', color: 'var(--google-red)', cursor: 'pointer' }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload Progress Bar */}
              {isSubmitting && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                    <span>Transferring solution payloads...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${uploadProgress}%`,
                      backgroundColor: 'var(--google-blue)',
                      transition: 'width 0.2s ease'
                    }}></div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => onNavigate('dashboard')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-blue"
                >
                  {isSubmitting ? 'Uploading & Finalizing...' : 'Submit Final Solution'}
                  <ArrowRight size={16} />
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
