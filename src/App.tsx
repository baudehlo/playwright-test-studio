import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { TestTree } from './components/TestTree';
import { TestEditor } from './components/TestEditor';
import { RunPanel } from './components/RunPanel';
import { Settings } from './components/Settings';
import { useStore } from './store';

function App() {
  const [currentPage, setCurrentPage] = useState<'main' | 'settings'>('main');
  const { loadTests, loadSettings } = useStore();

  useEffect(() => {
    loadTests();
    loadSettings();
  }, []);

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
              <TestEditor />
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
