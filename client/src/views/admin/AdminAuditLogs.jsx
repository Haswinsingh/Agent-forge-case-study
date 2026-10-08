import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  Filter
} from 'lucide-react';

export function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [roleFilter, actionFilter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (roleFilter) params.append('role', roleFilter);
      if (actionFilter) params.append('action', actionFilter);

      const list = await api.get(`/audit-logs?${params.toString()}`);
      setLogs(list);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    return (l.user_email && l.user_email.toLowerCase().includes(q)) ||
           (l.action && l.action.toLowerCase().includes(q)) ||
           (l.target && l.target.toLowerCase().includes(q)) ||
           (l.details && l.details.toLowerCase().includes(q));
  });

  return (
    <div className="page-container">
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--google-blue)', textTransform: 'uppercase' }}>
              Security & Compliance
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Immutable Ledger</span>
          </div>
          <h1 style={{ fontSize: '1.75rem' }}>System Audit Logs</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Cryptographically chronological record of administrative actions, jury scoring events, participant uploads, and authentication attempts.
          </p>
        </div>

        <button className="btn btn-outline" onClick={loadLogs}>
          <RefreshCw size={14} /> Refresh Ledger
        </button>
      </div>

      {/* Filter Bar */}
      <div className="forge-card" style={{ marginBottom: '20px' }}>
        <div className="forge-card-body" style={{ padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              placeholder="Search user email, target, action or details..."
              className="form-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <div style={{ width: '180px' }}>
            <select
              className="form-select"
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="jury">Jury</option>
              <option value="participant">Participant</option>
              <option value="system">System Core</option>
            </select>
          </div>

          <div style={{ width: '220px' }}>
            <select
              className="form-select"
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
              <option value="LOGIN_FAILED">LOGIN_FAILED</option>
              <option value="SUBMIT_SOLUTION">SUBMIT_SOLUTION</option>
              <option value="EVALUATION_SUBMITTED">EVALUATION_SUBMITTED</option>
              <option value="PUBLISH_RESULTS">PUBLISH_RESULTS</option>
              <option value="ADMIN_SCORE_OVERRIDE">ADMIN_SCORE_OVERRIDE</option>
              <option value="BULK_IMPORT_PARTICIPANTS">BULK_IMPORT_PARTICIPANTS</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="forge-card">
        <div className="table-responsive">
          <table className="forge-table">
            <thead>
              <tr>
                <th style={{ width: '160px' }}>Timestamp</th>
                <th>User / Identity</th>
                <th>Role</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
                <th>IP Address</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px' }}>Loading audit entries...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No audit records matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {new Date(l.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600, fontSize: '0.84rem' }}>
                      {l.user_email || 'System Core'}
                    </td>
                    <td>
                      <span className={`brand-badge ${
                        l.user_role === 'admin' ? 'style-admin' :
                        l.user_role === 'jury' ? 'style-jury' : 'style-part'
                      }`}>
                        {l.user_role ? l.user_role.toUpperCase() : 'SYSTEM'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                      {l.action}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {l.target || '—'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.details}>
                      {l.details || '—'}
                    </td>
                    <td style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {l.ip_address || '127.0.0.1'}
                    </td>
                    <td>
                      {l.status === 'SUCCESS' ? (
                        <span className="status-badge status-evaluated" style={{ fontSize: '0.7rem' }}>
                          <CheckCircle size={10} /> SUCCESS
                        </span>
                      ) : l.status === 'WARNING' ? (
                        <span className="status-badge status-in-progress" style={{ fontSize: '0.7rem' }}>
                          <AlertTriangle size={10} /> WARNING
                        </span>
                      ) : (
                        <span className="status-badge status-not-started" style={{ fontSize: '0.7rem', color: 'var(--google-red)' }}>
                          <XCircle size={10} /> FAILURE
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
