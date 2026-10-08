import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { 
  Award, 
  UserPlus, 
  CheckCircle, 
  Clock, 
  Search, 
  ShieldCheck, 
  AlertCircle,
  X,
  Layers
} from 'lucide-react';

export function AdminJury() {
  const [jurors, setJurors] = useState([]);
  const [caseStudies, setCaseStudies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Jury Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Assign Case Study Modal State
  const [assignModalJury, setAssignModalJury] = useState(null);
  const [selectedCaseStudyId, setSelectedCaseStudyId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [jList, csList] = await Promise.all([
        api.get('/jury'),
        api.get('/case-studies')
      ]);
      setJurors(jList);
      setCaseStudies(csList);
      if (csList.length > 0) {
        setSelectedCaseStudyId(csList[0].id);
      }
    } catch (err) {
      console.error('Failed to load jury roster:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddJury = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      setIsSubmitting(true);
      await api.post('/jury', {
        email,
        name,
        department,
        password
      });
      setShowAddModal(false);
      setEmail('');
      setName('');
      setDepartment('');
      setPassword('');
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create jury account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (j) => {
    const newStatus = j.status === 'active' ? 'disabled' : 'active';
    try {
      await api.put(`/jury/${j.id}`, { status: newStatus });
      await loadData();
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleAssignCase = async () => {
    if (!assignModalJury || !selectedCaseStudyId) return;
    try {
      await api.post('/jury/assign-case', {
        jury_id: assignModalJury.id,
        case_study_id: selectedCaseStudyId
      });
      setAssignModalJury(null);
      await loadData();
      alert('Case study submissions successfully assigned to jury!');
    } catch (err) {
      alert(`Assignment failed: ${err.message}`);
    }
  };

  return (
    <div className="page-container">
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--google-green)', textTransform: 'uppercase' }}>
              Evaluation Panel Governance
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{jurors.length} Appointed Jurors</span>
          </div>
          <h1 style={{ fontSize: '1.75rem' }}>Jury Member Management</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Provision evaluation panel members, supervise scoring completion, and allocate case study portfolios.
          </p>
        </div>

        <button className="btn btn-blue" onClick={() => setShowAddModal(true)}>
          <UserPlus size={15} /> Appoint New Juror
        </button>
      </div>

      {/* Juror Table */}
      <div className="forge-card">
        <div className="table-responsive">
          <table className="forge-table">
            <thead>
              <tr>
                <th>Jury ID</th>
                <th>Name & Email</th>
                <th>Department / Domain</th>
                <th>Assigned Submissions</th>
                <th>Evaluations Completed</th>
                <th>Pending Submissions</th>
                <th>Average Score Awarded</th>
                <th>Account Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px' }}>Loading jury roster...</td>
                </tr>
              ) : jurors.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>No jurors found.</td>
                </tr>
              ) : (
                jurors.map(j => (
                  <tr key={j.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--google-blue)' }}>
                      {j.jury_id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{j.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{j.email}</div>
                    </td>
                    <td style={{ fontSize: '0.84rem' }}>{j.department}</td>
                    <td>
                      <strong style={{ color: 'var(--text-primary)' }}>{j.assigned_count}</strong>
                    </td>
                    <td>
                      <span style={{ color: 'var(--google-green)', fontWeight: 600 }}>{j.evaluated_count}</span>
                    </td>
                    <td>
                      <span style={{ color: j.pending_count > 0 ? 'var(--google-yellow-dark)' : 'var(--text-muted)', fontWeight: 600 }}>
                        {j.pending_count}
                      </span>
                    </td>
                    <td>
                      {j.avg_score_given > 0 ? (
                        <span style={{ fontWeight: 600, color: 'var(--google-blue)' }}>{j.avg_score_given} / 50</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleStatus(j)}
                        className={`status-badge ${j.status === 'active' ? 'status-evaluated' : 'status-not-started'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                        title="Click to toggle active status"
                      >
                        <span className="dot"></span> {j.status.toUpperCase()}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        onClick={() => setAssignModalJury(j)}
                      >
                        Assign Case Study
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Appoint Jury Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem' }}>Appoint Evaluation Panelist</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddJury}>
              <div className="modal-body">
                {errorMsg && (
                  <div className="alert-box alert-error">
                    <AlertCircle size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Full Name <span className="required">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Prof. Alan Turing"
                    className="form-input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Jury Email <span className="required">*</span></label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. jury.alan@agentforge.io"
                    className="form-input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Department / Field of Expertise</label>
                  <input
                    type="text"
                    placeholder="e.g. Autonomous Systems & Distributed Verification"
                    className="form-input"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Password <span className="required">*</span></label>
                  <input
                    type="password"
                    required
                    placeholder="Secure password"
                    className="form-input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-blue">
                  {isSubmitting ? 'Appointing...' : 'Create Jury Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Case Study Modal */}
      {assignModalJury && (
        <div className="modal-backdrop" onClick={() => setAssignModalJury(null)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem' }}>Assign Submissions by Case Study</h3>
              <button onClick={() => setAssignModalJury(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', marginBottom: '16px' }}>
                Assign all submissions for the selected case study to <strong>{assignModalJury.name}</strong> ({assignModalJury.jury_id}).
              </p>
              <div className="form-group">
                <label className="form-label">Target Case Study</label>
                <select
                  className="form-select"
                  value={selectedCaseStudyId}
                  onChange={e => setSelectedCaseStudyId(e.target.value)}
                >
                  {caseStudies.map(cs => (
                    <option key={cs.id} value={cs.id}>{cs.case_study_id} — {cs.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setAssignModalJury(null)}>Cancel</button>
              <button className="btn btn-blue" onClick={handleAssignCase}>Assign to Jury Queue</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
