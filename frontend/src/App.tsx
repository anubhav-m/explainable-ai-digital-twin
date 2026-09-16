import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import { Login } from './pages/Login';
import { Signup } from './pages/Signup';

import { LayoutDashboard, Activity, Lightbulb, UserCog, Settings, FileText, LogOut, Moon, Sun } from 'lucide-react';
import { PatientOverview } from './components/PatientOverview';
import { WhatIfSimulator } from './components/WhatIfSimulator';
import { PredictionsTab } from './components/PredictionsTab';
import { ExplainabilityTab } from './components/ExplainabilityTab';
import { DigitalTwinTab } from './components/DigitalTwinTab';
import { AIExplanationTab } from './components/AIExplanationTab';

export const API_BASE = "http://127.0.0.1:8000";

import { ThemeProvider, useTheme } from './context/ThemeContext';

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Dashboard Shell (replaces old App component)
const Dashboard = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const [activeTab, setActiveTab] = React.useState('overview');
  const { logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'predictions', label: 'Predictions', icon: Activity },
    { id: 'explainability', label: 'Explainability', icon: Lightbulb },
    { id: 'twin', label: 'Digital Twin', icon: UserCog },
    { id: 'simulator', label: 'What-If Simulator', icon: Settings },
    { id: 'ai', label: 'AI Explanation', icon: FileText },
  ];

  if (!patientId) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans transition-colors duration-200">
      <nav className="bg-gradient-to-r from-blue-900 to-indigo-800 dark:from-slate-800 dark:to-slate-900 text-white shadow-md border-b border-transparent dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Activity className="h-8 w-8 text-blue-300" />
              <span className="font-bold text-xl tracking-tight">Explainable AI Digital Twin</span>
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-sm font-medium text-blue-200 dark:text-gray-300">Patient Profile</span>
              <button onClick={toggleTheme} className="p-2 rounded-lg bg-blue-800/50 hover:bg-blue-700 dark:bg-slate-700/50 dark:hover:bg-slate-600 transition-colors">
                {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-blue-100" />}
              </button>
              <button onClick={logout} className="text-sm font-medium text-white bg-blue-700/50 hover:bg-blue-600 dark:bg-slate-700/50 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg flex items-center transition-colors">
                <LogOut className="w-4 h-4 mr-1" /> Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-6">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden sticky top-6 transition-colors duration-200">
            <div className="p-4 border-b border-gray-50 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Navigation</h3>
            </div>
            <ul className="flex flex-col py-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center px-6 py-3 text-sm font-medium transition-colors duration-150 ease-in-out ${
                        isActive 
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-r-4 border-blue-600 dark:border-blue-500' 
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-gray-200 border-r-4 border-transparent'
                      }`}
                    >
                      <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          <div className="transition-all duration-300 ease-in-out">
            {activeTab === 'overview' && <PatientOverview patientId={patientId} />}
            {activeTab === 'predictions' && <PredictionsTab patientId={patientId} />}
            {activeTab === 'explainability' && <ExplainabilityTab patientId={patientId} />}
            {activeTab === 'twin' && <DigitalTwinTab patientId={patientId} />}
            {activeTab === 'simulator' && <WhatIfSimulator patientId={patientId} />}
            {activeTab === 'ai' && <AIExplanationTab patientId={patientId} />}
          </div>
        </div>
      </div>
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
