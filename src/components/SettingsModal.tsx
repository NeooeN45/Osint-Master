import { useState } from "react";
import { X, Key, Save } from "lucide-react";
import { useCaseStore } from "../store/useCaseStore";

interface SettingsModalProps {
  onClose: () => void;
}

const API_KEYS = [
  { id: "openrouter", label: "OpenRouter", placeholder: "sk-or-...", description: "Chat IA + corrélation (gratuit disponible)" },
  { id: "shodan", label: "Shodan", placeholder: "...", description: "Scan IP, ports, CVEs" },
  { id: "hibp", label: "HaveIBeenPwned", placeholder: "...", description: "Fuites de données email" },
];

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { getApiKey, setApiKey } = useCaseStore();
  const [keys, setKeys] = useState<Record<string, string>>(
    Object.fromEntries(API_KEYS.map((k) => [k.id, getApiKey(k.id)]))
  );

  const handleSave = () => {
    Object.entries(keys).forEach(([id, val]) => setApiKey(id, val));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-2 border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-accent-cyan" /> Clés API
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {API_KEYS.map((k) => (
            <div key={k.id}>
              <label className="block text-sm font-medium text-slate-300 mb-1">{k.label}</label>
              <p className="text-xs text-slate-500 mb-2">{k.description}</p>
              <input
                type="password"
                value={keys[k.id] ?? ""}
                onChange={(e) => setKeys((prev) => ({ ...prev, [k.id]: e.target.value }))}
                placeholder={k.placeholder}
                className="w-full px-3 py-2 bg-surface-3 border border-border rounded-lg text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-accent-cyan transition-colors"
              />
            </div>
          ))}
        </div>

        <div className="p-5 pt-0 flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan rounded-xl hover:bg-accent-cyan/20 transition-all text-sm font-medium"
          >
            <Save className="w-4 h-4" /> Sauvegarder
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-border text-slate-400 rounded-xl hover:text-white transition-colors text-sm"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
