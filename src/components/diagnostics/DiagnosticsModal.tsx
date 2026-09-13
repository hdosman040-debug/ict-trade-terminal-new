import React, { useState, useEffect } from 'react';
import { TestResult, TestRunner } from '../../testing/suite';
import { CheckCircle2, XCircle, ShieldCheck, Play, RefreshCw, X } from 'lucide-react';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ isOpen, onClose }) => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = TestRunner.runAllTests();
      setResults(res);
      setIsRunning(false);
    }, 100);
  };

  useEffect(() => {
    if (isOpen && results.length === 0) {
      runTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl text-slate-200 text-xs font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-base font-bold text-white">
                Engine Verification & Test Suite Diagnostics
              </h2>
              <span className="text-[10px] text-slate-400">
                Deterministic mathematical assertions & Section 73 No-Lookahead verification
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runTests}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>Re-run Tests</span>
            </button>
            <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
          {/* Summary Status Bar */}
          <div className="grid grid-cols-3 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
            <div>
              <span className="text-[10px] text-slate-500 block">Total Assertions</span>
              <strong className="text-base text-white">{total}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Passed</span>
              <strong className="text-base text-emerald-400">{passed}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Failed</span>
              <strong className={`text-base ${failed === 0 ? 'text-slate-500' : 'text-rose-400'}`}>
                {failed}
              </strong>
            </div>
          </div>

          {/* Test items list */}
          <div className="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border flex items-start justify-between gap-3 ${
                  r.passed
                    ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    : 'bg-rose-950/30 border-rose-900'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {r.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-sky-400 font-bold">
                        {r.suiteName}
                      </span>
                      <strong className="text-slate-200 text-xs">{r.testName}</strong>
                    </div>
                    <p className={`text-[11px] mt-1 ${r.passed ? 'text-slate-400' : 'text-rose-300'}`}>
                      {r.message}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  {r.executionTimeMs.toFixed(2)} ms
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
