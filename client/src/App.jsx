import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingLogin } from './components/LandingLogin';

// Participant Views
import { ParticipantDashboard } from './views/participant/ParticipantDashboard';
import { ParticipantCaseStudy } from './views/participant/ParticipantCaseStudy';
import { ParticipantSubmission } from './views/participant/ParticipantSubmission';
import { ParticipantResult } from './views/participant/ParticipantResult';

// Jury Views
import { JuryDashboard } from './views/jury/JuryDashboard';
import { JuryReports } from './views/jury/JuryReports';

// Admin Views
import { AdminDashboard } from './views/admin/AdminDashboard';
import { AdminParticipants } from './views/admin/AdminParticipants';
import { AdminJury } from './views/admin/AdminJury';
import { AdminCaseStudies } from './views/admin/AdminCaseStudies';
import { AdminSubmissions } from './views/admin/AdminSubmissions';
import { AdminResults } from './views/admin/AdminResults';
import { AdminImportExport } from './views/admin/AdminImportExport';
import { AdminAuditLogs } from './views/admin/AdminAuditLogs';

function AppContent() {
  const { user, role, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Connecting to Agent Forge Engine...</p>
      </div>
    );
  }

  if (!user) {
    return <LandingLogin />;
  }

  // Render role-specific screens
  const renderActiveView = () => {
    if (role === 'participant') {
      switch (activeTab) {
        case 'dashboard':
          return <ParticipantDashboard onNavigate={setActiveTab} />;
        case 'case-study':
          return <ParticipantCaseStudy onNavigate={setActiveTab} />;
        case 'submission':
          return <ParticipantSubmission onNavigate={setActiveTab} />;
        case 'result':
          return <ParticipantResult />;
        default:
          return <ParticipantDashboard onNavigate={setActiveTab} />;
      }
    } else if (role === 'jury') {
      switch (activeTab) {
        case 'dashboard':
        case 'submissions':
          return <JuryDashboard />;
        case 'reports':
          return <JuryReports />;
        default:
          return <JuryDashboard />;
      }
    } else if (role === 'admin') {
      switch (activeTab) {
        case 'dashboard':
          return <AdminDashboard onNavigate={setActiveTab} />;
        case 'participants':
          return <AdminParticipants />;
        case 'jury':
          return <AdminJury />;
        case 'case-studies':
          return <AdminCaseStudies />;
        case 'submissions':
          return <AdminSubmissions />;
        case 'results':
          return <AdminResults />;
        case 'import-export':
          return <AdminImportExport onNavigate={setActiveTab} />;
        case 'audit-logs':
          return <AdminAuditLogs />;
        default:
          return <AdminDashboard onNavigate={setActiveTab} />;
      }
    }

    return <div>Unknown Role</div>;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main style={{ flex: 1 }}>
        {renderActiveView()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
