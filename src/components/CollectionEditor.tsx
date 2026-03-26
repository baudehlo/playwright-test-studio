import { Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStore } from '../store';
import type { Collection } from '../types';

export function CollectionEditor() {
  const { collections, selectedCollectionId, saveCollection } = useStore();
  const selectedCollection =
    collections.find((c) => c.id === selectedCollectionId) ?? null;

  const [name, setName] = useState('');
  const [variables, setVariables] = useState<
    Array<{ key: string; value: string }>
  >([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (selectedCollection) {
      setName(selectedCollection.name);
      setVariables(
        Object.entries(selectedCollection.variables).map(([key, value]) => ({
          key,
          value,
        })),
      );
      setIsDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCollection?.id]);

  const markDirty = () => setIsDirty(true);

  const handleSave = async () => {
    if (!selectedCollection) return;
    const varsRecord: Record<string, string> = {};
    for (const { key, value } of variables) {
      if (key.trim()) varsRecord[key.trim()] = value;
    }
    const updated: Collection = {
      ...selectedCollection,
      name,
      variables: varsRecord,
      updatedAt: new Date().toISOString(),
    };
    await saveCollection(updated);
    setIsDirty(false);
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

  if (!selectedCollection) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        Select a collection to edit it.
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
          placeholder="Collection name"
        />
        {isDirty && (
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
          >
            <Save className="w-3 h-3" />
            Save
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <p className="text-xs text-slate-500 mb-3">
            Collection variables are available to all tests in this collection.
            They can be overridden by test-level variables and override global
            variables. Use{' '}
            <code className="text-violet-400">{'${varName}'}</code> in your test
            scripts.
          </p>

          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-slate-400">
              Collection Variables
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
              No collection variables defined.
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
