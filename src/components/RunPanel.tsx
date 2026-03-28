import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import type { HttpFailure, LogEntry, Run } from '../types';
import { Screenshots } from './Screenshots';

const SCREENSHOTS_WIDTH_KEY = 'pts.layout.runPanel.screenshotsWidth';

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

function StatusIcon({ status }: { status: Run['status'] }) {
  switch (status) {
    case 'running':
      return <Activity className="w-4 h-4 text-blue-400 animate-pulse" />;
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    case 'failure':
      return <XCircle className="w-4 h-4 text-red-400" />;
  }
}

function LogLine({ entry }: { entry: LogEntry }) {
  const colors = {
    info: 'text-slate-300',
    warn: 'text-amber-400',
    error: 'text-red-400',
  };
  return (
    <div className={`flex gap-2 text-xs font-mono ${colors[entry.level]}`}>
      <span className="text-slate-600 shrink-0">
        {new Date(entry.timestamp).toLocaleTimeString()}
      </span>
      <span className="break-all">{entry.message}</span>
    </div>
  );
}

function FailureLine({ failure }: { failure: HttpFailure }) {
  return (
    <div className="flex gap-2 text-xs font-mono text-red-400">
      <span className="text-slate-600 shrink-0">
        {new Date(failure.timestamp).toLocaleTimeString()}
      </span>
      <span className="font-semibold">{failure.method}</span>
      <span className="text-slate-400">{failure.status}</span>
      <span className="break-all">{failure.url}</span>
    </div>
  );
}

function formatRunLabel(run: Run): string {
  const started = new Date(run.startedAt);
  const time = started.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const date = started.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
  return `${date} ${time}`;
}

function formatRunDuration(run: Run): string | null {
  if (!run.completedAt) {
    return null;
  }
  const start = new Date(run.startedAt).getTime();
  const end = new Date(run.completedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return null;
  }

  const secs = Math.round((end - start) / 1000);
  if (secs < 60) {
    return `${secs}s`;
  }
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  return `${mins}m ${remSecs}s`;
}

export function RunPanel() {
  const {
    selectedTestId,
    runs,
    selectedRun,
    selectRun,
    isRunning,
    currentRunId,
    currentRunLog,
    currentRunScreenshots,
    currentRunHttpFailures,
  } = useStore();
  const [screenshotsWidth, setScreenshotsWidth] = useState(() =>
    readPersistedNumber(SCREENSHOTS_WIDTH_KEY, 256),
  );
  const contentRef = useRef<HTMLDivElement | null>(null);

  const testRuns = selectedTestId ? (runs[selectedTestId] ?? []) : [];

  const hasLiveRunBuffer =
    currentRunLog.length > 0 ||
    currentRunScreenshots.length > 0 ||
    currentRunHttpFailures.length > 0;

  useEffect(() => {
    if (testRuns.length > 0 && !selectedRun) {
      selectRun(testRuns[0]);
    }
    // Use testRuns[0]?.id to re-run if the latest run changes, not just the count
  }, [testRuns[0]?.id, selectedRun, selectRun]);

  useEffect(() => {
    window.localStorage.setItem(
      SCREENSHOTS_WIDTH_KEY,
      String(screenshotsWidth),
    );
  }, [screenshotsWidth]);

  const startScreenshotsResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = screenshotsWidth;
    const containerWidth = contentRef.current?.clientWidth ?? window.innerWidth;
    const maxScreenshotsWidth = Math.max(260, containerWidth - 320);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      setScreenshotsWidth(clamp(startWidth - delta, 180, maxScreenshotsWidth));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const showLiveBuffer = isRunning || (!selectedRun && hasLiveRunBuffer);
  const displayLog = showLiveBuffer ? currentRunLog : (selectedRun?.log ?? []);
  const displayScreenshots = showLiveBuffer
    ? currentRunScreenshots
    : (selectedRun?.screenshots ?? []);
  const displayHttpFailures = showLiveBuffer
    ? currentRunHttpFailures
    : (selectedRun?.httpFailures ?? []);

  if (!selectedTestId) {
    return (
      <div className="flex items-center justify-center h-full text-slate-600 text-sm">
        No test selected
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 border-t border-slate-700">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700 shrink-0 overflow-x-auto">
        {isRunning && (
          <button className="flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
            <Activity className="w-3 h-3 animate-pulse" />
            Running...
          </button>
        )}
        {testRuns.slice(0, 10).map((run) => (
          <button
            key={run.id}
            onClick={() => selectRun(run)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs shrink-0 transition-colors ${
              selectedRun?.id === run.id
                ? 'bg-slate-600 text-slate-100'
                : run.status === 'failure'
                  ? 'text-red-300 bg-red-950/20 border border-red-900/40 hover:bg-red-900/30 hover:text-red-200'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
            title={run.error ?? undefined}
          >
            <StatusIcon status={run.status} />
            <span>{formatRunLabel(run)}</span>
            {run.status === 'failure' && (
              <span className="text-[10px] uppercase tracking-wide font-semibold text-red-300">
                Failed
              </span>
            )}
            {run.status === 'success' && (
              <span className="text-[10px] uppercase tracking-wide font-semibold text-green-300">
                Passed
              </span>
            )}
            {formatRunDuration(run) && (
              <span className="text-[10px] text-slate-500">
                {formatRunDuration(run)}
              </span>
            )}
          </button>
        ))}
        {testRuns.length === 0 && !isRunning && (
          <span className="text-xs text-slate-600">
            No runs yet. Click "Run" to start.
          </span>
        )}
      </div>

      <div ref={contentRef} className="flex flex-1 overflow-hidden min-w-0">
        <div className="flex flex-col flex-1 overflow-hidden min-w-[220px]">
          {displayHttpFailures.length > 0 && (
            <div className="px-3 py-2 border-b border-slate-700 bg-red-950/20">
              <div className="flex items-center gap-1 mb-1">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span className="text-xs font-medium text-red-400">
                  HTTP Failures ({displayHttpFailures.length})
                </span>
              </div>
              <div className="space-y-0.5 max-h-20 overflow-y-auto">
                {displayHttpFailures.map((f, i) => (
                  <FailureLine key={i} failure={f} />
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-700">
            <Clock className="w-3 h-3 text-slate-500" />
            <span className="text-xs font-medium text-slate-400">Log</span>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 font-mono">
            {displayLog.length === 0 ? (
              <span className="text-xs text-slate-600">No log entries</span>
            ) : (
              displayLog.map((entry, i) => <LogLine key={i} entry={entry} />)
            )}
          </div>
        </div>

        <div
          className="w-1 shrink-0 bg-slate-800 hover:bg-violet-500/60 active:bg-violet-500 cursor-col-resize"
          onMouseDown={startScreenshotsResize}
          title="Resize screenshots panel"
        />

        <div
          className="shrink-0 border-l border-slate-700"
          style={{ width: `${screenshotsWidth}px` }}
        >
          <div className="px-3 py-1.5 border-b border-slate-700">
            <span className="text-xs font-medium text-slate-400">
              Screenshots
            </span>
          </div>
          <div className="h-[calc(100%-28px)]">
            {selectedRun && !showLiveBuffer ? (
              <Screenshots
                testId={selectedTestId}
                runId={selectedRun.id}
                screenshots={displayScreenshots}
              />
            ) : showLiveBuffer ? (
              <Screenshots
                testId={selectedTestId}
                runId={currentRunId ?? 'current'}
                screenshots={displayScreenshots}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-600 text-xs">
                Run a test to see screenshots
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
