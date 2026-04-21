import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  Download,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import type { BrowserName, Settings as SettingsType } from '../types';
import { BrowserSelector } from './BrowserSelector';

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
  github: [
    'gpt-4o',
    'gpt-4o-mini',
    'o1',
    'o1-mini',
    'claude-3-5-sonnet',
    'claude-3-5-haiku',
    'meta-llama-3.1-405b-instruct',
    'meta-llama-3.1-70b-instruct',
  ],
};

async function getModelsFromApi(
  provider: SettingsType['aiProvider'],
  apiKey: string,
  baseUrl?: string,
): Promise<string[]> {
  switch (provider) {
    case 'openai': {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return [];
      const data: { data: { id: string }[] } = await res.json();
      return (data.data ?? [])
        .map((m) => m.id)
        .filter((id) => /^(gpt-|o1|o3|o4|chatgpt-)/.test(id))
        .sort((a, b) => b.localeCompare(a));
    }
    case 'anthropic': {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      });
      if (!res.ok) return [];
      const data: { data: { id: string }[] } = await res.json();
      return (data.data ?? []).map((m) => m.id);
    }
    case 'azure-openai': {
      if (!baseUrl) return [];
      const url = `${baseUrl.replace(/\/$/, '')}/openai/deployments?api-version=2024-02-01`;
      const res = await fetch(url, { headers: { 'api-key': apiKey } });
      if (!res.ok) return [];
      const data: { value: { id: string }[] } = await res.json();
      return (data.value ?? []).map((d) => d.id);
    }
    case 'groq': {
      const base = baseUrl ?? 'https://api.groq.com/openai/v1';
      const res = await fetch(`${base.replace(/\/$/, '')}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return [];
      const data: { data: { id: string }[] } = await res.json();
      return (data.data ?? []).map((m) => m.id);
    }
    case 'xai': {
      const base = baseUrl ?? 'https://api.x.ai/v1';
      const res = await fetch(`${base.replace(/\/$/, '')}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return [];
      const data: { data: { id: string }[] } = await res.json();
      return (data.data ?? []).map((m) => m.id);
    }
    case 'github': {
      const res = await fetch('https://models.inference.ai.azure.com/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return [];
      const raw: unknown = await res.json();
      if (Array.isArray(raw)) {
        return (raw as { name?: string; id?: string }[])
          .map((m) => m.name ?? m.id ?? '')
          .filter(Boolean);
      }
      return ((raw as { data: { id: string }[] }).data ?? []).map((m) => m.id);
    }
    default:
      return [];
  }
}

export function Settings() {
  const {
    settings,
    saveSettings,
    globalVariables,
    saveGlobalVariables,
    installedBrowsers,
    loadInstalledBrowsers,
    installBrowser,
  } = useStore();
  const [form, setForm] = useState(settings);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [globalVars, setGlobalVars] = useState<
    Array<{ key: string; value: string }>
  >([]);
  const [globalVarsDirty, setGlobalVarsDirty] = useState(false);
  const [globalVarsSaved, setGlobalVarsSaved] = useState(false);
  const [layoutReset, setLayoutReset] = useState(false);
  const [installingBrowser, setInstallingBrowser] =
    useState<BrowserName | null>(null);
  const [installLog, setInstallLog] = useState<string[]>([]);
  const installLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  useEffect(() => {
    setGlobalVars(
      Object.entries(globalVariables).map(([key, value]) => ({ key, value })),
    );
  }, [globalVariables]);

  useEffect(() => {
    if (!installLogRef.current) return;
    installLogRef.current.scrollTop = installLogRef.current.scrollHeight;
  }, [installLog]);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = listen<{
      type: 'start' | 'log' | 'complete' | 'error';
      browser: BrowserName;
      message: string;
      timestamp?: string;
    }>('browser-install-event', (event) => {
      if (!isMounted) return;
      const payload = event.payload;
      const line = payload.timestamp
        ? `[${new Date(payload.timestamp).toLocaleTimeString()}] ${payload.message}`
        : payload.message;
      setInstallLog((prev) => [...prev, line]);

      if (payload.type === 'complete' || payload.type === 'error') {
        setInstallingBrowser(null);
        void loadInstalledBrowsers();
      }
    });

    return () => {
      isMounted = false;
      void unsubscribe.then((fn) => fn()).catch(() => {});
    };
  }, [loadInstalledBrowsers]);

  const [fetchedModels, setFetchedModels] = useState<string[] | null>(null);
  const [fetchingModels, setFetchingModels] = useState(false);

  // Keep a ref to the latest apiKey so the auto-fetch effect doesn't
  // re-run on every keystroke as the user types their key.
  const apiKeyRef = useRef(form.apiKey);
  useEffect(() => {
    apiKeyRef.current = form.apiKey;
  }, [form.apiKey]);

  const handleFetchModels = async () => {
    if (!form.apiKey) return;
    setFetchingModels(true);
    try {
      const fetched = await getModelsFromApi(
        form.aiProvider,
        form.apiKey,
        form.baseUrl,
      );
      setFetchedModels(fetched.length > 0 ? fetched : null);
    } catch {
      setFetchedModels(null);
    } finally {
      setFetchingModels(false);
    }
  };

  // Auto-fetch when provider or baseUrl changes (or on first mount).
  // Using apiKeyRef avoids adding apiKey to the deps and firing on every keystroke.
  useEffect(() => {
    setFetchedModels(null);
    if (apiKeyRef.current) {
      setFetchingModels(true);
      getModelsFromApi(form.aiProvider, apiKeyRef.current, form.baseUrl)
        .then((fetched) =>
          setFetchedModels(fetched.length > 0 ? fetched : null),
        )
        .catch(() => setFetchedModels(null))
        .finally(() => setFetchingModels(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.aiProvider, form.baseUrl]);

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

  const handleInstallBrowser = async (browser: BrowserName) => {
    if (installingBrowser) return;
    setInstallLog([]);
    setInstallingBrowser(browser);
    try {
      await installBrowser(browser);
    } catch (e) {
      setInstallingBrowser(null);
      setInstallLog((prev) => [
        ...prev,
        `Failed to start install for ${browser}: ${String(e)}`,
      ]);
    }
  };

  const models = fetchedModels ?? PROVIDER_MODELS[form.aiProvider] ?? [];

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
            <option value="github">GitHub Models</option>
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
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
            Model
            <button
              type="button"
              onClick={handleFetchModels}
              disabled={!form.apiKey || fetchingModels}
              title="Fetch available models from API"
              className="text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors"
            >
              <RefreshCw
                className={`w-3 h-3 ${fetchingModels ? 'animate-spin' : ''}`}
              />
            </button>
            {fetchedModels && (
              <span className="text-xs text-emerald-500 font-normal">live</span>
            )}
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
            {fetchedModels
              ? 'Showing live models from your API. Click ↺ to refresh.'
              : 'Select from the dropdown or enter a custom model name. Click ↺ to load live models.'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Default Browsers
          </label>
          <p className="text-xs text-slate-500 mb-2">
            Browsers to use when running tests. Can be overridden per collection
            or per test.
          </p>
          <BrowserSelector
            selected={form.browsers ?? []}
            installedBrowsers={installedBrowsers}
            onChange={(browsers) =>
              setForm((f) => ({
                ...f,
                browsers: browsers.length ? browsers : undefined,
              }))
            }
            inheritedLabel="No default set — tests will run in Chromium"
          />
        </div>

        <div>
          <h2 className="text-sm font-medium text-slate-300 mb-2">
            Browser Installation
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Install Playwright browser engines on this machine. Chromium is
            required for first run, Firefox and WebKit are optional.
          </p>
          <div className="space-y-2">
            {(['chromium', 'firefox', 'webkit'] as BrowserName[]).map(
              (browser) => {
                const installed = installedBrowsers.includes(browser);
                const isInstalling = installingBrowser === browser;
                const isBusy = installingBrowser !== null;
                return (
                  <div
                    key={browser}
                    className="flex items-center justify-between rounded border border-slate-700 bg-slate-900 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm capitalize text-slate-200">
                        {browser}
                      </span>
                      <span
                        className={`text-xs ${
                          installed ? 'text-emerald-500' : 'text-slate-500'
                        }`}
                      >
                        {installed ? 'Installed' : 'Not installed'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleInstallBrowser(browser)}
                      disabled={isBusy}
                      className="flex items-center gap-1 rounded bg-violet-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {isInstalling
                        ? 'Installing...'
                        : installed
                          ? 'Reinstall'
                          : 'Install'}
                    </button>
                  </div>
                );
              },
            )}
          </div>
          {installLog.length > 0 && (
            <div
              ref={installLogRef}
              className="mt-3 h-36 overflow-y-auto rounded border border-slate-700 bg-slate-950 p-2 font-mono text-[11px] text-slate-300"
            >
              {installLog.map((line, index) => (
                <div key={`${index}-${line.slice(0, 16)}`}>{line}</div>
              ))}
            </div>
          )}
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
