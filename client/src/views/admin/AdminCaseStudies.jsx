import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { 
  FileText, 
  Plus, 
  Calendar, 
  Edit2, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  HardDrive,
  X
} from 'lucide-react';

export function AdminCaseStudies() {
  const [caseStudies, setCaseStudies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [cid, setCid] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [instructions, setInstructions] = useState('');
  const [deadline, setDeadline] = useState('2026-10-31T23:59');
  const [allowedTypes, setAllowedTypes] = useState('PDF,DOC,DOCX,ZIP,PPT,PPTX,XLS,XLSX');
  const [maxSize, setMaxSize] = useState(50);
  const [githubReq, setGithubReq] = useState(true);
  const [status, setStatus] = useState('Active');
  const [scoringMode, setScoringMode] = useState('average');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadCaseStudies();
  }, []);

  const loadCaseStudies = async () => {
    try {
      setLoading(true);
      const list = await api.get('/case-studies');
      setCaseStudies(list);
    } catch (err) {
      console.error('Failed to load case studies:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setCid(`AF-CS00${caseStudies.length + 1}`);
    setTitle('');
    setDescription('');
    setProblemStatement('');
    setInstructions('');
    setDeadline('2026-10-31T23:59');
    setAllowedTypes('PDF,DOC,DOCX,ZIP,PPT,PPTX,XLS,XLSX');
    setMaxSize(50);
    setGithubReq(true);
    setStatus('Active');
    setScoringMode('average');
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (cs) => {
    setEditingId(cs.id);
    setCid(cs.case_study_id);
    setTitle(cs.title);
    setDescription(cs.description);
    setProblemStatement(cs.problem_statement);
    setInstructions(cs.instructions);
    // Format deadline for datetime-local input
    const d = new Date(cs.deadline);
    const isoString = d.toISOString().substring(0, 16);
    setDeadline(isoString);
    setAllowedTypes(cs.allowed_file_types || 'PDF,DOC,DOCX,ZIP,PPT,PPTX,XLS,XLSX');
    setMaxSize(cs.max_upload_size_mb || 50);
    setGithubReq(Boolean(cs.github_required));
    setStatus(cs.status);
    setScoringMode(cs.scoring_mode || 'average');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      setIsSubmitting(true);
      if (editingId) {
        await api.put(`/case-studies/${editingId}`, {
          title,
          description,
          problem_statement: problemStatement,
          instructions,
          deadline,
          allowed_file_types: allowedTypes,
          max_upload_size_mb: parseInt(maxSize, 10),
          github_required: githubReq,
          status,
          scoring_mode: scoringMode
        });
      } else {
        await api.post('/case-studies', {
          case_study_id: cid,
          title,
          description,
          problem_statement: problemStatement,
          instructions,
          deadline,
          allowed_file_types: allowedTypes,
          max_upload_size_mb: parseInt(maxSize, 10),
          github_required: githubReq,
          status,
          scoring_mode: scoringMode
        });
      }
      setShowModal(false);
      await loadCaseStudies();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save case study.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--google-blue)', textTransform: 'uppercase' }}>
              Problem Statement Bank
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{caseStudies.length} Track Specifications</span>
          </div>
          <h1 style={{ fontSize: '1.75rem' }}>Case Study Management</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Configure competition tracks, problem statements, submission deadlines, file constraints, and scoring modes.
          </p>
        </div>

        <button className="btn btn-blue" onClick={openCreateModal}>
          <Plus size={15} /> Create Case Study
        </button>
      </div>

      {/* Case Studies Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {loading ? (
          <p>Loading case studies...</p>
        ) : caseStudies.map(cs => (
          <div key={cs.id} className="forge-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="forge-card-header">
                <span className="status-badge status-submitted">{cs.case_study_id}</span>
                <span className={`status-badge ${
                  cs.status === 'Active' ? 'status-evaluated' :
                  cs.status === 'Results Published' ? 'status-result-published' :
                  cs.status === 'Closed' ? 'status-not-started' : 'status-in-progress'
                }`}>
                  {cs.status}
                </span>
              </div>
              <div className="forge-card-body">
                <h3 style={{ fontSize: '1.15rem', marginBottom: '8px' }}>{cs.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                  {cs.description}
                </p>

                <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Deadline:</span>
                    <strong>{new Date(cs.deadline).toLocaleDateString()} {new Date(cs.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Scoring Mode:</span>
                    <strong style={{ textTransform: 'capitalize' }}>{cs.scoring_mode || 'Average'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Max Size:</span>
                    <strong>{cs.max_upload_size_mb || 50} MB</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="forge-card-footer">
              <button className="btn btn-outline btn-sm" onClick={() => openEditModal(cs)}>
                <Edit2 size={13} /> Edit Configuration
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-dialog modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>
                {editingId ? `Edit Case Study (${cid})` : 'Create Case Study'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '72vh' }}>
                
                {errorMsg && (
                  <div className="alert-box alert-error">
                    <AlertCircle size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Case Study ID <span className="required">*</span></label>
                    <input
                      type="text"
                      required
                      disabled={Boolean(editingId)}
                      placeholder="e.g. AF-CS006"
                      className="form-input"
                      value={cid}
                      onChange={e => setCid(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Track Title <span className="required">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Multi-Agent Verification Platform"
                      className="form-input"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Short Summary Description</label>
                  <input
                    type="text"
                    placeholder="Concise 1-sentence synopsis"
                    className="form-input"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Problem Statement <span className="required">*</span></label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Full problem statement formulation..."
                    className="form-textarea"
                    value={problemStatement}
                    onChange={e => setProblemStatement(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Submission Instructions & Deliverables</label>
                  <textarea
                    rows={3}
                    placeholder="Instructions, expected repo artifacts, benchmark requirements..."
                    className="form-textarea"
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Hard Deadline <span className="required">*</span></label>
                    <input
                      type="datetime-local"
                      required
                      className="form-input"
                      value={deadline}
                      onChange={e => setDeadline(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                    >
                      <option value="Draft">Draft</option>
                      <option value="Published">Published</option>
                      <option value="Active">Active</option>
                      <option value="Closed">Closed</option>
                      <option value="Results Published">Results Published</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Scoring Mode</label>
                    <select
                      className="form-select"
                      value={scoringMode}
                      onChange={e => setScoringMode(e.target.value)}
                    >
                      <option value="average">Average Jury Score</option>
                      <option value="highest">Highest Jury Score</option>
                      <option value="manual">Manual Admin Score</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Allowed File Types</label>
                    <input
                      type="text"
                      className="form-input"
                      value={allowedTypes}
                      onChange={e => setAllowedTypes(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max File Size (MB)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      className="form-input"
                      value={maxSize}
                      onChange={e => setMaxSize(e.target.value)}
                    />
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-blue">
                  {isSubmitting ? 'Saving...' : editingId ? 'Update Case Study' : 'Create Case Study'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
