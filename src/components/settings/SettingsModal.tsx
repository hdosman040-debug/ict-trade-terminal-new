import React from 'react';
import { RiskSettings } from '../../types/domain';
import { Settings, Shield, Keyboard, Trash2, X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: RiskSettings;
  onSaveSettings: (newSettings: RiskSettings) => void;
  onClearAllData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onClearAllData,
}) => {
  const [localSettings, setLocalSettings] = React.useState<RiskSettings>(settings);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl text-slate-200 text-xs font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">Terminal Risk & Execution Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
          {/* Risk Management Config */}
          <div className="space-y-3 bg-slate-950 p-4 rounded-lg border border-slate-800">
            <h3 className="font-bold text-sky-400 flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              Risk Rules & Capital Allocation
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Account Balance ($):</label>
                <input
                  type="number"
                  value={localSettings.accountBalance}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, accountBalance: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Risk Per Trade (%):</label>
                <input
                  type="number"
                  step="0.1"
                  value={localSettings.riskPercent}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, riskPercent: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Max Trades Per Day:</label>
                <input
                  type="number"
                  value={localSettings.maxTradesPerDay}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, maxTradesPerDay: parseInt(e.target.value, 10) || 1 })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Max Daily Risk (%):</label>
                <input
                  type="number"
                  step="0.5"
                  value={localSettings.maxDailyRiskPercent}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, maxDailyRiskPercent: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Max Consecutive Losses:</label>
                <input
                  type="number"
                  value={localSettings.maxConsecutiveLosses}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, maxConsecutiveLosses: parseInt(e.target.value, 10) || 1 })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Minimum R:R Threshold:</label>
                <input
                  type="number"
                  step="0.1"
                  value={localSettings.minRiskReward}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, minRiskReward: parseFloat(e.target.value) || 1.0 })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>
          </div>

          {/* NY AM Window Settings */}
          <div className="space-y-3 bg-slate-950 p-4 rounded-lg border border-slate-800">
            <h3 className="font-bold text-sky-400">ICT Primary Trading Window (America/New_York)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Window Start (NY):</label>
                <input
                  type="text"
                  value={localSettings.nyWindowStart}
                  onChange={(e) => setLocalSettings({ ...localSettings, nyWindowStart: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Window End (NY):</label>
                <input
                  type="text"
                  value={localSettings.nyWindowEnd}
                  onChange={(e) => setLocalSettings({ ...localSettings, nyWindowEnd: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts Reference */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <h3 className="font-bold text-sky-400 flex items-center gap-1.5">
              <Keyboard className="w-4 h-4" />
              Keyboard Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-sky-400 font-bold">Space</kbd> : Play / Pause Replay</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-sky-400 font-bold">→</kbd> : Next Candle</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-sky-400 font-bold">←</kbd> : Previous Candle</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-sky-400 font-bold">R</kbd> : Reset Replay</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-sky-400 font-bold">T</kbd> : Open Take Trade</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-sky-400 font-bold">F</kbd> : Toggle Reveal Future</div>
            </div>
          </div>

          {/* Data Reset Danger Zone */}
          <div className="bg-rose-950/20 border border-rose-900/40 p-4 rounded-lg flex items-center justify-between">
            <div>
              <strong className="text-rose-400 block text-xs">Clear Local Data Records</strong>
              <span className="text-[10px] text-slate-400">
                Resets journal records and resets to initial default states.
              </span>
            </div>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to clear all stored trade journal entries?')) {
                  onClearAllData();
                  onClose();
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded transition-colors text-xs font-bold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Trades</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-slate-950 border-t border-slate-800">
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold">
            Cancel
          </button>
          <button onClick={handleSave} className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded text-xs font-bold shadow-md">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
