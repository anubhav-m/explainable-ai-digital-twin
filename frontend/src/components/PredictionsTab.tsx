import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { API_BASE } from '../App';

export const PredictionsTab = ({ patientId }: { patientId: string }) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    axios.get(`${API_BASE}/patients/${patientId}/prediction`)
      .then(res => setData(res.data))
      .catch(err => console.error(err));
  }, [patientId]);

  if (!data) return <div className="p-6 text-gray-500">Loading prediction data...</div>;
  if (!data.current_prediction) return <div className="p-6 text-gray-500">No predictions generated yet. Please log your first visit in the Overview tab to initialize the ML models.</div>;

  const currentPred = data.current_prediction;
  const historyData = data.history;
  
  const hba1c = currentPred.predicted_value.toFixed(2);
  const isHighRisk = currentPred.predicted_value > 7.0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Predictions & Risk</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Machine Learning predictive forecasting based on current Digital Twin state.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Current Prediction */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group">
          <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-50 ${isHighRisk ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}></div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6 relative z-10">Predicted HbA1c (Current)</h3>
          
          <div className="flex items-center justify-center mb-6 relative z-10">
            <div className={`w-48 h-48 rounded-full border-8 flex flex-col items-center justify-center bg-white dark:bg-slate-800 shadow-inner ${isHighRisk ? 'border-rose-100 dark:border-rose-900/50' : 'border-emerald-100 dark:border-emerald-900/50'}`}>
              <span className={`text-5xl font-black ${isHighRisk ? 'text-rose-600 dark:text-rose-500' : 'text-emerald-600 dark:text-emerald-500'}`}>{hba1c}<span className={`text-2xl ${isHighRisk ? 'text-rose-400 dark:text-rose-500' : 'text-emerald-400 dark:text-emerald-500'}`}>%</span></span>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 uppercase tracking-wide">{isHighRisk ? 'Elevated Risk' : 'Normal Risk'}</span>
            </div>
          </div>
          
          <div className={`rounded-xl p-4 flex items-start text-sm relative z-10 ${isHighRisk ? 'bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800/50 text-rose-800 dark:text-rose-300' : 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300'}`}>
            <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
            <p>The {currentPred.model_name} engine predicts an HbA1c of {hba1c}%. {isHighRisk ? 'This passes the 7.0% threshold for microvascular complications.' : 'This is within normal boundaries.'}</p>
          </div>
        </div>

        {/* Prediction Trajectory */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6">Historical Risk Trajectory</h3>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isHighRisk ? "#e11d48" : "#10b981"} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={isHighRisk ? "#e11d48" : "#10b981"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#9ca3af" strokeOpacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                <YAxis domain={[0, 'auto']} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="hba1c" stroke={isHighRisk ? "#e11d48" : "#10b981"} strokeWidth={3} fillOpacity={1} fill="url(#colorRisk)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 grid grid-cols-2 gap-4">
             <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mr-2" />
                Model: {currentPred.model_name} {currentPred.model_version}
             </div>
             <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mr-2" />
                Features: {currentPred.feature_version}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};
