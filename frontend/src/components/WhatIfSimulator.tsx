import React, { useState } from 'react';
import { Settings, Play, ArrowRight, Activity, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { API_BASE } from '../App';

export const WhatIfSimulator = ({ patientId }: { patientId: string }) => {
  const [bmi, setBmi] = useState(33.0);
  const [activity, setActivity] = useState(2); // 2 = Moderate, 1 = Vigorous
  
  const [loading, setLoading] = useState(false);
  const [scenario, setScenario] = useState<any>(null);

  const runSimulation = () => {
    setLoading(true);
    axios.post(`${API_BASE}/patients/${patientId}/simulate`, {
      scenario_name: "Custom Intervention",
      modified_variables: {
        BMXBMI: bmi,
        PAQ605: activity
      }
    })
    .then(res => {
      setScenario(res.data);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  const dummyData = [
    { name: 'Baseline', hba1c: scenario?.baseline_prediction || 7.2 },
    { name: 'Month 1', hba1c: (scenario?.baseline_prediction || 7.2) + ((scenario?.prediction_difference || 0) * 0.3) },
    { name: 'Month 2', hba1c: (scenario?.baseline_prediction || 7.2) + ((scenario?.prediction_difference || 0) * 0.7) },
    { name: 'Target', hba1c: scenario?.scenario_prediction || 7.2 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">What-If Simulator</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Test clinical interventions and see how the Digital Twin reacts in real-time.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Controls */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center mb-6">
            <Settings className="w-5 h-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Intervention Variables</h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span>Target BMI</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">{bmi}</span>
              </label>
              <input 
                type="range" 
                min="20" max="40" step="0.5"
                value={bmi}
                onChange={(e) => setBmi(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                <span>Healthy (20)</span>
                <span>Obese (40+)</span>
              </div>
            </div>

            <div>
              <label className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span>Physical Activity Level</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">{activity === 1 ? 'Vigorous' : activity === 2 ? 'Moderate' : 'Low'}</span>
              </label>
              <input 
                type="range" 
                min="1" max="3" step="1"
                value={activity}
                onChange={(e) => setActivity(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                <span>Vigorous</span>
                <span>Moderate</span>
                <span>Low</span>
              </div>
            </div>

            <button 
              onClick={runSimulation}
              disabled={loading}
              className={`w-full py-3 text-white font-semibold rounded-xl transition-colors flex items-center justify-center mt-4 ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {loading ? (
                 <Activity className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                 <Play className="w-5 h-5 mr-2" />
              )}
              {loading ? 'Simulating...' : 'Run Live ML Simulation'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden">
          <div className="flex items-center mb-6">
            <Zap className="w-5 h-5 text-amber-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Simulation Outcome</h3>
          </div>

          {!scenario && !loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500">
              <Activity className="w-12 h-12 mb-3 opacity-20" />
              <p>Adjust variables and run simulation to see estimated effects.</p>
            </div>
          ) : scenario ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-8">
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Baseline HbA1c</p>
                  <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{scenario.baseline_prediction.toFixed(2)}%</p>
                </div>
                <ArrowRight className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Simulated HbA1c</p>
                  <p className={`text-3xl font-bold ${scenario.prediction_difference < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {scenario.scenario_prediction.toFixed(2)}%
                  </p>
                </div>
              </div>

              <div className="h-48 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dummyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHbA1c" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={scenario.prediction_difference < 0 ? "#10b981" : "#e11d48"} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={scenario.prediction_difference < 0 ? "#10b981" : "#e11d48"} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#9ca3af" strokeOpacity={0.2} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                    <YAxis domain={[6.0, 8.0]} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-colors-slate-800)', color: 'var(--tw-colors-gray-100)' }} />
                    <Area type="monotone" dataKey="hba1c" stroke={scenario.prediction_difference < 0 ? "#10b981" : "#e11d48"} strokeWidth={3} fillOpacity={1} fill="url(#colorHbA1c)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-800 dark:text-blue-300 leading-relaxed border border-blue-100 dark:border-blue-900/50">
                <span className="font-semibold text-blue-900 dark:text-blue-200">AI Insight: </span> 
                {scenario.message}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500">
               <Activity className="w-12 h-12 mb-3 opacity-20 animate-spin" />
               <p>Running live ML inference...</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
