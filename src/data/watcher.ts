import * as fs from 'fs';
import * as path from 'path';
import { getClaudeDir, getProjectsDir, getSessionsDir } from './path-codec.js';

export type ScanCallback = () => void;

const DEBOUNCE_MS = 500;

/**
 * Watch Claude Code data directories for changes and trigger rescan.
 * - onFileChange: full rescan (triggered by fs.watch)
 * - onPoll: lightweight status refresh (every 2s)
 */
export function startWatcher(onFileChange: ScanCallback, onPoll?: ScanCallback): () => void {
  const cleanups: (() => void)[] = [];
  const debounceTimers = new Map<string, NodeJS.Timeout>();

  function debouncedTrigger(source: string) {
    const existing = debounceTimers.get(source);
    if (existing) clearTimeout(existing);
    debounceTimers.set(
      source,
      setTimeout(() => {
        debounceTimers.delete(source);
        onFileChange();
      }, DEBOUNCE_MS),
    );
  }

  const dirsToWatch = [getProjectsDir(), getSessionsDir()];
  const filesToWatch = [path.join(getClaudeDir(), 'history.jsonl')];

  // Watch directories for new files
  for (const dir of dirsToWatch) {
    if (!fs.existsSync(dir)) continue;
    try {
      const watcher = fs.watch(dir, { recursive: true }, (_event, _filename) => {
        debouncedTrigger(dir);
      });
      watcher.on('error', () => {
        // fs.watch errors are common on Windows; polling fallback handles it
      });
      cleanups.push(() => watcher.close());
    } catch {
      // fs.watch not available; polling fallback handles it
    }
  }

  // Watch specific files
  for (const file of filesToWatch) {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) continue;
    try {
      const watcher = fs.watch(file, (_event) => {
        debouncedTrigger(file);
      });
      watcher.on('error', () => {});
      cleanups.push(() => watcher.close());
    } catch {
      // fallback to polling
    }
  }

  // 每 2 秒轮询：轻量状态检查
  const pollCallback = onPoll || onFileChange;
  const pollInterval = setInterval(() => {
    pollCallback();
  }, 1000);

  cleanups.push(() => clearInterval(pollInterval));

  // Return cleanup function
  return () => {
    for (const cleanup of cleanups) {
      try { cleanup(); } catch { /* ignore */ }
    }
    for (const timer of debounceTimers.values()) {
      clearTimeout(timer);
    }
  };
}
