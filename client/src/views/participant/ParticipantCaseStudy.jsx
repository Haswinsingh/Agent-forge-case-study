import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { 
  FileText, 
  Calendar, 
  FileCheck, 
  Download, 
  AlertCircle, 
  CheckCircle2,
  HardDrive,
  ArrowRight
} from 'lucide-react';
import { Github } from '../../components/GithubIcon';

export function ParticipantCaseStudy({ onNavigate }) {
  const [caseStudy, setCaseStudy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/case-studies')
      .then(list => {
        if (list && list.length > 0) {
          setCaseStudy(list[0]);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="page-container"><p>Loading Case Study Brief...</p></div>;
  }

  if (!caseStudy) {
    return (
      <div className="page-container">
        <div className="alert-box alert-warning">
          <AlertCircle size={18} />
          <span>No case study assigned to your account. Please contact competition administrators.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span className="status-badge status-submitted">{caseStudy.case_study_id}</span>
            <span className="status-badge status-evaluated">STATUS: {caseStudy.status}</span>
          </div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--text-primary)' }}>{caseStudy.title}</h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{caseStudy.description}</p>
        </div>

        <button className="btn btn-blue" onClick={() => onNavigate('submission')}>
          Submit Solution <ArrowRight size={16} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Left Column: Problem Statement & Instructions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', gridColumn: 'span 2' }}>
          
          <div className="forge-card">
            <div className="forge-card-header">
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} style={{ color: 'var(--google-blue)' }} /> Problem Statement
              </h3>
            </div>
            <div className="forge-card-body">
              <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                {caseStudy.problem_statement}
              </p>
            </div>
          </div>

          <div className="forge-card">
            <div className="forge-card-header">
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} style={{ color: 'var(--google-green)' }} /> Submission Instructions & Deliverables
              </h3>
            </div>
            <div className="forge-card-body">
              <p style={{ fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                {caseStudy.instructions}
              </p>
            </div>
          </div>

          {/* Attached resources */}
          {caseStudy.attached_resources && caseStudy.attached_resources.length > 0 && (
            <div className="forge-card">
              <div className="forge-card-header">
                <h3 style={{ fontSize: '1.1rem' }}>Attached Specifications & References</h3>
              </div>
              <div className="forge-card-body">
                {caseStudy.attached_resources.map((res, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <span style={{ fontWeight: 500, fontSize: '0.88rem' }}>{res.name}</span>
                    <a href={res.url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                      <Download size={14} /> Download Document
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Constraints & Requirements Specification */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="forge-card">
            <div className="forge-card-header">
              <h3 style={{ fontSize: '1.05rem' }}>Submission Guidelines</h3>
            </div>
            <div className="forge-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Hard Deadline
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', color: 'var(--google-red)', fontWeight: 600 }}>
                  <Calendar size={16} />
                  <span>{new Date(caseStudy.deadline).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Allowed File Types
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {caseStudy.allowed_file_types?.split(',').map((type, idx) => (
                    <span key={idx} style={{
                      padding: '3px 8px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.76rem',
                      fontWeight: 600
                    }}>
                      .{type.trim().toLowerCase()}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Max File Upload Size
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontWeight: 500 }}>
                  <HardDrive size={16} style={{ color: 'var(--google-blue)' }} />
                  <span>Up to {caseStudy.max_upload_size_mb || 50} MB per archive</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  GitHub Repository
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontWeight: 500, color: 'var(--google-green)' }}>
                  <Github size={16} />
                  <span>Strictly Required with Public/Authorized Access</span>
                </div>
              </div>

            </div>
          </div>

          {/* Standardized 5 Criteria Breakdown Card */}
          <div className="forge-card">
            <div className="forge-card-header">
              <h3 style={{ fontSize: '1.05rem' }}>Standardized 5-Criteria (50 Pts)</h3>
            </div>
            <div className="forge-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>1. Problem Understanding</span>
                  <strong>10 Pts</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>2. Innovation & Creativity</span>
                  <strong>10 Pts</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>3. Technical Implementation</span>
                  <strong>10 Pts</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>4. Feasibility & Impact</span>
                  <strong>10 Pts</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px' }}>
                  <span>5. Presentation & Overall Quality</span>
                  <strong>10 Pts</strong>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
