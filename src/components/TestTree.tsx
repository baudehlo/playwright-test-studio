import { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Trash2, FolderOpen, FileText } from 'lucide-react';
import { useStore } from '../store';
import type { Test } from '../types';

function generateId() {
  return crypto.randomUUID();
}

interface TreeNodeProps {
  test: Test;
  allTests: Test[];
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}

function TreeNode({ test, allTests, depth, selectedId, onSelect, onDelete, onAddChild }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const children = allTests.filter(t => t.parentId === test.id);
  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded mx-1 group transition-colors ${
          selectedId === test.id
            ? 'bg-violet-600/30 text-violet-300'
            : 'hover:bg-slate-700/50 text-slate-300'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(test.id)}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
          className="w-4 h-4 shrink-0 text-slate-500"
        >
          {hasChildren ? (expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />) : <span className="w-3 h-3 block" />}
        </button>
        {hasChildren ? (
          <FolderOpen className="w-3.5 h-3.5 shrink-0 text-amber-400" />
        ) : (
          <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        )}
        <span className="text-xs flex-1 truncate">{test.name}</span>
        <div className="hidden group-hover:flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onAddChild(test.id); }}
            className="p-0.5 hover:text-violet-400 text-slate-500"
            title="Add child test"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(test.id); }}
            className="p-0.5 hover:text-red-400 text-slate-500"
            title="Delete test"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      {expanded && hasChildren && (
        <div>
          {children.map(child => (
            <TreeNode
              key={child.id}
              test={child}
              allTests={allTests}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TestTree() {
  const { tests, selectedTestId, selectTest, saveTest, deleteTest } = useStore();
  const rootTests = tests.filter(t => !t.parentId);

  const createTest = async (parentId?: string) => {
    const now = new Date().toISOString();
    const test: Test = {
      id: generateId(),
      name: 'New Test',
      description: '',
      script: '',
      parentId,
      variables: {},
      createdAt: now,
      updatedAt: now,
    };
    await saveTest(test);
    selectTest(test.id);
  };

  return (
    <div className="flex flex-col h-full bg-slate-800/50 border-r border-slate-700">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tests</span>
        <button
          onClick={() => createTest()}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          New
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {rootTests.length === 0 ? (
          <div className="text-center text-slate-500 text-xs py-8 px-4">
            No tests yet.<br />Click "New" to create one.
          </div>
        ) : (
          rootTests.map(test => (
            <TreeNode
              key={test.id}
              test={test}
              allTests={tests}
              depth={0}
              selectedId={selectedTestId}
              onSelect={selectTest}
              onDelete={deleteTest}
              onAddChild={(parentId) => createTest(parentId)}
            />
          ))
        )}
      </div>
    </div>
  );
}
