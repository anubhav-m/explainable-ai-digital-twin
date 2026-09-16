import React, { useState, useEffect } from 'react';
import { User, Activity, Heart, Thermometer, Droplet, Clock, Plus, X } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../App';

export const PatientOverview = ({ patientId }: { patientId: string }) => {
  const [data, setData] = useState<any>(null);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [newBmi, setNewBmi] = useState(0);
  const [newGlu, setNewGlu] = useState(0);
  const [newWaist, setNewWaist] = useState(0);
  const [newActivity, setNewActivity] = useState(2);
  const [loading, setLoading] = useState(false);
  const [showDemoForm, setShowDemoForm] = useState(false);
  const [newAge, setNewAge] = useState(45);
  const [newGender, setNewGender] = useState(1);

  useEffect(() => {
    fetchData();
  }, [patientId]);

  const fetchData = () => {
    axios.get(`${API_BASE}/patients/${patientId}/twin`)
      .then(res => {
        setData(res.data);
        if (res.data.clinical_state) {
          setNewBmi(res.data.clinical_state.BMXBMI || 0);
          setNewGlu(res.data.clinical_state.LBXGLU || 0);
          setNewWaist(res.data.clinical_state.BMXWAIST || 0);
        }
        if (res.data.demographics) {
          setNewAge(res.data.demographics.RIDAGEYR || 45);
          setNewGender(res.data.demographics.RIAGENDR || 1);
        }
        if (res.data.lifestyle_state) {
          setNewActivity(res.data.lifestyle_state.PAQ605 || 2);
        }
      })
      .catch(err => console.error(err));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/patients/${patientId}/update`, {
        data: {
          BMXBMI: newBmi,
          LBXGLU: newGlu,
          BMXWAIST: newWaist,
          PAQ605: newActivity
        }
      });
      await fetchData(); // Refresh data
      setShowUpdateForm(false);
      
      // Force reload page to refresh all tabs (Predictions, SHAP)
      window.location.reload(); 
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/patients/${patientId}/demographics`, {
        age: newAge,
        gender: newGender
      });
      await fetchData();
      setShowDemoForm(false);
      window.location.reload(); 
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!data) return <div className="p-6 text-gray-500">Loading patient data...</div>;

  const age = data.demographics?.RIDAGEYR || '--';
  const gender = data.demographics?.RIAGENDR === 1 ? 'Male' : 'Female';
  
  const bmi = data.clinical_state?.BMXBMI || '--';
  const waist = data.clinical_state?.BMXWAIST || '--';
  const glu = data.clinical_state?.LBXGLU || '--';
  
  const activityMap: Record<number, string> = { 1: 'Vigorous', 2: 'Moderate', 3: 'Low' };
  const activityStr = data.lifestyle_state?.PAQ605 ? activityMap[data.lifestyle_state.PAQ605] : '--';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Patient Overview</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Real-time clinical state and demographics for {patientId}</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => setShowUpdateForm(!showUpdateForm)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center transition-colors shadow-sm">
            {showUpdateForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showUpdateForm ? 'Cancel Update' : 'Log New Visit'}
          </button>
        </div>
      </div>

      {showUpdateForm && (
        <div className="bg-blue-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-blue-100 dark:border-slate-700 shadow-inner animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-400 mb-4">Log New Clinical Observation</h3>
          <form onSubmit={handleUpdate} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">BMI</label>
              <input type="number" step="0.1" value={newBmi} onChange={e=>setNewBmi(parseFloat(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required/>
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Fasting Glu</label>
              <input type="number" step="0.1" value={newGlu} onChange={e=>setNewGlu(parseFloat(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required/>
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Waist (cm)</label>
              <input type="number" step="0.1" value={newWaist} onChange={e=>setNewWaist(parseFloat(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required/>
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Activity Level</label>
              <select value={newActivity} onChange={e=>setNewActivity(parseInt(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value={1}>Vigorous</option>
                <option value={2}>Moderate</option>
                <option value={3}>Low</option>
              </select>
            </div>
            <div className="col-span-2 md:col-span-4 mt-2">
              <button type="submit" disabled={loading} className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-400">
                {loading ? 'Processing ML Update...' : 'Submit & Update Digital Twin State'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Demographics Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
          
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl mr-4">
                <User className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Demographics</h3>
            </div>
            <button onClick={() => setShowDemoForm(!showDemoForm)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium">
              {showDemoForm ? 'Cancel' : 'Edit'}
            </button>
          </div>
          
          {showDemoForm ? (
            <form onSubmit={handleDemoUpdate} className="space-y-3 relative z-10 animate-in slide-in-from-top-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Age (Years)</label>
                <input type="number" value={newAge} onChange={e=>setNewAge(parseInt(e.target.value))} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Gender</label>
                <select value={newGender} onChange={e=>setNewGender(parseInt(e.target.value))} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={1}>Male</option>
                  <option value={2}>Female</option>
                </select>
              </div>
              <div className="pt-2">
                <button type="submit" disabled={loading} className="w-full py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
                  {loading ? 'Saving...' : 'Save Demographics'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 relative z-10">
              <div className="flex justify-between border-b border-gray-50 dark:border-slate-700 pb-2">
                <span className="text-gray-500 dark:text-gray-400">Age</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{age} Years</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 dark:border-slate-700 pb-2">
                <span className="text-gray-500 dark:text-gray-400">Gender</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{gender}</span>
              </div>
            </div>
          )}
        </div>

        {/* Clinical Vitals */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group hover:shadow-md transition-shadow md:col-span-2">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center mb-4 relative z-10">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl mr-4">
              <Heart className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Current Clinical Vitals</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 relative z-10">
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-100 dark:border-slate-600 flex flex-col items-center justify-center text-center">
              <Thermometer className="w-5 h-5 text-rose-500 dark:text-rose-400 mb-2" />
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">BMI</span>
              <span className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{bmi}</span>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-100 dark:border-slate-600 flex flex-col items-center justify-center text-center">
              <Droplet className="w-5 h-5 text-sky-500 dark:text-sky-400 mb-2" />
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Fasting Glu</span>
              <span className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{glu} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">mg/dL</span></span>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-100 dark:border-slate-600 flex flex-col items-center justify-center text-center">
              <Activity className="w-5 h-5 text-amber-500 dark:text-amber-400 mb-2" />
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Waist</span>
              <span className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{waist} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">cm</span></span>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-100 dark:border-slate-600 flex flex-col items-center justify-center text-center">
              <Clock className="w-5 h-5 text-purple-500 dark:text-purple-400 mb-2" />
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Activity</span>
              <span className="text-lg font-bold text-gray-800 dark:text-gray-100 mt-1 leading-tight">{activityStr}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
