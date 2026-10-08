import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { 
  FileSpreadsheet, 
  Download, 
  ShieldCheck, 
  FileCheck,
  Award
} from 'lucide-react';

export function JuryReports() {
  const { user } = useAuth();
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  const handleDownloadExcel = async () => {
    try {
      setDownloadingExcel(true);
      const blob = await api.get('/reports/excel/jury', { responseType: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Agent_Forge_Jury_${user?.jury?.jury_id || 'Jury'}_Evaluations.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(`Export error: ${err.message}`);
    } finally {
      setDownloadingExcel(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '860px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem' }}>Jury Reports & Export Center</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Download your authorized evaluation ledgers and score sheets.
        </p>
      </div>

      <div className="forge-card" style={{ marginBottom: '24px' }}>
        <div className="forge-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={20} style={{ color: 'var(--google-green)' }} />
            <h3 style={{ fontSize: '1.15rem' }}>Authorized Evaluations Spreadsheet</h3>
          </div>
          <span className="status-badge status-evaluated">XLSX FORMAT</span>
        </div>
        <div className="forge-card-body">
          <p style={{ fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '20px' }}>
            Exports all submissions assigned to your juror account with their respective 5-criteria score breakdown (Problem Understanding, Innovation, Technical Implementation, Feasibility, Presentation), total score (/50), and submitted comments.
          </p>

          <div style={{
            background: 'var(--bg-secondary)',
            padding: '14px 18px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <ShieldCheck size={18} style={{ color: 'var(--google-blue)' }} />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Strict role isolation applies: This export strictly contains records authorized under Jury ID <strong>{user?.jury?.jury_id}</strong>.
            </span>
          </div>

          <button
            onClick={handleDownloadExcel}
            disabled={downloadingExcel}
            className="btn btn-green"
          >
            <Download size={16} />
            {downloadingExcel ? 'Generating Spreadsheet...' : 'Download My Evaluations (.xlsx)'}
          </button>
        </div>
      </div>
    </div>
  );
}
