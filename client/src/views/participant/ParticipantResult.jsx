import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { 
  Award, 
  Lock, 
  Download, 
  CheckCircle2, 
  MessageSquare, 
  ShieldCheck, 
  Trophy,
  ExternalLink,
  Clock
} from 'lucide-react';

export function ParticipantResult() {
  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    loadResult();
  }, []);

  const loadResult = async () => {
    try {
      setLoading(true);
      const res = await api.get('/results/my-result');
      setResultData(res);
    } catch (err) {
      setResultData({ locked: true, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!resultData?.submission) return;
    try {
      setDownloadingPdf(true);
      const blob = await api.get(`/reports/pdf/result/${resultData.submission.id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Agent_Forge_Result_${resultData.submission.participant_code}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(`PDF download failed: ${err.message}`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return <div className="page-container"><p>Querying Result Registry...</p></div>;
  }

  // If results are NOT published yet
  if (resultData?.locked) {
    return (
      <div className="page-container" style={{ maxWidth: '760px', textAlign: 'center', padding: '60px 20px' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'var(--google-yellow-light)',
          color: 'var(--google-yellow-dark)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <Lock size={36} />
        </div>
        <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', marginBottom: '10px' }}>
          Official Results Not Published Yet
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '540px', margin: '0 auto 24px' }}>
          Jury evaluations are underway or pending final verification by the competition steering committee. Results and rank allocations will become visible immediately once published by the Admin.
        </p>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          border: '1px solid var(--border-default)'
        }}>
          <Clock size={15} /> Status: Evaluation Pipeline Active
        </div>
      </div>
    );
  }

  const sub = resultData.submission;

  return (
    <div className="page-container" style={{ maxWidth: '880px' }}>
      
      {/* Congratulations Top Hero Card */}
      <div className="forge-card" style={{ marginBottom: '28px', borderTop: '4px solid var(--google-blue)' }}>
        <div className="forge-card-body" style={{ textAlign: 'center', padding: '36px 24px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'var(--google-green-light)',
            color: 'var(--google-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Trophy size={32} />
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--google-green)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Official Publication Certified
          </span>
          <h1 style={{ fontSize: '2rem', marginTop: '6px', marginBottom: '8px' }}>
            Congratulations, {sub.participant_name}!
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
            Here is your official evaluation scorecard for <strong>{sub.case_study_title}</strong>.
          </p>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="btn btn-blue"
            >
              <Download size={16} />
              {downloadingPdf ? 'Generating Official PDF...' : 'Download Official Result PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Score & Rank Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        
        {/* Total Score Box */}
        <div className="kpi-card kpi-border-blue" style={{ textAlign: 'center', padding: '28px 20px' }}>
          <div className="kpi-label" style={{ marginBottom: '6px' }}>Aggregate Final Score</div>
          <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--google-blue)', lineHeight: 1 }}>
            {sub.final_score}
          </div>
          <div style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '4px' }}>out of 50.00 points</div>
        </div>

        {/* Competition Rank Box */}
        <div className="kpi-card kpi-border-green" style={{ textAlign: 'center', padding: '28px 20px' }}>
          <div className="kpi-label" style={{ marginBottom: '6px' }}>Official Standing</div>
          <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--google-green)', lineHeight: 1 }}>
            #{sub.rank || '—'}
          </div>
          <div style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '4px' }}>Platform Leaderboard Rank</div>
        </div>

      </div>

      {/* 5-Criteria Standardized Breakdown Card */}
      <div className="forge-card" style={{ marginBottom: '28px' }}>
        <div className="forge-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={18} style={{ color: 'var(--google-blue)' }} />
            <h3 style={{ fontSize: '1.15rem' }}>Standardized 5-Criteria Evaluation Breakdown</h3>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Max 10 Pts Each</span>
        </div>
        <div className="forge-card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {sub.criteria_breakdown?.map((crit, idx) => {
              const pct = (crit.score / crit.max) * 100;
              return (
                <div key={crit.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {idx + 1}. {crit.name}
                    </span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--google-blue)' }}>
                      {crit.score} / {crit.max}
                    </strong>
                  </div>
                  {/* Visual Progress Bar */}
                  <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      backgroundColor: idx === 0 ? 'var(--google-blue)' : idx === 1 ? 'var(--google-yellow-dark)' : idx === 2 ? 'var(--google-green)' : idx === 3 ? 'var(--google-red)' : '#673AB7',
                      borderRadius: '4px'
                    }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Jury Feedback & Remarks */}
      {((sub.jury_feedback && sub.jury_feedback.length > 0) || sub.admin_remarks) && (
        <div className="forge-card" style={{ marginBottom: '28px' }}>
          <div className="forge-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MessageSquare size={18} style={{ color: 'var(--google-green)' }} />
              <h3 style={{ fontSize: '1.15rem' }}>Jury Review & Committee Remarks</h3>
            </div>
          </div>
          <div className="forge-card-body">
            {sub.admin_remarks && (
              <div style={{ marginBottom: '16px', padding: '14px', background: 'var(--google-blue-light)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--google-blue-border)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--google-blue)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Administrator Remark
                </div>
                <p style={{ fontSize: '0.88rem', color: '#174EA6' }}>{sub.admin_remarks}</p>
              </div>
            )}

            {sub.jury_feedback?.map((comment, i) => (
              <div key={i} style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Jury Evaluator Feedback #{i + 1}
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>"{comment}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification Seal Footer */}
      <div style={{
        padding: '16px 20px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={20} style={{ color: 'var(--google-blue)' }} />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Tamper-evident certificate authenticated by Agent Forge Protocol Ledger.
          </span>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleDownloadPdf} disabled={downloadingPdf}>
          <Download size={14} /> Download PDF
        </button>
      </div>

    </div>
  );
}
