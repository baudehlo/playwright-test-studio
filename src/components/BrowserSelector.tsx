import type { BrowserName } from '../types';

const BROWSER_LABELS: Record<BrowserName, string> = {
  chromium: 'Chromium',
  firefox: 'Firefox',
  webkit: 'WebKit (Safari)',
};

const ALL_BROWSERS: BrowserName[] = ['chromium', 'firefox', 'webkit'];

interface BrowserSelectorProps {
  selected: BrowserName[];
  installedBrowsers: BrowserName[];
  onChange: (browsers: BrowserName[]) => void;
  inheritedLabel?: string;
}

export function BrowserSelector({
  selected,
  installedBrowsers,
  onChange,
  inheritedLabel,
}: BrowserSelectorProps) {
  const toggle = (browser: BrowserName) => {
    if (selected.includes(browser)) {
      onChange(selected.filter((b) => b !== browser));
    } else {
      onChange([...selected, browser]);
    }
  };

  return (
    <div className="space-y-1.5">
      {ALL_BROWSERS.map((browser) => {
        const isInstalled = installedBrowsers.includes(browser);
        const isChecked = selected.includes(browser);
        return (
          <label
            key={browser}
            className={`flex items-center gap-2 text-xs select-none ${
              isInstalled
                ? 'text-slate-300 cursor-pointer'
                : 'text-slate-500 cursor-not-allowed'
            }`}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => isInstalled && toggle(browser)}
              disabled={!isInstalled}
              className="rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500 focus:ring-offset-0 focus:ring-1"
            />
            <span>{BROWSER_LABELS[browser]}</span>
            {!isInstalled && (
              <span className="text-slate-600">(not installed)</span>
            )}
          </label>
        );
      })}
      {selected.length === 0 && inheritedLabel && (
        <p className="text-xs text-slate-600 italic mt-1">{inheritedLabel}</p>
      )}
    </div>
  );
}
