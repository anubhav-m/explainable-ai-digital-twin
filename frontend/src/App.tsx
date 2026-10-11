import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import { Login } from './pages/Login';
import { Signup } from './pages/Signup';

import { LogOut, Moon, Plus, Sun } from 'lucide-react';
import { PatientOverview } from './components/PatientOverview';
import { WhatIfSimulator } from './components/WhatIfSimulator';
import { PredictionsTab } from './components/PredictionsTab';
import { ExplainabilityTab } from './components/ExplainabilityTab';
import { DigitalTwinTab } from './components/DigitalTwinTab';
import { AIExplanationTab } from './components/AIExplanationTab';
import { entrance } from './components/ui';

export const API_BASE = "http://127.0.0.1:8000";

import { ThemeProvider, useTheme } from './context/ThemeContext';

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export type TabId = 'overview' | 'predictions' | 'explainability' | 'twin' | 'simulator' | 'ai';

// Patient label first; the technical term stays beside it where the two differ
const NAV_ITEMS: { id: TabId; label: string; term?: string }[] = [
  { id: 'overview', label: 'Today' },
  { id: 'predictions', label: 'Estimate' },
  { id: 'explainability', label: 'Why', term: 'SHAP' },
  { id: 'twin', label: 'History', term: 'Twin' },
  { id: 'simulator', label: 'What-if' },
  { id: 'ai', label: 'Ask', term: 'RAG' },
];

export const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'} className="flex h-11 w-11 items-center justify-center rounded-full border border-hair transition-colors duration-100 hover:border-ink">
      {isDark ? <Sun className="h-4 w-4" strokeWidth={1.5} /> : <Moon className="h-4 w-4" strokeWidth={1.5} />}
    </button>
  );
};

// Dashboard Shell (replaces old App component)
const Dashboard = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const [activeTab, setActiveTab] = React.useState<TabId>('overview');
  const [visitOpen, setVisitOpen] = React.useState(false);
  const [firstScreen, setFirstScreen] = React.useState(true);
  const { logout } = useAuth();

  if (!patientId) return <Navigate to="/" />;

  const goTo = (tab: TabId) => {
    // The authored entrance belongs to the first screen; later switches are a quick cross-fade
    if (tab !== activeTab) {
      entrance.active = false;
      setFirstScreen(false);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0 });
  };

  const logVisit = () => {
    goTo('overview');
    setVisitOpen(true);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-hair bg-sheet">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-8 px-5 sm:px-8 lg:px-14">
          <span className="mr-auto flex h-[72px] items-center text-[17px] font-semibold">Explainable AI Digital Twin</span>

          <nav aria-label="Sections" className="topnav">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => goTo(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`label relative flex shrink-0 items-center whitespace-nowrap transition-colors duration-100 ${isActive ? 'text-ink' : 'text-mute hover:text-ink'}`}
                >
                  {item.label}
                  {item.term && <span className="text-mute">&nbsp;·&nbsp;{item.term}</span>}
                  <span className={`rule absolute inset-x-0 h-px origin-left bg-ink transition-transform duration-500 ease-expo ${isActive ? 'scale-x-100' : 'scale-x-0'}`} />
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={logout} aria-label="Log out" className="flex h-11 w-11 items-center justify-center rounded-full border border-hair transition-colors duration-100 hover:border-ink">
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button onClick={logVisit} className="btn">
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} /> Log a visit
            </button>
          </div>
        </div>
      </header>

      <main key={activeTab} data-entrance={firstScreen} className="view mx-auto max-w-[1440px] px-5 pb-24 pt-10 sm:px-8 lg:px-14">
        {activeTab === 'overview' && <PatientOverview patientId={patientId} visitOpen={visitOpen} setVisitOpen={setVisitOpen} goTo={goTo} />}
        {activeTab === 'predictions' && <PredictionsTab patientId={patientId} onLogVisit={logVisit} />}
        {activeTab === 'explainability' && <ExplainabilityTab patientId={patientId} onLogVisit={logVisit} />}
        {activeTab === 'twin' && <DigitalTwinTab patientId={patientId} onLogVisit={logVisit} />}
        {activeTab === 'simulator' && <WhatIfSimulator patientId={patientId} onLogVisit={logVisit} />}
        {activeTab === 'ai' && <AIExplanationTab patientId={patientId} />}
      </main>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route path="/" element={<Navigate to="/patient/me" replace />} />
            <Route path="/patient/:patientId" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
