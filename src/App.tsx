import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { TestTree } from './components/TestTree';
import { TestEditor } from './components/TestEditor';
import { CollectionEditor } from './components/CollectionEditor';
import { RunPanel } from './components/RunPanel';
import { Settings } from './components/Settings';
import { useStore } from './store';

function App() {
  const [currentPage, setCurrentPage] = useState<'main' | 'settings'>('main');
  const { loadTests, loadSettings, loadCollections, loadGlobalVariables, settings, selectedTestId, selectedCollectionId } = useStore();

  // Load data once on mount. Zustand actions are stable references so this is intentional.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    Promise.all([loadTests(), loadSettings(), loadCollections(), loadGlobalVariables()])
      .catch(e => console.error('Failed to load app data:', e));
  }, [loadTests, loadSettings, loadCollections, loadGlobalVariables]);

  // Auto-open Settings when no API key is configured
  useEffect(() => {
    if (settings.apiKey === '') {
      setCurrentPage('settings');
    }
  }, [settings.apiKey]);

  // Determine what to show in the main editor panel
  const showCollectionEditor = !selectedTestId && !!selectedCollectionId;

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'settings' ? (
        <div className="h-full overflow-y-auto bg-slate-900">
          <Settings />
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex flex-1 overflow-hidden">
            <div className="w-56 shrink-0">
              <TestTree />
            </div>
            <div className="flex-1 overflow-hidden">
              {showCollectionEditor ? <CollectionEditor /> : <TestEditor />}
            </div>
          </div>
          <div className="h-64 shrink-0">
            <RunPanel />
          </div>
        </div>
      )}
    </Layout>
  );
}

export default App;
