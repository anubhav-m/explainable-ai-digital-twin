import React, { useState, useEffect } from 'react';
import { Lightbulb, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import axios from 'axios';
import { API_BASE } from '../App';

export const ExplainabilityTab = ({ patientId }: { patientId: string }) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    axios.get(`${API_BASE}/patients/${patientId}/prediction`)
      .then(res => setData(res.data))
      .catch(err => console.error(err));
  }, [patientId]);

  if (!data) return <div className="p-6 text-gray-500">Loading SHAP explanations...</div>;
  if (!data.current_prediction) return <div className="p-6 text-gray-500">No SHAP data available yet. Please log your first visit in the Overview tab.</div>;

  const currentPred = data.current_prediction;
  const shapLocal = currentPred.shap_local || {};
  
  // Convert dict to array and sort by absolute magnitude
  const shapData = Object.keys(shapLocal).map(key => ({
    feature: key,
    value: shapLocal[key],
    type: shapLocal[key] >= 0 ? 'positive' : 'negative'
  })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 5); // top 5

  const topDriver = shapData.find(d => d.type === 'positive');
  const topProtector = shapData.find(d => d.type === 'negative');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Model Explainability (SHAP)</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Local feature contributions driving the current HbA1c prediction.</p>
        </div>
        <div className="bg-blue-50 dark:bg-slate-800/50 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-full font-medium flex items-center border border-blue-200 dark:border-slate-700">
          <Lightbulb className="w-4 h-4 mr-2" />
          TreeExplainer
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Patient-Level Feature Contributions</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Features pushing the prediction higher (red) or lower (blue) than the base value.</p>
          </div>
          <div className="p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-gray-400">
             <Info className="w-5 h-5" />
          </div>
        </div>

        <div className="h-80 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={shapData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#9ca3af" strokeOpacity={0.2} />
              <XAxis type="number" hide />
              <YAxis dataKey="feature" type="category" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontWeight: 500}} width={100} />
              <RechartsTooltip 
                formatter={(value: any) => [Math.abs(value).toFixed(3), "SHAP Value"]}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-colors-slate-800)', color: 'var(--tw-colors-gray-100)' }} 
              />
              <Bar dataKey="value" barSize={24} radius={[0, 4, 4, 0]}>
                {shapData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.type === 'positive' ? '#ef4444' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-100 dark:border-slate-700">
          <div className="flex flex-col items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50 text-center">
            <TrendingUp className="w-6 h-6 text-red-500 dark:text-red-400 mb-2" />
            <h4 className="font-semibold text-gray-800 dark:text-gray-100">Top Risk Driver</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
               {topDriver ? `${topDriver.feature} contributes most strongly to elevated HbA1c prediction.` : 'No significant positive drivers.'}
            </p>
          </div>
          <div className="flex flex-col items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/50 text-center">
            <TrendingDown className="w-6 h-6 text-blue-500 dark:text-blue-400 mb-2" />
            <h4 className="font-semibold text-gray-800 dark:text-gray-100">Top Protective Factor</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
               {topProtector ? `${topProtector.feature} acts as a buffer against further elevation.` : 'No significant negative drivers.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
