import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Image } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import type { Screenshot } from '../types';

interface ScreenshotsProps {
  testId: string;
  runId: string;
  screenshots: Screenshot[];
}

export function Screenshots({ testId, runId, screenshots }: ScreenshotsProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    setCurrentIdx(0);
  }, [runId]);

  useEffect(() => {
    if (screenshots.length === 0) {
      setImgSrc(null);
      return;
    }
    const shot = screenshots[currentIdx];
    if (!shot) return;
    const filename = shot.path.split('/').pop() ?? shot.path;
    invoke<number[]>('get_screenshot_data', { testId, runId, filename })
      .then(bytes => {
        const uint8 = new Uint8Array(bytes);
        const blob = new Blob([uint8], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        setImgSrc(url);
        return () => URL.revokeObjectURL(url);
      })
      .catch(e => { console.error('Failed to load screenshot:', e); setImgSrc(null); });
  }, [testId, runId, currentIdx, screenshots]);

  if (screenshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
        <Image className="w-8 h-8" />
        <span className="text-xs">No screenshots</span>
      </div>
    );
  }

  const current = screenshots[currentIdx];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
        <span className="text-xs text-slate-400">{current?.description || `Screenshot ${currentIdx + 1}`}</span>
        <span className="text-xs text-slate-500">{currentIdx + 1} / {screenshots.length}</span>
      </div>
      <div className="flex-1 relative overflow-hidden bg-slate-950 flex items-center justify-center">
        {imgSrc ? (
          <img src={imgSrc} alt={current?.description} className="max-w-full max-h-full object-contain" />
        ) : (
          <div className="text-slate-600 text-xs">Loading...</div>
        )}
      </div>
      {screenshots.length > 1 && (
        <div className="flex items-center justify-center gap-2 py-1 border-t border-slate-700">
          <button
            onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-1">
            {screenshots.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentIdx ? 'bg-violet-400' : 'bg-slate-600 hover:bg-slate-400'}`}
              />
            ))}
          </div>
          <button
            onClick={() => setCurrentIdx(i => Math.min(screenshots.length - 1, i + 1))}
            disabled={currentIdx === screenshots.length - 1}
            className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
