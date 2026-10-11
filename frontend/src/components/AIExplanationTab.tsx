import { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../App';
import { apiErrorMessage } from '../utils/api';
import { ErrorNote, PageHead, Plate, Sk } from './ui';

// Renders **bold** spans inside one line of text
const withBold = (text: string) =>
  text.split(/(\*\*.*?\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
      : part
  );

const NarrativeSkeleton = () => (
  <div aria-busy="true" aria-label="Retrieving evidence and writing your explanation">
    <Sk className="h-5 w-64" />
    {['w-full', 'w-11/12', 'w-full', 'w-2/3'].map((w, i) => <Sk key={i} className={`mt-3 h-4 max-w-[70ch] ${w}`} />)}
    <Sk className="mt-8 h-5 w-52" />
    {['w-11/12', 'w-full', 'w-5/6', 'w-1/2'].map((w, i) => <Sk key={i} className={`mt-3 h-4 max-w-[70ch] ${w}`} />)}
  </div>
);

export const AIExplanationTab = ({ patientId }: { patientId: string }) => {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [error, setError] = useState('');

  const fetchExplanation = () => {
    setLoading(true);
    setError('');
    axios.post(`${API_BASE}/patients/${patientId}/ask`, { query: "Explain my diabetes risk factors" })
      .then(res => {
        setExplanation(res.data.explanation);
        setMode(res.data.mode);
        setSources(res.data.sources || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(apiErrorMessage(err, "The explanation could not be written. Try again."));
        setLoading(false);
      });
  };

  return (
    <>
      <PageHead
        title="Explain it to me"
        term="AI Explanation · RAG"
        action={
          <button onClick={fetchExplanation} disabled={loading} className="btn">
            {loading ? 'Writing' : explanation ? 'Write it again' : 'Explain my estimate'}
          </button>
        }
      >
        A plain-language read of your twin, written from your own numbers and backed by guideline text.
      </PageHead>

      <div className="grid gap-10 lg:grid-cols-12">

        {/* RAG Generation Panel */}
        <Plate className="min-h-[400px] lg:col-span-8" label="Explanation">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[1.4rem] leading-tight tracking-[-0.01em]">What your numbers mean</h2>
            {mode && !loading && (
              <span className="label bg-seal px-2.5 py-1">
                {mode === 'llm' ? 'Written by Gemini' : 'Template mode: no LLM configured'}
              </span>
            )}
          </div>

          {error && <div className="mb-6"><ErrorNote message={error} onRetry={fetchExplanation} /></div>}

          {loading ? (
            <NarrativeSkeleton />
          ) : !explanation ? (
            <div className="dots flex min-h-[260px] items-end">
              <p className="max-w-[44ch] bg-sheet p-5 text-mute">Nothing written yet. Use "Explain my estimate" and the assistant will read your latest twin state and the guidelines.</p>
            </div>
          ) : (
            <div className="view max-w-[70ch] space-y-3 text-[17px] leading-relaxed">
              {explanation.split('\n').map((line, idx) => {
                const text = line.trim();
                if (!text) return null;
                if (text.startsWith('#')) {
                  return <h3 key={idx} className="pt-4 text-xl font-medium leading-tight first:pt-0">{text.replace(/^#+\s*/, '')}</h3>;
                }
                if (/^[-*]\s/.test(text)) {
                  return <p key={idx} className="relative pl-6 before:absolute before:left-0 before:top-[0.8em] before:h-px before:w-3 before:bg-ink">{withBold(text.slice(2))}</p>;
                }
                return <p key={idx}>{withBold(text)}</p>;
              })}
            </div>
          )}
        </Plate>

        {/* Retrieved Sources */}
        <Plate className="lg:col-span-4" i={1} label="Guideline sources">
          <h2 className="text-[1.4rem] leading-tight tracking-[-0.01em]">Guidelines it read</h2>

          {loading ? (
            <div className="mt-5" aria-hidden>
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="border-t border-hair py-4"><Sk className="h-3 w-32" /><Sk className="mt-3 h-4 w-full" /><Sk className="mt-2 h-4 w-4/5" /></div>
              ))}
            </div>
          ) : sources.length > 0 ? (
            <ul className="view mt-5 border-b border-hair">
              {sources.map((src, idx) => (
                <li key={idx} className="border-t border-hair py-4">
                  <p className="label text-mute">{src.source}</p>
                  <blockquote className="mt-2 text-[15px]">{src.text}</blockquote>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-mute">
              {explanation ? "No sources were returned." : "The passages used for your explanation will be listed here."}
            </p>
          )}
        </Plate>

      </div>
    </>
  );
};
