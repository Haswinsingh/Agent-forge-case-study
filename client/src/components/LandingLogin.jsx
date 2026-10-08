import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, 
  Award, 
  GraduationCap, 
  ArrowRight, 
  Lock, 
  Mail, 
  Key, 
  AlertCircle,
  CheckCircle2,
  Cpu,
  Layers,
  FileCheck
} from 'lucide-react';

export function LandingLogin() {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState('participant'); // 'participant', 'jury', 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRoleTabClick = (roleKey) => {
    setSelectedRole(roleKey);
    setErrorMessage('');
    if (roleKey === 'participant') {
      setEmail('sec24cs101@sairamtap.edu.in');
      setPassword('sec24cs101');
    } else if (roleKey === 'jury') {
      setEmail('jury.priya@agentforge.io');
      setPassword('Jury@Forge2026!');
    } else if (roleKey === 'admin') {
      setEmail('admin@agentforge.io');
      setPassword('Admin@Forge2026!');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPreset = (presetEmail, presetPass, roleTab) => {
    setSelectedRole(roleTab);
    setEmail(presetEmail);
    setPassword(presetPass);
    setErrorMessage('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Google accent bar */}
      <div className="google-accent-bar">
        <div className="bar-blue"></div>
        <div className="bar-red"></div>
        <div className="bar-yellow"></div>
        <div className="bar-green"></div>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px'
      }}>
        <div style={{ width: '100%', maxWidth: '1040px' }}>
          
          {/* Top Brand Banner */}
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            {/* Minimal Modern 4-Color Agent Forge Network Logo */}
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                <svg width="46" height="46" viewBox="0 0 46 46">
                  {/* Subtle Grid Lines */}
                  <line x1="14" y1="14" x2="32" y2="14" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="3 2" />
                  <line x1="32" y1="14" x2="32" y2="32" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="3 2" />
                  <line x1="32" y1="32" x2="14" y2="32" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="3 2" />
                  <line x1="14" y1="32" x2="14" y2="14" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="3 2" />
                  <line x1="14" y1="14" x2="32" y2="32" stroke="#4285F4" strokeWidth="1.8" />
                  {/* Four Color Nodes */}
                  <circle cx="14" cy="14" r="5" fill="#4285F4" />
                  <circle cx="32" cy="14" r="5" fill="#EA4335" />
                  <circle cx="32" cy="32" r="5" fill="#34A853" />
                  <circle cx="14" cy="32" r="5" fill="#FBBC05" />
                </svg>
              </div>
            </div>

            <h1 style={{ fontSize: '2.2rem', fontWeight: 700, color: '#202124', letterSpacing: '-0.025em' }}>
              AGENT FORGE
            </h1>
            <p style={{
              fontSize: '1.05rem',
              fontWeight: 500,
              color: 'var(--google-blue)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginTop: '4px'
            }}>
              Case Study Evaluation Platform
            </p>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '600px', margin: '8px auto 0' }}>
              Submit. Evaluate. Decide. A standardized, high-concurrency evaluation platform for competitions, hackathons, and research symposiums.
            </p>
          </div>

          {/* Main Card with Split Layout: Login & Architecture Overview */}
          <div className="forge-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
            
            {/* Left: Role-Driven Login Panel */}
            <div style={{ padding: '36px', borderRight: '1px solid var(--border-subtle)' }}>
              
              {/* Role Selection Tabs */}
              <div style={{
                display: 'flex',
                background: 'var(--bg-tertiary)',
                padding: '4px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '28px',
                border: '1px solid var(--border-subtle)'
              }}>
                <button
                  type="button"
                  onClick={() => handleRoleTabClick('participant')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    backgroundColor: selectedRole === 'participant' ? '#FFFFFF' : 'transparent',
                    color: selectedRole === 'participant' ? 'var(--google-blue)' : 'var(--text-secondary)',
                    boxShadow: selectedRole === 'participant' ? 'var(--shadow-xs)' : 'none'
                  }}
                >
                  Participant
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleTabClick('jury')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    backgroundColor: selectedRole === 'jury' ? '#FFFFFF' : 'transparent',
                    color: selectedRole === 'jury' ? 'var(--google-blue)' : 'var(--text-secondary)',
                    boxShadow: selectedRole === 'jury' ? 'var(--shadow-xs)' : 'none'
                  }}
                >
                  Jury
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleTabClick('admin')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    backgroundColor: selectedRole === 'admin' ? '#FFFFFF' : 'transparent',
                    color: selectedRole === 'admin' ? 'var(--google-blue)' : 'var(--text-secondary)',
                    boxShadow: selectedRole === 'admin' ? 'var(--shadow-xs)' : 'none'
                  }}
                >
                  Admin
                </button>
              </div>

              {/* Login Form Header */}
              <div style={{ marginBottom: '22px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedRole === 'participant' && 'Participant Sign In'}
                  {selectedRole === 'jury' && 'Jury Evaluation Access'}
                  {selectedRole === 'admin' && 'Administrator Portal'}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {selectedRole === 'participant' && 'Use your official college email and default passkey (prefix before @).'}
                  {selectedRole === 'jury' && 'Enter your jury credentials to review your assigned submissions.'}
                  {selectedRole === 'admin' && 'Central command for participant management and result publication.'}
                </p>
              </div>

              {errorMessage && (
                <div className="alert-box alert-error" style={{ marginBottom: '18px' }}>
                  <AlertCircle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">
                    {selectedRole === 'participant' ? 'Official College Email' : 'Email Address'}
                    <span className="required">*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      required
                      className="form-input"
                      placeholder={selectedRole === 'participant' ? 'sec24cs101@sairamtap.edu.in' : 'name@agentforge.io'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ paddingLeft: '38px' }}
                    />
                    <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      {selectedRole === 'participant' ? 'Passkey' : 'Password'}
                      <span className="required">*</span>
                    </label>
                    {selectedRole === 'participant' && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--google-blue)', fontWeight: 500 }}>
                        Auto-generated: prefix before @
                      </span>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      required
                      className="form-input"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ paddingLeft: '38px' }}
                    />
                    <Key size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-blue"
                  style={{ width: '100%', marginTop: '8px', padding: '12px' }}
                >
                  {isLoading ? 'Verifying Credentials...' : 'Sign In to Agent Forge'}
                  <ArrowRight size={16} />
                </button>
              </form>

              {/* Instant Fill Helper Links */}
              <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Quick Fill Demo Credentials
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleQuickPreset('sec24cs101@sairamtap.edu.in', 'sec24cs101', 'participant')}
                  >
                    Participant #101
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleQuickPreset('jury.priya@agentforge.io', 'Jury@Forge2026!', 'jury')}
                  >
                    Jury (Dr. Priya)
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleQuickPreset('admin@agentforge.io', 'Admin@Forge2026!', 'admin')}
                  >
                    Admin Master
                  </button>
                </div>
              </div>

            </div>

            {/* Right: Technical Capabilities & Protocol Highlights */}
            <div style={{ padding: '36px', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 10px', borderRadius: 'var(--radius-full)', background: 'var(--google-blue-light)', color: 'var(--google-blue)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '18px' }}>
                  <Cpu size={14} /> HIGH-CONCURRENCY ARCHITECTURE
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '12px' }}>
                  Standardized Competition Workflow
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
                  Engineered for heavy concurrent loads when hundreds of participants upload multi-megabyte archives and inspect rankings simultaneously.
                </p>

                {/* 3 Role Highlights */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--google-blue-light)', color: 'var(--google-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <GraduationCap size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Strict Participant Role Isolation</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Participants cannot view peers' submissions or marks before Admin explicitly publishes final results.
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--google-green-light)', color: 'var(--google-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Award size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Standardized 5-Criteria Scoring</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Problem Understanding, Innovation, Tech Implementation, Feasibility, and Quality (10 pts each, Total /50).
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--google-red-light)', color: 'var(--google-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Shield size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Administrative Result Governance</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Jury scores are aggregated (Average / Highest / Override). Admin publishes rankings transactionally with confirmation.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Excel & PDF Capabilities badge */}
              <div style={{
                marginTop: '32px',
                padding: '14px 18px',
                background: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileCheck size={18} style={{ color: 'var(--google-blue)' }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Export Ready</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>4-Sheet Excel Workbook & Branded PDF Reports</div>
                  </div>
                </div>
                <span className="status-badge status-evaluated">ENABLED</span>
              </div>

            </div>

          </div>

          {/* Footer note */}
          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Agent Forge Production Platform • Powered by SQLite WAL & Google Four-Color Identity System
          </div>

        </div>
      </div>
    </div>
  );
}
