import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../store';
import type { Settings as SettingsType } from '../types';

const PROVIDER_MODELS: Record<SettingsType['aiProvider'], string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'o1', 'o1-mini'],
  anthropic: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-3-5-sonnet-20241022'],
  'azure-openai': ['gpt-4o', 'gpt-4', 'gpt-35-turbo'],
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
  xai: ['grok-2-1212', 'grok-beta'],
};

export function Settings() {
  const { settings, saveSettings } = useStore();
  const [form, setForm] = useState(settings);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSave = async () => {
    await saveSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const field = (key: keyof SettingsType, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const models = PROVIDER_MODELS[form.aiProvider] ?? [];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold text-slate-100 mb-6">Settings</h1>

      <div className="space-y-6 bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">AI Provider</label>
          <select
            value={form.aiProvider}
            onChange={e => {
              const provider = e.target.value as SettingsType['aiProvider'];
              const defaultModel = PROVIDER_MODELS[provider]?.[0] ?? '';
              setForm(f => ({ ...f, aiProvider: provider, model: defaultModel }));
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
          <label className="block text-sm font-medium text-slate-300 mb-2">API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={form.apiKey}
              onChange={e => field('apiKey', e.target.value)}
              placeholder="sk-..."
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 pr-10 text-sm text-slate-200 focus:outline-none focus:border-violet-500 font-mono"
            />
            <button
              onClick={() => setShowKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Model</label>
          <div className="flex gap-2">
            <select
              value={form.model}
              onChange={e => field('model', e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
            >
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input
              value={form.model}
              onChange={e => field('model', e.target.value)}
              placeholder="Custom model name"
              className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">Select from the dropdown or enter a custom model name.</p>
        </div>

        {(form.aiProvider === 'azure-openai' || form.aiProvider === 'groq' || form.aiProvider === 'xai') && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Base URL
              {form.aiProvider === 'azure-openai' && <span className="text-slate-500 font-normal ml-1">(required for Azure)</span>}
            </label>
            <input
              value={form.baseUrl ?? ''}
              onChange={e => field('baseUrl', e.target.value)}
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

      <div className="mt-6 bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h2 className="text-sm font-medium text-slate-300 mb-2">About</h2>
        <p className="text-xs text-slate-500">
          Playwright Test Studio uses an AI agent with Playwright MCP to run your plain-English tests.
          The AI reads your test script and controls a browser via Playwright to execute each step.
        </p>
      </div>
    </div>
  );
}
