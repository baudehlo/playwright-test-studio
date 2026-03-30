import { Play, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStore } from '../store';
import type { BrowserName, Test } from '../types';
import { BrowserSelector } from './BrowserSelector';

export function TestEditor() {
  const {
    tests,
    selectedTestId,
    saveTest,
    runTest,
    isRunning,
    installedBrowsers,
  } = useStore();
  const selectedTest = tests.find((t) => t.id === selectedTestId) ?? null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [script, setScript] = useState('');
  const [browsers, setBrowsers] = useState<BrowserName[]>([]);
  const [variables, setVariables] = useState<
    Array<{ key: string; value: string }>
  >([]);
  const [isDirty, setIsDirty] = useState(false);

  // Reset form when a different test is selected. Using selectedTest?.id intentionally:
  // we only reset when the selection changes, not on every save/update of the current test.
  useEffect(() => {
    if (selectedTest) {
      setName(selectedTest.name);
      setDescription(selectedTest.description);
      setScript(selectedTest.script);
      setBrowsers(selectedTest.browsers ?? []);
      setVariables(
        Object.entries(selectedTest.variables).map(([key, value]) => ({
          key,
          value,
        })),
      );
      setIsDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTest?.id]);

  const markDirty = () => setIsDirty(true);

  const handleSave = async () => {
    if (!selectedTest) return;
    const varsRecord: Record<string, string> = {};
    for (const { key, value } of variables) {
      if (key.trim()) varsRecord[key.trim()] = value;
    }
    const updated: Test = {
      ...selectedTest,
      name,
      description,
      script,
      browsers: browsers.length ? browsers : undefined,
      variables: varsRecord,
      updatedAt: new Date().toISOString(),
    };
    await saveTest(updated);
    setIsDirty(false);
  };

  const handleRun = async () => {
    if (!selectedTest) return;
    await handleSave();
    const fresh = {
      ...selectedTest,
      name,
      description,
      script,
      browsers: browsers.length ? browsers : undefined,
      variables: Object.fromEntries(
        variables
          .filter((v) => v.key.trim())
          .map((v) => [v.key.trim(), v.value]),
      ),
    };
    await runTest(fresh);
  };

  const addVariable = () => {
    setVariables((v) => [...v, { key: '', value: '' }]);
    markDirty();
  };

  const removeVariable = (idx: number) => {
    setVariables((v) => v.filter((_, i) => i !== idx));
    markDirty();
  };

  const updateVariable = (idx: number, field: 'key' | 'value', val: string) => {
    setVariables((v) =>
      v.map((item, i) => (i === idx ? { ...item, [field]: val } : item)),
    );
    markDirty();
  };

  if (!selectedTest) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        Select a test to edit, or create a new one.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 shrink-0">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            markDirty();
          }}
          className="text-sm font-semibold bg-transparent text-slate-100 outline-none border-b border-transparent focus:border-violet-500 transition-colors flex-1 mr-4"
          placeholder="Test name"
        />
        <div className="flex gap-2">
          {isDirty && (
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
          )}
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            <Play className="w-3 h-3" />
            {isRunning ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Description
          </label>
          <input
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              markDirty();
            }}
            placeholder="Brief description of what this test does"
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            Browsers
          </label>
          <BrowserSelector
            selected={browsers}
            installedBrowsers={installedBrowsers}
            onChange={(b) => {
              setBrowsers(b);
              markDirty();
            }}
            inheritedLabel="Inherit from collection or global settings"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Test Script
            <span className="ml-2 text-slate-500 font-normal">
              (plain English instructions for the AI)
            </span>
          </label>
          <textarea
            value={script}
            onChange={(e) => {
              setScript(e.target.value);
              markDirty();
            }}
            placeholder={
              'Example:\n1. Navigate to ${baseUrl}\n2. Click the login button\n3. Enter username "${username}" and password "${password}"\n4. Verify the dashboard is shown'
            }
            rows={12}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 font-mono resize-y"
          />
          <p className="text-xs text-slate-500 mt-1">
            Use <code className="text-violet-400">{'${varName}'}</code> to
            reference variables.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-slate-400">
              Variables
            </label>
            <button
              onClick={addVariable}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Variable
            </button>
          </div>
          {variables.length === 0 ? (
            <p className="text-xs text-slate-600 italic">
              No variables defined.
            </p>
          ) : (
            <div className="space-y-2">
              {variables.map((v, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    value={v.key}
                    onChange={(e) => updateVariable(idx, 'key', e.target.value)}
                    placeholder="Variable name"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500 font-mono"
                  />
                  <input
                    value={v.value}
                    onChange={(e) =>
                      updateVariable(idx, 'value', e.target.value)
                    }
                    placeholder="Value"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                  <button
                    onClick={() => removeVariable(idx)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
