import { useEffect, useRef, useState } from 'react';
import { CollectionEditor } from './components/CollectionEditor';
import { Layout } from './components/Layout';
import { RunPanel } from './components/RunPanel';
import { Settings } from './components/Settings';
import { TestEditor } from './components/TestEditor';
import { TestTree } from './components/TestTree';
import { useStore } from './store';

const SIDEBAR_WIDTH_KEY = 'pts.layout.sidebarWidth';
const RUN_PANEL_HEIGHT_KEY = 'pts.layout.runPanelHeight';

function readPersistedNumber(key: string, fallback: number): number {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function App() {
  const [currentPage, setCurrentPage] = useState<'main' | 'settings'>('main');
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    readPersistedNumber(SIDEBAR_WIDTH_KEY, 224),
  );
  const [runPanelHeight, setRunPanelHeight] = useState(() =>
    readPersistedNumber(RUN_PANEL_HEIGHT_KEY, 256),
  );
  const didEvaluateInitialPage = useRef(false);
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const {
    loadTests,
    loadSettings,
    loadCollections,
    loadGlobalVariables,
    settings,
    selectedTestId,
    selectedCollectionId,
  } = useStore();

  // Load data once on mount. Zustand actions are stable references so this is intentional.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    Promise.all([
      loadTests(),
      loadSettings(),
      loadCollections(),
      loadGlobalVariables(),
    ])
      .catch((e) => console.error('Failed to load app data:', e))
      .finally(() => setIsInitialDataLoaded(true));
  }, [loadTests, loadSettings, loadCollections, loadGlobalVariables]);

  // Decide the initial page once settings are loaded.
  useEffect(() => {
    if (!isInitialDataLoaded || didEvaluateInitialPage.current) {
      return;
    }

    didEvaluateInitialPage.current = true;
    if (!settings.apiKey.trim()) {
      setCurrentPage('settings');
    }
  }, [isInitialDataLoaded, settings.apiKey]);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    window.localStorage.setItem(RUN_PANEL_HEIGHT_KEY, String(runPanelHeight));
  }, [runPanelHeight]);

  const startSidebarResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth;
    const containerWidth =
      mainContentRef.current?.clientWidth ?? window.innerWidth;
    const maxSidebarWidth = Math.max(260, containerWidth - 360);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      setSidebarWidth(clamp(startWidth + delta, 180, maxSidebarWidth));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const startRunPanelResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = runPanelHeight;
    const containerHeight =
      mainContentRef.current?.clientHeight ?? window.innerHeight;
    const maxRunPanelHeight = Math.max(220, containerHeight - 220);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      setRunPanelHeight(clamp(startHeight - delta, 180, maxRunPanelHeight));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Determine what to show in the main editor panel
  const showCollectionEditor = !selectedTestId && !!selectedCollectionId;

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'settings' ? (
        <div className="h-full overflow-y-auto bg-slate-900">
          <Settings />
        </div>
      ) : (
        <div ref={mainContentRef} className="flex flex-col h-full min-h-0">
          <div className="flex flex-1 min-h-[180px] overflow-hidden">
            <div className="shrink-0" style={{ width: `${sidebarWidth}px` }}>
              <TestTree />
            </div>
            <div
              className="w-1 shrink-0 bg-slate-800 hover:bg-violet-500/60 active:bg-violet-500 cursor-col-resize"
              onMouseDown={startSidebarResize}
              title="Resize test tree panel"
            />
            <div className="flex-1 overflow-hidden">
              {showCollectionEditor ? <CollectionEditor /> : <TestEditor />}
            </div>
          </div>
          <div
            className="h-1 shrink-0 bg-slate-800 hover:bg-violet-500/60 active:bg-violet-500 cursor-row-resize"
            onMouseDown={startRunPanelResize}
            title="Resize run panel"
          />
          <div
            className="shrink-0 min-h-0"
            style={{ height: `${runPanelHeight}px` }}
          >
            <RunPanel />
          </div>
        </div>
      )}
    </Layout>
  );
}

export default App;
