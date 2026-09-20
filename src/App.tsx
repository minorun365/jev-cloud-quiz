import { useMemo, useState } from 'react';
import { CLOUDS, shuffled, type Cloud, type Question } from './questions.ts';

interface Result {
  choice: Cloud;
  confidence: number;
  probabilities: Record<Cloud, number>;
  model: string;
  serverMs: number;
  totalMs: number;
}

export function App() {
  const questions = useMemo(() => shuffled(), []);
  const [current, setCurrent] = useState<Question | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function ask(question: Question) {
    if (pending) return;
    setCurrent(question);
    setResult(null);
    setError('');
    setPending(true);
    const startedAt = performance.now();
    try {
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: question.name }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || '判定できませんでした');
      setResult({ ...body, totalMs: Math.round(performance.now() - startedAt) });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '判定できませんでした');
    } finally {
      setPending(false);
    }
  }

  const ranked = result
    ? [...CLOUDS].sort((a, b) => result.probabilities[b.id] - result.probabilities[a.id])
    : CLOUDS;
  const correct = result && current ? result.choice === current.answer : null;

  return (
    <>
      <header className="hero">
        <div className="hero-in">
          <h1>Jev クラウド判定</h1>
          <p>選んだ機能名が三大クラウドのどれのものか、確率つきで返します</p>
        </div>
      </header>

      <main className="wrap">
        <h2>機能名を選ぶ</h2>
        <div className="chips">
          {questions.map((question) => (
            <button
              key={question.name}
              type="button"
              className={`chip${current?.name === question.name ? ' on' : ''}`}
              onClick={() => ask(question)}
              disabled={pending}
            >
              {question.name}
            </button>
          ))}
        </div>

        {current && (
          <section className="result" aria-live="polite">
            <div className="result-head">
              <span className="picked">{current.name}</span>
              {result && (
                <span className={`verdict${correct ? ' hit' : ' miss'}`}>
                  {correct ? '正解' : '不正解'}
                </span>
              )}
            </div>

            {pending && <p className="waiting">判定中</p>}
            {error && <p className="error">{error}</p>}

            {result && (
              <>
                <ul className="bars">
                  {ranked.map((cloud) => {
                    const value = result.probabilities[cloud.id] ?? 0;
                    return (
                      <li key={cloud.id}>
                        <span className="bar-label">{cloud.label}</span>
                        <span className="track">
                          <span
                            className={`fill${cloud.id === result.choice ? ' top' : ''}`}
                            style={{ width: `${Math.max(value * 100, 0.6)}%` }}
                          />
                        </span>
                        <span className="value">{value.toFixed(2)}</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="timing">
                  <b>{result.serverMs} ms</b>
                  <span>モデル側</span>
                  <b>{result.totalMs} ms</b>
                  <span>画面までの往復</span>
                  <span className="model">{result.model}</span>
                </p>
              </>
            )}
          </section>
        )}
      </main>
    </>
  );
}
