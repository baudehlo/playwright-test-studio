import { invoke } from '@tauri-apps/api/core';
import { Eye, EyeOff, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStore } from '../store';
import type { Settings as SettingsType } from '../types';

const SIDEBAR_WIDTH_KEY = 'pts.layout.sidebarWidth';
const RUN_PANEL_HEIGHT_KEY = 'pts.layout.runPanelHeight';
const SCREENSHOTS_WIDTH_KEY = 'pts.layout.runPanel.screenshotsWidth';

const PROVIDER_MODELS: Record<SettingsType['aiProvider'], string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'o1', 'o1-mini'],
  anthropic: [
    'claude-opus-4-5',
    'claude-sonnet-4-5',
    'claude-haiku-4-5',
    'claude-3-5-sonnet-20241022',
  ],
  'azure-openai': ['gpt-4o', 'gpt-4', 'gpt-35-turbo'],
  groq: [
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'mixtral-8x7b-32768',
  ],
  xai: ['grok-2-1212', 'grok-beta'],
};

export function Settings() {
  const { settings, saveSettings, globalVariables, saveGlobalVariables } =
    useStore();
  const [form, setForm] = useState(settings);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [globalVars, setGlobalVars] = useState<
    Array<{ key: string; value: string }>
  >([]);
  const [globalVarsDirty, setGlobalVarsDirty] = useState(false);
  const [globalVarsSaved, setGlobalVarsSaved] = useState(false);
  const [layoutReset, setLayoutReset] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  useEffect(() => {
    setGlobalVars(
      Object.entries(globalVariables).map(([key, value]) => ({ key, value })),
    );
  }, [globalVariables]);

  const handleSave = async () => {
    await saveSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveGlobalVars = async () => {
    const varsRecord: Record<string, string> = {};
    for (const { key, value } of globalVars) {
      if (key.trim()) varsRecord[key.trim()] = value;
    }
    await saveGlobalVariables(varsRecord);
    setGlobalVarsDirty(false);
    setGlobalVarsSaved(true);
    setTimeout(() => setGlobalVarsSaved(false), 2000);
  };

  const addGlobalVar = () => {
    setGlobalVars((v) => [...v, { key: '', value: '' }]);
    setGlobalVarsDirty(true);
  };

  const removeGlobalVar = (idx: number) => {
    setGlobalVars((v) => v.filter((_, i) => i !== idx));
    setGlobalVarsDirty(true);
  };

  const updateGlobalVar = (
    idx: number,
    field: 'key' | 'value',
    val: string,
  ) => {
    setGlobalVars((v) =>
      v.map((item, i) => (i === idx ? { ...item, [field]: val } : item)),
    );
    setGlobalVarsDirty(true);
  };

  const field = (key: keyof SettingsType, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleResetLayout = async () => {
    window.localStorage.removeItem(SIDEBAR_WIDTH_KEY);
    window.localStorage.removeItem(RUN_PANEL_HEIGHT_KEY);
    window.localStorage.removeItem(SCREENSHOTS_WIDTH_KEY);
    await invoke('clear_window_state');
    setLayoutReset(true);
    setTimeout(() => setLayoutReset(false), 2000);
    window.location.reload();
  };

  const models = PROVIDER_MODELS[form.aiProvider] ?? [];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold text-slate-100 mb-6">Settings</h1>

      <div className="space-y-6 bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            AI Provider
          </label>
          <select
            value={form.aiProvider}
            onChange={(e) => {
              const provider = e.target.value as SettingsType['aiProvider'];
              const defaultModel = PROVIDER_MODELS[provider]?.[0] ?? '';
              setForm((f) => ({
                ...f,
                aiProvider: provider,
                model: defaultModel,
              }));
            }}
            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="azure-openai">Azure OpenAI</option>
            <option value="groq">Groq</option>
            <option value="xai">xAI / Grok</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={form.apiKey}
              onChange={(e) => field('apiKey', e.target.value)}
              placeholder="sk-..."
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 pr-10 text-sm text-slate-200 focus:outline-none focus:border-violet-500 font-mono"
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showKey ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Model
          </label>
          <div className="flex gap-2">
            <select
              value={form.model}
              onChange={(e) => field('model', e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              value={form.model}
              onChange={(e) => field('model', e.target.value)}
              placeholder="Custom model name"
              className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Select from the dropdown or enter a custom model name.
          </p>
        </div>

        {(form.aiProvider === 'azure-openai' ||
          form.aiProvider === 'groq' ||
          form.aiProvider === 'xai') && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Base URL
              {form.aiProvider === 'azure-openai' && (
                <span className="text-slate-500 font-normal ml-1">
                  (required for Azure)
                </span>
              )}
            </label>
            <input
              value={form.baseUrl ?? ''}
              onChange={(e) => field('baseUrl', e.target.value)}
              placeholder={
                form.aiProvider === 'azure-openai'
                  ? 'https://your-resource.openai.azure.com'
                  : 'https://api.groq.com/openai/v1'
              }
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
            />
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
              saved
                ? 'bg-green-600 text-white'
                : 'bg-violet-600 hover:bg-violet-500 text-white'
            }`}
          >
            <Save className="w-4 h-4" />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="mt-6 bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-medium text-slate-300">
              Global Variables
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Available in all tests across all collections. Use{' '}
              <code className="text-violet-400">{'${varName}'}</code> in
              scripts. Overridden by collection variables and test variables.
            </p>
          </div>
          <button
            onClick={addGlobalVar}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
        {globalVars.length === 0 ? (
          <p className="text-xs text-slate-600 italic">
            No global variables defined.
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {globalVars.map((v, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  value={v.key}
                  onChange={(e) => updateGlobalVar(idx, 'key', e.target.value)}
                  placeholder="Variable name"
                  className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500 font-mono"
                />
                <input
                  value={v.value}
                  onChange={(e) =>
                    updateGlobalVar(idx, 'value', e.target.value)
                  }
                  placeholder="Value"
                  className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                />
                <button
                  onClick={() => removeGlobalVar(idx)}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {(globalVarsDirty || globalVars.length > 0) && (
          <div className="flex justify-end">
            <button
              onClick={handleSaveGlobalVars}
              disabled={!globalVarsDirty}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                globalVarsSaved
                  ? 'bg-green-600 text-white'
                  : globalVarsDirty
                    ? 'bg-violet-600 hover:bg-violet-500 text-white'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              {globalVarsSaved ? 'Saved!' : 'Save Global Variables'}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h2 className="text-sm font-medium text-slate-300 mb-3">Layout</h2>
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Reset panel sizes and window size/position back to defaults.
          </p>
          <button
            onClick={handleResetLayout}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              layoutReset
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
            }`}
          >
            {layoutReset ? 'Reset!' : 'Reset Layout'}
          </button>
        </div>
      </div>

      <div className="mt-6 bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h2 className="text-sm font-medium text-slate-300 mb-2">About</h2>
        <p className="text-xs text-slate-500">
          Playwright Test Studio uses an AI agent with Playwright MCP to run
          your plain-English tests. The AI reads your test script and controls a
          browser via Playwright to execute each step.
        </p>
      </div>
    </div>
  );
}
