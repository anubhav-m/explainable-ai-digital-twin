import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../App';
import { UserPlus, ArrowLeft } from 'lucide-react';

export const CreatePatient = () => {
  const navigate = useNavigate();
  const [patientId, setPatientId] = useState('');
  const [age, setAge] = useState(45);
  const [gender, setGender] = useState(1);
  const [bmi, setBmi] = useState(25.0);
  const [glucose, setGlucose] = useState(100.0);
  const [waist, setWaist] = useState(90.0);
  const [activity, setActivity] = useState(2);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/patients/`, {
        patient_id: patientId,
        demographics: { RIDAGEYR: age, RIAGENDR: gender },
        initial_clinical_state: { BMXBMI: bmi, BMXWAIST: waist, LBXGLU: glucose },
        initial_lifestyle_state: { PAQ605: activity, SMQ020: 2.0 }
      });
      navigate(`/patient/${patientId}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create patient');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-800 flex items-center mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center mb-8 border-b border-gray-100 pb-6">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl mr-4">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Create Patient Profile</h2>
              <p className="text-sm text-gray-500">Initialize a new Digital Twin state.</p>
            </div>
          </div>
          
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Patient ID</label>
              <input type="text" required value={patientId} onChange={e => setPatientId(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="e.g. PT_002" />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                <input type="number" required value={age} onChange={e => setAge(parseInt(e.target.value))} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <select value={gender} onChange={e => setGender(parseInt(e.target.value))} className="w-full px-4 py-2 border border-gray-200 rounded-xl">
                  <option value={1}>Male</option>
                  <option value={2}>Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Baseline BMI</label>
                <input type="number" step="0.1" required value={bmi} onChange={e => setBmi(parseFloat(e.target.value))} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Baseline Fasting Glucose</label>
                <input type="number" step="0.1" required value={glucose} onChange={e => setGlucose(parseFloat(e.target.value))} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Waist Circumference (cm)</label>
                <input type="number" step="0.1" required value={waist} onChange={e => setWaist(parseFloat(e.target.value))} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Physical Activity Level</label>
                <select value={activity} onChange={e => setActivity(parseInt(e.target.value))} className="w-full px-4 py-2 border border-gray-200 rounded-xl">
                  <option value={1}>Vigorous</option>
                  <option value={2}>Moderate</option>
                  <option value={3}>Low</option>
                </select>
              </div>
            </div>

            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors mt-8">Initialize Digital Twin</button>
          </form>
        </div>
      </div>
    </div>
  );
};
