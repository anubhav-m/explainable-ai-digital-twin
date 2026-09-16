import React, { useState } from 'react';
import { FileText, Bot, Sparkles, BookOpen } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../App';

export const AIExplanationTab = ({ patientId }: { patientId: string }) => {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [sources, setSources] = useState<any[]>([]);

  const fetchExplanation = () => {
    setLoading(true);
    axios.post(`${API_BASE}/patients/${patientId}/ask`, { query: "Explain my diabetes risk factors" })
      .then(res => {
        setExplanation(res.data.explanation);
        setSources(res.data.sources || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setExplanation("Error generating explanation. Please try again.");
        setLoading(false);
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">AI Clinical Explanation</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* RAG Generation Panel */}
        <div className="md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-4 mb-4">
            <div className="flex items-center">
              <Bot className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mr-2" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">Clinical Narrative</h3>
            </div>
            {!explanation && !loading && (
              <button 
                onClick={fetchExplanation}
                className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg text-sm font-semibold transition-colors flex items-center"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Insight
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
              <Sparkles className="w-8 h-8 mb-4 animate-spin text-indigo-300 dark:text-indigo-700" />
              <p>Retrieving evidence and generating explanation...</p>
            </div>
          ) : !explanation ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
              <FileText className="w-12 h-12 mb-4 opacity-20" />
              <p>Click "Generate Insight" to synthesize the live Digital Twin state.</p>
            </div>
          ) : (
            <div className="flex-1 text-gray-700 dark:text-gray-300 leading-relaxed space-y-4 animate-in fade-in duration-500">
              {explanation.split('\n').map((paragraph, idx) => {
                if (!paragraph.trim()) return null;
                // Simple bolding for **text**
                const parts = paragraph.split(/(\*\*.*?\*\*)/g);
                return (
                  <p key={idx}>
                    {parts.map((part, i) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
                      }
                      return part;
                    })}
                  </p>
                );
              })}
            </div>
          )}
        </div>

        {/* Retrieved Sources */}
        <div className="bg-gray-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-gray-200 dark:border-slate-700">
          <div className="flex items-center mb-6">
            <BookOpen className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Retrieved Guidelines</h3>
          </div>
          
          <div className="space-y-4">
            {sources.length > 0 ? (
              sources.map((src, idx) => (
                <div key={idx} className="p-3 bg-white dark:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-600 shadow-sm text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-semibold text-indigo-700 dark:text-indigo-400 block mb-1">{src.source}</span>
                  "{src.text}"
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                {explanation ? "No sources were returned." : "Sources will appear here after generation."}
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
