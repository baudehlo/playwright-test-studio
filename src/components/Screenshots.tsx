import { invoke } from '@tauri-apps/api/core';
import { ChevronLeft, ChevronRight, Image } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Screenshot } from '../types';

interface ScreenshotsProps {
  testId: string;
  runId: string;
  screenshots: Screenshot[];
  autoFollowLatest?: boolean;
}

export function Screenshots({
  testId,
  runId,
  screenshots,
  autoFollowLatest = false,
}: ScreenshotsProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const previousLengthRef = useRef(0);

  useEffect(() => {
    setCurrentIdx(0);
    setIsModalOpen(false);
  }, [runId]);

  useEffect(() => {
    const prevLength = previousLengthRef.current;
    previousLengthRef.current = screenshots.length;

    if (screenshots.length === 0) {
      setCurrentIdx(0);
      return;
    }

    setCurrentIdx((prev) => {
      if (autoFollowLatest && screenshots.length > prevLength) {
        return screenshots.length - 1;
      }
      return Math.min(prev, screenshots.length - 1);
    });
  }, [screenshots.length, autoFollowLatest]);

  useEffect(() => {
    if (screenshots.length === 0) {
      setImgSrc(null);
      return;
    }

    const shot = screenshots[currentIdx];
    if (!shot) {
      setImgSrc(null);
      return;
    }

    const filename = shot.path.split('/').pop() ?? shot.path;
    let cancelled = false;
    let objectUrl: string | null = null;

    invoke<number[]>('get_screenshot_data', { testId, runId, filename })
      .then((bytes) => {
        if (cancelled) return;
        const uint8 = new Uint8Array(bytes);
        const blob = new Blob([uint8], { type: 'image/png' });
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setImgSrc(objectUrl);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('Failed to load screenshot:', e);
        setImgSrc(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [testId, runId, currentIdx, screenshots]);

  useEffect(() => {
    if (!isModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false);
        return;
      }
      if (event.key === 'ArrowLeft') {
        setCurrentIdx((i) => Math.max(0, i - 1));
        return;
      }
      if (event.key === 'ArrowRight') {
        setCurrentIdx((i) => Math.min(screenshots.length - 1, i + 1));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isModalOpen, screenshots.length]);

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
    <>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
          <span className="text-xs text-slate-400">
            {current?.description || `Screenshot ${currentIdx + 1}`}
          </span>
          <span className="text-xs text-slate-500">
            {currentIdx + 1} / {screenshots.length}
          </span>
        </div>
        <div className="flex-1 relative overflow-hidden bg-slate-950 flex items-center justify-center">
          {imgSrc ? (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full h-full flex items-center justify-center cursor-zoom-in"
            >
              <img
                src={imgSrc}
                alt={current?.description}
                className="max-w-full max-h-full object-contain"
              />
            </button>
          ) : (
            <div className="text-slate-600 text-xs">Loading...</div>
          )}
        </div>
        {screenshots.length > 1 && (
          <div className="flex items-center justify-center gap-2 py-1 border-t border-slate-700">
            <button
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
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
              onClick={() =>
                setCurrentIdx((i) => Math.min(screenshots.length - 1, i + 1))
              }
              disabled={currentIdx === screenshots.length - 1}
              className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {isModalOpen && imgSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative w-[90vw] h-[90vh] bg-slate-950 border border-slate-700 rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-2 right-2 z-10">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-2 py-1 text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded"
              >
                Close
              </button>
            </div>

            <div className="w-full h-full flex items-center justify-center p-6">
              <img
                src={imgSrc}
                alt={current?.description}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {screenshots.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/80 border border-slate-700 rounded px-2 py-1">
                <button
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  disabled={currentIdx === 0}
                  className="p-1 text-slate-300 hover:text-white disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-300">
                  {currentIdx + 1} / {screenshots.length}
                </span>
                <button
                  onClick={() =>
                    setCurrentIdx((i) =>
                      Math.min(screenshots.length - 1, i + 1),
                    )
                  }
                  disabled={currentIdx === screenshots.length - 1}
                  className="p-1 text-slate-300 hover:text-white disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
