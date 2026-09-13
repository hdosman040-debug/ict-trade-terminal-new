import React, { useState } from 'react';
import {
  autoDetectMapping,
  CSVColumnMapping,
  CSVImportResult,
  importOHLCVCSV,
  parseCSVHeader,
  TimezoneMode,
} from '../../domain/marketData/csvImporter';
import { HISTORICAL_SESSIONS } from '../../domain/marketData/historicalDatasets';
import { Instrument } from '../../types/domain';
import {
  Upload,
  Database,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';

interface DataManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentInstrument: Instrument;
  currentDate: string;
  onSelectSession: (instrument: Instrument, date: string) => void;
  onImportCustomCandles: (
    datasetId: string,
    instrument: Instrument,
    timeframe: string,
    candles: any[]
  ) => void;
}

export const DataManagerModal: React.FC<DataManagerModalProps> = ({
  isOpen,
  onClose,
  currentInstrument,
  currentDate,
  onSelectSession,
  onImportCustomCandles,
}) => {
  const [activeTab, setActiveTab] = useState<'sessions' | 'csv'>('sessions');

  // CSV Importer state
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<CSVColumnMapping>({
    timeCol: '',
    openCol: '',
    highCol: '',
    lowCol: '',
    closeCol: '',
    volumeCol: '',
  });
  const [targetInstrument, setTargetInstrument] = useState<Instrument>(currentInstrument);
  const [timezoneMode, setTimezoneMode] = useState<TimezoneMode>('UTC');
  const [customOffsetHours, setCustomOffsetHours] = useState<number>(0);
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      const parsed = parseCSVHeader(text);
      setHeaders(parsed.headers);
      setMapping(autoDetectMapping(parsed.headers));
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const handleProcessCSV = () => {
    if (!csvText) return;
    const result = importOHLCVCSV(
      csvText,
      mapping,
      targetInstrument,
      timezoneMode,
      customOffsetHours
    );
    setImportResult(result);

    if (result.success && result.candles.length > 0) {
      onImportCustomCandles(
        fileName || 'custom_import',
        targetInstrument,
        result.detectedTimeframe || 'M5',
        result.candles
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl text-slate-200 text-xs font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">Market Data & Historical Sessions</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-2">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 border-b-2 font-bold transition-colors ${
              activeTab === 'sessions'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Built-in ICT Sessions
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`px-4 py-2 border-b-2 font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'csv'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            CSV OHLCV Importer
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
          {activeTab === 'sessions' ? (
            <div className="space-y-3">
              <p className="text-slate-400 text-[11px]">
                Select an authentic ICT market replay session. Every session includes Asia range, London liquidity sweep, Judas swing, and NY AM 09:45–12:00 setup expansion:
              </p>

              <div className="space-y-2">
                {HISTORICAL_SESSIONS.map((session) => {
                  const isCurrent =
                    session.instrument === currentInstrument && session.date === currentDate;
                  return (
                    <div
                      key={`${session.instrument}_${session.date}`}
                      className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-sky-950/40 border-sky-500 ring-1 ring-sky-500/40'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                      onClick={() => {
                        onSelectSession(session.instrument, session.date);
                        onClose();
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{session.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-sky-300 font-bold">
                            {session.instrument}
                          </span>
                        </div>
                        {isCurrent ? (
                          <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> CURRENT ACTIVE
                          </span>
                        ) : (
                          <span className="text-xs text-sky-400 hover:underline">Load Session →</span>
                        )}
                      </div>

                      <p className="text-slate-400 text-[11px] mt-1.5">{session.setupSummary}</p>

                      <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-slate-500 pt-2 border-t border-slate-800/80">
                        <span>PDH: <strong className="text-slate-300">{session.pdh}</strong></span>
                        <span>PDL: <strong className="text-slate-300">{session.pdl}</strong></span>
                        <span>London High: <strong className="text-slate-300">{session.londonHigh}</strong></span>
                        <span>London Low: <strong className="text-slate-300">{session.londonLow}</strong></span>
                        <span>Asia Range: <strong className="text-slate-300">{session.asiaLow} - {session.asiaHigh}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* CSV Importer Tab */
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-sky-400" />
                  Upload Historical OHLCV CSV File
                </h3>
                <p className="text-slate-400 text-[11px]">
                  Supports NinjaTrader, MetaTrader, TradingView, or proprietary CSV exports. Includes strict timezone handling to prevent lookahead or incorrect session alignment.
                </p>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer transition-colors">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Choose CSV File</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                  <span className="text-slate-400 text-[11px]">
                    {fileName || 'No file selected yet'}
                  </span>
                </div>
              </div>

              {headers.length > 0 && (
                <div className="space-y-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <h4 className="font-bold text-sky-400">Column Mapping & Timezone Safeguards</h4>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Target Instrument:</label>
                      <select
                        value={targetInstrument}
                        onChange={(e) => setTargetInstrument(e.target.value as Instrument)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-white"
                      >
                        <option value="US30">US30</option>
                        <option value="NAS100">NAS100</option>
                        <option value="XAUUSD">XAUUSD</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">CSV Timezone Interpretation:</label>
                      <select
                        value={timezoneMode}
                        onChange={(e) => setTimezoneMode(e.target.value as TimezoneMode)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-white"
                      >
                        <option value="UTC">UTC (No offset)</option>
                        <option value="America/New_York">America/New_York (Raw matches NY)</option>
                        <option value="Broker_UTC_PLUS_2">Broker Time (UTC+2)</option>
                        <option value="Broker_UTC_PLUS_3">Broker Time (UTC+3)</option>
                        <option value="Custom">Custom Offset</option>
                      </select>
                    </div>

                    {timezoneMode === 'Custom' && (
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Custom Offset (Hours):</label>
                        <input
                          type="number"
                          value={customOffsetHours}
                          onChange={(e) => setCustomOffsetHours(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Header Mapping Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-2">
                    {(['timeCol', 'openCol', 'highCol', 'lowCol', 'closeCol'] as (keyof CSVColumnMapping)[]).map(
                      (key) => (
                        <div key={key}>
                          <label className="text-[10px] text-slate-500 uppercase block mb-1">
                            {key.replace('Col', '')} Column
                          </label>
                          <select
                            value={mapping[key] || ''}
                            onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-xs"
                          >
                            <option value="">-- Select --</option>
                            {headers.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>
                      )
                    )}
                  </div>

                  <button
                    onClick={handleProcessCSV}
                    className="w-full py-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
                  >
                    Validate & Import Candles
                  </button>
                </div>
              )}

              {/* Import Feedback */}
              {importResult && (
                <div
                  className={`p-4 rounded-lg border ${
                    importResult.success
                      ? 'bg-emerald-950/20 border-emerald-900 text-emerald-300'
                      : 'bg-rose-950/20 border-rose-900 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {importResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-400" />
                    )}
                    <span>
                      {importResult.success
                        ? `Successfully imported ${importResult.rowsImported} candles into local terminal buffer!`
                        : 'CSV Import Failed'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-emerald-900/40 text-[11px]">
                    <div>Rows Imported: <strong>{importResult.rowsImported}</strong></div>
                    <div>Rows Rejected: <strong>{importResult.rowsRejected}</strong></div>
                    <div>Timeframe: <strong>{importResult.detectedTimeframe}</strong></div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="mt-2 text-[10px] text-amber-300/80">
                      {importResult.errors.map((err, idx) => (
                        <div key={idx}>• {err}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
