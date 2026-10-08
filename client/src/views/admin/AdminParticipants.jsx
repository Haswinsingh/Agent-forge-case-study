import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { 
  Users, 
  UserPlus, 
  FileSpreadsheet, 
  Search, 
  RefreshCw, 
  Key, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  FileCheck,
  Edit2,
  Lock,
  UploadCloud,
  X
} from 'lucide-react';

export function AdminParticipants() {
  const [participants, setParticipants] = useState([]);
  const [caseStudies, setCaseStudies] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCaseStudy, setSelectedCaseStudy] = useState('');
  const [loading, setLoading] = useState(true);

  // Manual Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newTeam, setNewTeam] = useState('');
  const [newCaseStudyId, setNewCaseStudyId] = useState('');
  const [newPasskey, setNewPasskey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Bulk Excel Import Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkPreviewData, setBulkPreviewData] = useState(null);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkError, setBulkError] = useState('');

  // Reset Passkey Modal
  const [resetModalParticipant, setResetModalParticipant] = useState(null);
  const [customPasskey, setCustomPasskey] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [parts, csList] = await Promise.all([
        api.get('/participants'),
        api.get('/case-studies')
      ]);
      setParticipants(parts);
      setCaseStudies(csList);
    } catch (err) {
      console.error('Failed to load participants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualAdd = async (e) => {
    e.preventDefault();
    setModalError('');
    try {
      setIsSubmitting(true);
      await api.post('/participants', {
        email: newEmail,
        name: newName,
        team_name: newTeam,
        assigned_case_study_id: newCaseStudyId ? parseInt(newCaseStudyId, 10) : null,
        passkey: newPasskey
      });
      setShowAddModal(false);
      setNewEmail('');
      setNewName('');
      setNewTeam('');
      setNewCaseStudyId('');
      setNewPasskey('');
      await loadData();
    } catch (err) {
      setModalError(err.message || 'Failed to create participant.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setBulkFile(file);
    setBulkError('');
    setBulkPreviewData(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsProcessingBulk(true);
      const preview = await api.post('/participants/bulk-preview', formData);
      setBulkPreviewData(preview);
    } catch (err) {
      setBulkError(err.message || 'Failed to parse Excel file.');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleBulkCommit = async () => {
    if (!bulkPreviewData || !bulkPreviewData.fullValidData) return;
    try {
      setIsProcessingBulk(true);
      await api.post('/participants/bulk-import', {
        rows: bulkPreviewData.fullValidData
      });
      setShowBulkModal(false);
      setBulkFile(null);
      setBulkPreviewData(null);
      await loadData();
    } catch (err) {
      setBulkError(err.message || 'Bulk import failed.');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleToggleStatus = async (p) => {
    const newStatus = p.status === 'active' ? 'disabled' : 'active';
    try {
      await api.put(`/participants/${p.id}`, { status: newStatus });
      await loadData();
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleResetPasskey = async () => {
    if (!resetModalParticipant) return;
    try {
      await api.post(`/participants/${resetModalParticipant.id}/reset-passkey`, {
        new_passkey: customPasskey
      });
      setResetModalParticipant(null);
      setCustomPasskey('');
      await loadData();
      alert('Passkey successfully reset!');
    } catch (err) {
      alert(`Reset failed: ${err.message}`);
    }
  };

  const filtered = participants.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch = p.participant_id.toLowerCase().includes(q) ||
                          p.name.toLowerCase().includes(q) ||
                          p.email.toLowerCase().includes(q) ||
                          (p.team_name && p.team_name.toLowerCase().includes(q));
    const matchesCase = selectedCaseStudy ? String(p.case_study_id) === String(selectedCaseStudy) : true;
    return matchesSearch && matchesCase;
  });

  return (
    <div className="page-container">
      
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--google-blue)', textTransform: 'uppercase' }}>
              Participant Registry
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{participants.length} Total Enrolled</span>
          </div>
          <h1 style={{ fontSize: '1.75rem' }}>Participant Management</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Enroll students manually or bulk import Excel rosters with automatic prefix passkey derivation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline-blue" onClick={() => setShowBulkModal(true)}>
            <FileSpreadsheet size={15} /> Bulk Import from Excel
          </button>
          <button className="btn btn-blue" onClick={() => setShowAddModal(true)}>
            <UserPlus size={15} /> Add Participant
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="forge-card" style={{ marginBottom: '20px' }}>
        <div className="forge-card-body" style={{ padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              placeholder="Search by ID, name, email, or team..."
              className="form-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <div style={{ width: '240px' }}>
            <select
              className="form-select"
              value={selectedCaseStudy}
              onChange={e => setSelectedCaseStudy(e.target.value)}
            >
              <option value="">All Case Studies</option>
              {caseStudies.map(cs => (
                <option key={cs.id} value={cs.id}>{cs.case_study_id} - {cs.title.substring(0, 24)}...</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Participants Table */}
      <div className="forge-card">
        <div className="table-responsive">
          <table className="forge-table">
            <thead>
              <tr>
                <th>Participant ID</th>
                <th>Name & Email</th>
                <th>Team</th>
                <th>Assigned Case Study</th>
                <th>Passkey Hint</th>
                <th>Submission Status</th>
                <th>Login Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px' }}>Loading participant roster...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No matching participants found.
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--google-blue)' }}>
                      {p.participant_id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.email}</div>
                    </td>
                    <td style={{ fontSize: '0.84rem' }}>{p.team_name || 'Individual'}</td>
                    <td>
                      {p.case_study_code ? (
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.case_study_code}</span>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.case_study_title}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#4B5563' }}>
                      {p.default_passkey || '••••••••'}
                    </td>
                    <td>
                      {p.submission_status === 'RESULT PUBLISHED' ? (
                        <span className="status-badge status-result-published">RESULT PUBLISHED</span>
                      ) : p.submission_status === 'EVALUATED' ? (
                        <span className="status-badge status-evaluated">EVALUATED</span>
                      ) : p.submission_status === 'UNDER REVIEW' ? (
                        <span className="status-badge status-under-review">UNDER REVIEW</span>
                      ) : p.submission_status === 'SUBMITTED' ? (
                        <span className="status-badge status-submitted">SUBMITTED</span>
                      ) : (
                        <span className="status-badge status-not-started">NOT STARTED</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleStatus(p)}
                        className={`status-badge ${p.status === 'active' ? 'status-evaluated' : 'status-not-started'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                        title="Click to toggle status"
                      >
                        <span className="dot"></span> {p.status.toUpperCase()}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        onClick={() => {
                          setResetModalParticipant(p);
                          setCustomPasskey(p.email.split('@')[0]);
                        }}
                        title="Reset Passkey"
                      >
                        <Key size={13} /> Reset Passkey
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Add Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem' }}>Enroll Participant Manually</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleManualAdd}>
              <div className="modal-body">
                {modalError && (
                  <div className="alert-box alert-error">
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Official College Email <span className="required">*</span></label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. sec24cs125@sairamtap.edu.in"
                    className="form-input"
                    value={newEmail}
                    onChange={e => {
                      setNewEmail(e.target.value);
                      if (!newPasskey && e.target.value.includes('@')) {
                        setNewPasskey(e.target.value.split('@')[0]);
                      }
                    }}
                  />
                  <div className="form-hint">Default passkey will be auto-derived from the portion before '@'.</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Participant Full Name <span className="required">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rithwik Chander"
                    className="form-input"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Team Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Team Forge-12"
                    className="form-input"
                    value={newTeam}
                    onChange={e => setNewTeam(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned Case Study</label>
                  <select
                    className="form-select"
                    value={newCaseStudyId}
                    onChange={e => setNewCaseStudyId(e.target.value)}
                  >
                    <option value="">Select Case Study (Or assign later)</option>
                    {caseStudies.map(cs => (
                      <option key={cs.id} value={cs.id}>{cs.case_study_id} - {cs.title}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Custom Passkey (Leave blank to use email prefix)</label>
                  <input
                    type="text"
                    placeholder="Auto-generated if blank"
                    className="form-input"
                    value={newPasskey}
                    onChange={e => setNewPasskey(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-blue">
                  {isSubmitting ? 'Creating...' : 'Enroll Participant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Excel Import Modal */}
      {showBulkModal && (
        <div className="modal-backdrop" onClick={() => setShowBulkModal(false)}>
          <div className="modal-dialog modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.2rem' }}>Bulk Intake from Excel (.xlsx)</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Auto-derives passkeys from email prefix before '@' and hashes credentials securely.
                </p>
              </div>
              <button onClick={() => setShowBulkModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh' }}>
              
              {bulkError && (
                <div className="alert-box alert-error">
                  <AlertCircle size={16} />
                  <span>{bulkError}</span>
                </div>
              )}

              {/* Upload Dropzone */}
              {!bulkPreviewData && (
                <label className="dropzone-box" style={{ display: 'block' }}>
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleBulkFileSelect}
                    accept=".xlsx,.xls"
                  />
                  <UploadCloud size={42} style={{ color: 'var(--google-blue)', margin: '0 auto 10px' }} />
                  <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                    Select Excel Workbook (.xlsx or .xls)
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Required columns: Official Email, Name, Team (optional), Assigned Case Study (optional)
                  </div>
                </label>
              )}

              {isProcessingBulk && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--google-blue)' }}>Processing and validating spreadsheet rows...</p>
                </div>
              )}

              {/* Preview Statistics Strip */}
              {bulkPreviewData && (
                <div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '12px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Rows Detected</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{bulkPreviewData.totalRows}</div>
                    </div>
                    <div style={{ background: 'var(--google-green-light)', color: 'var(--google-green-hover)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem' }}>Valid Rows</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{bulkPreviewData.validCount}</div>
                    </div>
                    <div style={{ background: 'var(--google-red-light)', color: 'var(--google-red)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem' }}>Invalid</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{bulkPreviewData.invalidCount}</div>
                    </div>
                    <div style={{ background: 'var(--google-yellow-light)', color: 'var(--google-yellow-dark)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem' }}>Duplicates</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{bulkPreviewData.duplicateCount}</div>
                    </div>
                  </div>

                  {/* Validation errors callout */}
                  {bulkPreviewData.errors && bulkPreviewData.errors.length > 0 && (
                    <div className="alert-box alert-warning" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                      <AlertCircle size={16} />
                      <div>
                        <strong>Validation Notices:</strong>
                        <ul style={{ paddingLeft: '16px', fontSize: '0.78rem', marginTop: '4px' }}>
                          {bulkPreviewData.errors.slice(0, 10).map((err, idx) => (
                            <li key={idx}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Preview Table */}
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '8px' }}>Previewing First 50 Valid Entries:</h4>
                  <div className="table-responsive" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                    <table className="forge-table">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Official Email</th>
                          <th>Name</th>
                          <th>Team</th>
                          <th>Auto Passkey</th>
                          <th>Case Study</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkPreviewData.preview.map((r, idx) => (
                          <tr key={idx}>
                            <td>#{r.rowNumber}</td>
                            <td style={{ fontWeight: 500 }}>{r.email}</td>
                            <td>{r.name}</td>
                            <td>{r.team_name}</td>
                            <td style={{ fontFamily: 'monospace', color: 'var(--google-blue)' }}>{r.default_passkey}</td>
                            <td>{r.case_study_label}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkPreviewData(null);
                  setBulkFile(null);
                }}
              >
                Cancel
              </button>
              {bulkPreviewData && (
                <button
                  type="button"
                  disabled={isProcessingBulk || bulkPreviewData.validCount === 0}
                  className="btn btn-green"
                  onClick={handleBulkCommit}
                >
                  {isProcessingBulk ? 'Importing...' : `Import ${bulkPreviewData.validCount} Valid Participants`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reset Passkey Modal */}
      {resetModalParticipant && (
        <div className="modal-backdrop" onClick={() => setResetModalParticipant(null)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem' }}>Reset Passkey</h3>
              <button onClick={() => setResetModalParticipant(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', marginBottom: '16px' }}>
                Resetting credentials for <strong>{resetModalParticipant.name}</strong> ({resetModalParticipant.email}).
              </p>
              <div className="form-group">
                <label className="form-label">New Passkey</label>
                <input
                  type="text"
                  className="form-input"
                  value={customPasskey}
                  onChange={e => setCustomPasskey(e.target.value)}
                />
                <div className="form-hint">Default rule is prefix before @: <code>{resetModalParticipant.email.split('@')[0]}</code></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setResetModalParticipant(null)}>Cancel</button>
              <button className="btn btn-blue" onClick={handleResetPasskey}>Confirm Reset</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
