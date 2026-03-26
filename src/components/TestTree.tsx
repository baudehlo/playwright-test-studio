import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../store';
import type { Collection, Test } from '../types';

function generateId() {
  return crypto.randomUUID();
}

// ── Test tree node ─────────────────────────────────────────────────────────

interface TestNodeProps {
  test: Test;
  allTests: Test[];
  depth: number;
  selectedTestId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}

function TestNode({
  test,
  allTests,
  depth,
  selectedTestId,
  onSelect,
  onDelete,
  onAddChild,
}: TestNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const children = allTests.filter((t) => t.parentId === test.id);
  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1.5 pr-2 cursor-pointer rounded mx-1 group transition-colors ${
          selectedTestId === test.id
            ? 'bg-violet-600/30 text-violet-300'
            : 'hover:bg-slate-700/50 text-slate-300'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(test.id)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="w-4 h-4 shrink-0 text-slate-500"
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )
          ) : (
            <span className="w-3 h-3 block" />
          )}
        </button>
        {hasChildren ? (
          <FolderOpen className="w-3.5 h-3.5 shrink-0 text-amber-400" />
        ) : (
          <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        )}
        <span className="text-xs flex-1 truncate">{test.name}</span>
        <div className="hidden group-hover:flex items-center gap-1 pr-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(test.id);
            }}
            className="p-0.5 hover:text-violet-400 text-slate-500"
            title="Add child test"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(test.id);
            }}
            className="p-0.5 hover:text-red-400 text-slate-500"
            title="Delete test"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      {expanded && hasChildren && (
        <div>
          {children.map((child) => (
            <TestNode
              key={child.id}
              test={child}
              allTests={allTests}
              depth={depth + 1}
              selectedTestId={selectedTestId}
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

// ── Collection node ──────────────────────────────────────────────────────────

interface CollectionNodeProps {
  collection: Collection;
  tests: Test[];
  allTests: Test[];
  selectedTestId: string | null;
  selectedCollectionId: string | null;
  onSelectTest: (id: string) => void;
  onSelectCollection: (id: string) => void;
  onDeleteTest: (id: string) => void;
  onDeleteCollection: (id: string) => void;
  onAddTest: (collectionId: string, parentId?: string) => void;
}

function CollectionNode({
  collection,
  tests,
  allTests,
  selectedTestId,
  selectedCollectionId,
  onSelectTest,
  onSelectCollection,
  onDeleteTest,
  onDeleteCollection,
  onAddTest,
}: CollectionNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const rootTests = tests.filter(
    (t) => t.collectionId === collection.id && !t.parentId,
  );
  const isSelected = selectedCollectionId === collection.id && !selectedTestId;

  return (
    <div className="mb-0.5">
      <div
        className={`flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded mx-1 group transition-colors ${
          isSelected
            ? 'bg-violet-600/20 text-violet-300'
            : 'hover:bg-slate-700/30 text-slate-300'
        }`}
        onClick={() => onSelectCollection(collection.id)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="w-4 h-4 shrink-0 text-slate-500"
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>
        <BookOpen className="w-3.5 h-3.5 shrink-0 text-violet-400" />
        <span className="text-xs font-medium flex-1 truncate">
          {collection.name}
        </span>
        <div className="hidden group-hover:flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectCollection(collection.id);
            }}
            className="p-0.5 hover:text-violet-400 text-slate-500"
            title="Edit collection"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddTest(collection.id);
            }}
            className="p-0.5 hover:text-violet-400 text-slate-500"
            title="Add test to collection"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteCollection(collection.id);
            }}
            className="p-0.5 hover:text-red-400 text-slate-500"
            title="Delete collection"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {expanded && (
        <div>
          {rootTests.length === 0 ? (
            <div className="text-xs text-slate-600 italic px-8 py-1">
              No tests yet.
            </div>
          ) : (
            rootTests.map((test) => (
              <TestNode
                key={test.id}
                test={test}
                allTests={allTests}
                depth={1}
                selectedTestId={selectedTestId}
                onSelect={onSelectTest}
                onDelete={onDeleteTest}
                onAddChild={(parentId) => onAddTest(collection.id, parentId)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main sidebar ─────────────────────────────────────────────────────────────

export function TestTree() {
  const {
    tests,
    collections,
    selectedTestId,
    selectedCollectionId,
    selectTest,
    selectCollection,
    saveTest,
    deleteTest,
    saveCollection,
    deleteCollection,
  } = useStore();

  const createCollection = async () => {
    const now = new Date().toISOString();
    const collection: Collection = {
      id: generateId(),
      name: 'New Collection',
      variables: {},
      createdAt: now,
      updatedAt: now,
    };
    await saveCollection(collection);
    selectCollection(collection.id);
  };

  const createTest = async (collectionId?: string, parentId?: string) => {
    const now = new Date().toISOString();
    const test: Test = {
      id: generateId(),
      name: 'New Test',
      description: '',
      script: '',
      parentId,
      collectionId,
      variables: {},
      createdAt: now,
      updatedAt: now,
    };
    await saveTest(test);
    selectTest(test.id);
  };

  const uncategorizedTests = tests.filter(
    (t) => !t.collectionId && !t.parentId,
  );

  return (
    <div className="flex flex-col h-full bg-slate-800/50 border-r border-slate-700">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Collections
        </span>
        <button
          onClick={createCollection}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded transition-colors"
          title="New collection"
        >
          <Plus className="w-3 h-3" />
          New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {collections.length === 0 && uncategorizedTests.length === 0 ? (
          <div className="text-center text-slate-500 text-xs py-8 px-4">
            No collections yet.
            <br />
            Click "New" to create one.
          </div>
        ) : (
          <>
            {collections.map((collection) => (
              <CollectionNode
                key={collection.id}
                collection={collection}
                tests={tests}
                allTests={tests}
                selectedTestId={selectedTestId}
                selectedCollectionId={selectedCollectionId}
                onSelectTest={selectTest}
                onSelectCollection={selectCollection}
                onDeleteTest={deleteTest}
                onDeleteCollection={deleteCollection}
                onAddTest={createTest}
              />
            ))}

            {uncategorizedTests.length > 0 && (
              <div className="mt-1">
                <div className="flex items-center justify-between px-3 py-1.5">
                  <span className="text-xs text-slate-500 italic">
                    Uncategorized
                  </span>
                  <button
                    onClick={() => createTest(undefined)}
                    className="p-0.5 text-slate-500 hover:text-violet-400"
                    title="Add uncategorized test"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                {uncategorizedTests.map((test) => (
                  <TestNode
                    key={test.id}
                    test={test}
                    allTests={tests}
                    depth={0}
                    selectedTestId={selectedTestId}
                    onSelect={selectTest}
                    onDelete={deleteTest}
                    onAddChild={(parentId) => createTest(undefined, parentId)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
