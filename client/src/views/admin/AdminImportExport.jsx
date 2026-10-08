import React, { useState } from 'react';
import { api } from '../../api/client';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  UploadCloud, 
  Layers, 
  ShieldCheck, 
  CheckCircle,
  Database
} from 'lucide-react';

export function AdminImportExport({ onNavigate }) {
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadMasterExcel = async () => {
    try {
      setDownloadingExcel(true);
      const blob = await api.get('/reports/excel/master', { responseType: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Agent_Forge_Master_Data.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(`Excel download failed: ${err.message}`);
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleDownloadMasterPdf = async () => {
    try {
      setDownloadingPdf(true);
      const blob = await api.get('/reports/pdf/master', { responseType: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Agent_Forge_Master_Leaderboard_Report.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(`PDF download failed: ${err.message}`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '960px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem' }}>Import & Export Command Center</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          High-performance bulk data operations, multi-sheet workbook generation, and official PDF competition registers.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        
        {/* Master Excel Export Card */}
        <div className="forge-card" style={{ borderTop: '4px solid var(--google-green)' }}>
          <div className="forge-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileSpreadsheet size={20} style={{ color: 'var(--google-green)' }} />
              <h3 style={{ fontSize: '1.15rem' }}>Master Excel Workbook (.xlsx)</h3>
            </div>
            <span className="status-badge status-evaluated">4 SHEETS</span>
          </div>
          <div className="forge-card-body">
            <p style={{ fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '16px' }}>
              Generates an exhaustive multi-sheet Microsoft Excel workbook consolidating complete live competition records:
            </p>

            <ul style={{ paddingLeft: '18px', fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.8 }}>
              <li><strong>Sheet 1 — Participants:</strong> ID, Name, Official Email, Case Study, Login Status, Submission Status, Submission Time</li>
              <li><strong>Sheet 2 — Submissions:</strong> ID, Participant ID, Case Study, GitHub URL, Uploaded Files Count, Submission Time, Status</li>
              <li><strong>Sheet 3 — Evaluations:</strong> ID, Participant ID, Jury, 5-Criteria Scores, Total Score, Comments, Evaluation Time</li>
              <li><strong>Sheet 4 — Final Results:</strong> Rank, Participant ID, Participant Name, Case Study, Final Score, Maximum Score, Result Status</li>
            </ul>

            <button
              onClick={handleDownloadMasterExcel}
              disabled={downloadingExcel}
              className="btn btn-green"
              style={{ width: '100%' }}
            >
              <Download size={16} />
              {downloadingExcel ? 'Assembling Workbook...' : 'Download Master Excel Workbook (.xlsx)'}
            </button>
          </div>
        </div>

        {/* Master PDF Report Card */}
        <div className="forge-card" style={{ borderTop: '4px solid var(--google-red)' }}>
          <div className="forge-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={20} style={{ color: 'var(--google-red)' }} />
              <h3 style={{ fontSize: '1.15rem' }}>Comprehensive PDF Leaderboard</h3>
            </div>
            <span className="status-badge status-result-published">A4 FORMAT</span>
          </div>
          <div className="forge-card-body">
            <p style={{ fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '20px' }}>
              Compiles a presentation-ready official ranking document formatted with Agent Forge Google four-color headers, full candidate roster, assigned problem tracks, and verified final scores.
            </p>

            <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: '24px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}>
                <ShieldCheck size={16} style={{ color: 'var(--google-blue)' }} /> Tamper-Evident Publication
              </div>
              <div>Certified with cryptographic audit timestamp and competition verification seal.</div>
            </div>

            <button
              onClick={handleDownloadMasterPdf}
              disabled={downloadingPdf}
              className="btn btn-red"
              style={{ width: '100%' }}
            >
              <Download size={16} />
              {downloadingPdf ? 'Rendering PDF...' : 'Download Master Leaderboard PDF'}
            </button>
          </div>
        </div>

      </div>

      {/* Bulk Participant Intake Quick Jump */}
      <div className="forge-card" style={{ marginTop: '24px' }}>
        <div className="forge-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Bulk Participant Excel Intake</h3>
            <p style={{ fontSize: '0.85rem' }}>
              Need to upload official student lists from an institutional Excel file? Auto-generate passkeys from prefix before @.
            </p>
          </div>
          <button className="btn btn-outline-blue" onClick={() => onNavigate('participants')}>
            <UploadCloud size={16} /> Launch Excel Intake in Participants
          </button>
        </div>
      </div>

    </div>
  );
}
