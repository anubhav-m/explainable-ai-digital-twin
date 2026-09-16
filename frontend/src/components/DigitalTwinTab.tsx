import React, { useState, useEffect } from 'react';
import { UserCog, GitCommit, ChevronRight, Activity } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../App';

export const DigitalTwinTab = ({ patientId }: { patientId: string }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/patients/${patientId}/twin`)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [patientId]);

  if (loading) return <div className="p-6 text-gray-500">Loading chronological twin state...</div>;
  if (!data || !data.predictions || data.predictions.length === 0) {
    return <div className="p-6 text-gray-500">No timeline data available for {patientId}. Initialize the twin or log an update.</div>;
  }

  // Format predictions into timeline events
  const trajectoryEvents = data.predictions.map((pred: any, idx: number) => {
    const isCurrent = idx === data.predictions.length - 1;
    
    // Calculate top driver from SHAP
    let topDriver = "N/A";
    if (pred.shap_local && Object.keys(pred.shap_local).length > 0) {
       const shapData = Object.entries(pred.shap_local)
          .map(([k, v]) => ({ feature: k, value: v as number }))
          .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
       if (shapData.length > 0) {
           topDriver = shapData[0].feature;
       }
    }

    const riskLevel = pred.predicted_value > 7.0 ? 'High' : (pred.predicted_value > 6.4 ? 'Elevated' : 'Low');

    return {
      time: isCurrent ? 'Current State' : `Iteration ${idx + 1}`,
      event: isCurrent ? 'Digital Twin Synchronized' : `Historical Log`,
      hba1c: `${pred.predicted_value.toFixed(2)}%`,
      risk: riskLevel,
      topDriver: topDriver,
      note: `Model ${pred.model_version}. Primary driver: ${topDriver}`
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Digital Twin State</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Chronological log of observation updates and state changes.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="flex items-center mb-8">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl mr-4">
            <UserCog className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Longitudinal Patient History</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">State synchronization timeline for {patientId}</p>
          </div>
        </div>

        <div className="relative border-l-2 border-indigo-100 dark:border-indigo-900/50 ml-6 space-y-8">
          {trajectoryEvents.map((item: any, index: number) => (
            <div key={index} className="relative pl-8">
              <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 ${index === trajectoryEvents.length - 1 ? 'bg-indigo-600 border-indigo-200 dark:border-indigo-900' : 'bg-gray-300 dark:bg-gray-600 border-white dark:border-slate-800'}`}></div>
              
              <div className={`p-5 rounded-xl border ${index === trajectoryEvents.length - 1 ? 'border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-sm' : 'border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                    <GitCommit className="w-4 h-4 mr-2" />
                    {item.time}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    item.risk === 'Low' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                    item.risk === 'Elevated' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                    'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                  }`}>
                    {item.risk} Risk
                  </span>
                </div>
                
                <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">{item.event}</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{item.note}</p>
                
                <div className="flex items-center space-x-4 mt-4 pt-4 border-t border-gray-200/60 dark:border-slate-700">
                  <div className="text-sm flex items-center">
                    <Activity className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-1" />
                    <span className="text-gray-500 dark:text-gray-400">HbA1c: </span>
                    <span className="font-bold text-gray-800 dark:text-gray-200 ml-1">{item.hba1c}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  <div className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Top Driver: </span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{item.topDriver}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
