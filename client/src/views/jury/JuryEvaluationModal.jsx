import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { 
  X, 
  Download, 
  FileCode, 
  CheckCircle, 
  AlertCircle, 
  Lock, 
  Save, 
  Send,
  Layers,
  FileText
} from 'lucide-react';
import { Github } from '../../components/GithubIcon';

export function JuryEvaluationModal({ submission, onClose, onSaved }) {
  const [c1, setC1] = useState(8.0);
  const [c2, setC2] = useState(8.0);
  const [c3, setC3] = useState(8.0);
  const [c4, setC4] = useState(8.0);
  const [c5, setC5] = useState(8.0);
  const [comments, setComments] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [evalStatus, setEvalStatus] = useState('draft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (submission) {
      loadEvaluation();
    }
  }, [submission]);

  const loadEvaluation = async () => {
    try {
      const evals = await api.get(`/evaluations/submission/${submission.id}`);
      if (evals && evals.length > 0) {
        const ev = evals[0];
        setC1(ev.criterion_1);
        setC2(ev.criterion_2);
        setC3(ev.criterion_3);
        setC4(ev.criterion_4);
        setC5(ev.criterion_5);
        setComments(ev.comments || '');
        setIsLocked(Boolean(ev.is_locked));
        setEvalStatus(ev.status);
      }
    } catch (err) {
      console.error('Failed to load existing evaluation:', err);
    }
  };

  const totalScore = +(c1 + c2 + c3 + c4 + c5).toFixed(2);

  const handleSave = async (statusToSave) => {
    setErrorMessage('');
    setSuccessMsg('');

    if (c1 < 0 || c1 > 10 || c2 < 0 || c2 > 10 || c3 < 0 || c3 > 10 || c4 < 0 || c4 > 10 || c5 < 0 || c5 > 10) {
      setErrorMessage('Each criterion score must be strictly between 0.0 and 10.0 points.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/evaluations', {
        submission_id: submission.id,
        criterion_1: c1,
        criterion_2: c2,
        criterion_3: c3,
        criterion_4: c4,
        criterion_5: c5,
        comments,
        status: statusToSave
      });

      setSuccessMsg(res.message);
      setIsLocked(Boolean(res.is_locked));
      setEvalStatus(res.status);
      if (onSaved) onSaved();

      if (statusToSave === 'submitted') {
        setTimeout(() => onClose(), 1200);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit evaluation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadFile = async (fileId, filename) => {
    try {
      const blob = await api.get(`/submissions/${submission.id}/files/${fileId}/download`, { responseType: 'blob' });
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog modal-lg" onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span className="status-badge status-submitted" style={{ fontSize: '0.72rem' }}>
                {submission.submission_id}
              </span>
              <span className="status-badge status-evaluated" style={{ fontSize: '0.72rem' }}>
                {submission.case_study_code}
              </span>
            </div>
            <h2 style={{ fontSize: '1.3rem', color: 'var(--text-primary)' }}>
              Standardized Evaluation Console
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ maxHeight: '78vh' }}>
          
          {errorMessage && (
            <div className="alert-box alert-error">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert-box alert-success">
              <CheckCircle size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {isLocked && (
            <div className="alert-box alert-info">
              <Lock size={16} />
              <span>This evaluation is finalized and locked. If scores need adjustment, request an admin unlock.</span>
            </div>
          )}

          {/* Candidate & Project Brief */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Candidate / Team</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>{submission.participant_name} ({submission.participant_code})</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{submission.team_name || 'Individual'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Case Study Target</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>{submission.case_study_title}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Submission Timestamp</div>
                <div style={{ fontSize: '0.88rem' }}>{new Date(submission.submission_timestamp).toLocaleString()}</div>
              </div>
            </div>

            {/* GitHub Repo Button & Deliverables */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <a
                href={submission.github_url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline-blue btn-sm"
              >
                <Github size={15} /> Inspect GitHub Repository
              </a>

              {submission.files && submission.files.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {submission.files.map(f => (
                    <button
                      key={f.id}
                      className="btn btn-secondary btn-sm"
                      onClick={() => downloadFile(f.id, f.original_filename)}
                    >
                      <Download size={13} /> {f.original_filename}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Solution Description */}
            {submission.solution_description && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                <strong>Candidate Description:</strong> {submission.solution_description}
              </div>
            )}
          </div>

          {/* 5 Evaluation Criteria Sliders */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Standardized 5-Criteria Rubric (0 - 10 Points Each)</span>
              <span style={{ fontSize: '1.15rem', color: 'var(--google-blue)', fontWeight: 700 }}>
                Total: {totalScore} / 50.00
              </span>
            </h4>

            {/* Criterion 1 */}
            <div className="criteria-slider-wrap">
              <div className="criteria-header">
                <div>
                  <div className="criteria-title">1. Problem Understanding</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Comprehension of domain constraints, edge cases, and boundary conditions.
                  </div>
                </div>
                <div className="criteria-score-badge">{c1} / 10</div>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                disabled={isLocked}
                value={c1}
                onChange={e => setC1(parseFloat(e.target.value))}
                className="slider-input"
              />
            </div>

            {/* Criterion 2 */}
            <div className="criteria-slider-wrap">
              <div className="criteria-header">
                <div>
                  <div className="criteria-title">2. Innovation & Creativity</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Novelty of methodology, agentic orchestration, and unique architectural design.
                  </div>
                </div>
                <div className="criteria-score-badge">{c2} / 10</div>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                disabled={isLocked}
                value={c2}
                onChange={e => setC2(parseFloat(e.target.value))}
                className="slider-input"
              />
            </div>

            {/* Criterion 3 */}
            <div className="criteria-slider-wrap">
              <div className="criteria-header">
                <div>
                  <div className="criteria-title">3. Technical Implementation</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Code quality, test coverage, efficiency, error resilience, and engineering rigor.
                  </div>
                </div>
                <div className="criteria-score-badge">{c3} / 10</div>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                disabled={isLocked}
                value={c3}
                onChange={e => setC3(parseFloat(e.target.value))}
                className="slider-input"
              />
            </div>

            {/* Criterion 4 */}
            <div className="criteria-slider-wrap">
              <div className="criteria-header">
                <div>
                  <div className="criteria-title">4. Feasibility & Impact</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Real-world operational viability, deployment cost, scalability, and benchmarks.
                  </div>
                </div>
                <div className="criteria-score-badge">{c4} / 10</div>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                disabled={isLocked}
                value={c4}
                onChange={e => setC4(parseFloat(e.target.value))}
                className="slider-input"
              />
            </div>

            {/* Criterion 5 */}
            <div className="criteria-slider-wrap">
              <div className="criteria-header">
                <div>
                  <div className="criteria-title">5. Presentation & Overall Quality</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Clarity of documentation, reproducibility, README, and architectural diagrams.
                  </div>
                </div>
                <div className="criteria-score-badge">{c5} / 10</div>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                disabled={isLocked}
                value={c5}
                onChange={e => setC5(parseFloat(e.target.value))}
                className="slider-input"
              />
            </div>

          </div>

          {/* Qualitative Comments */}
          <div className="form-group">
            <label className="form-label">
              Jury Evaluator Comments & Technical Feedback
            </label>
            <textarea
              rows={3}
              disabled={isLocked}
              placeholder="Provide constructive feedback highlighting specific architectural strengths or weaknesses..."
              className="form-textarea"
              value={comments}
              onChange={e => setComments(e.target.value)}
            />
          </div>

        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
          {!isLocked && (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                className="btn btn-secondary"
                onClick={() => handleSave('draft')}
              >
                <Save size={15} /> Save Draft
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                className="btn btn-blue"
                onClick={() => handleSave('submitted')}
              >
                <Send size={15} /> {isSubmitting ? 'Finalizing...' : `Submit Evaluation (${totalScore}/50)`}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
