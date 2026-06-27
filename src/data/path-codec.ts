import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { HistoryEntry } from './types.js';

const CLAUDE_DIR = path.join(os.homedir(), '.claude');

/**
 * Encode a Windows path to the directory-safe format used by Claude Code.
 * C:\Users\33401\Desktop -> C--Users-33401-Desktop
 */
export function encodePath(winPath: string): string {
  return winPath
    .replace(/^([A-Z]):/i, '$1-')
    .replace(/[\\\/_:]/g, '-')
    .replace(/[^a-zA-Z0-9\-.]/g, '-');
}

/**
 * Decode a Claude Code directory name back to a Windows path.
 * Uses a reverse mapping built from history.jsonl project entries.
 */
export function buildReverseMapping(): Map<string, string> {
  const mapping = new Map<string, string>();

  try {
    const historyPath = path.join(CLAUDE_DIR, 'history.jsonl');
    if (!fs.existsSync(historyPath)) return mapping;

    const content = fs.readFileSync(historyPath, 'utf-8');
    const lines = content.trim().split('\n');

    for (const line of lines) {
      try {
        const entry: HistoryEntry = JSON.parse(line);
        const encoded = encodePath(entry.project);
        mapping.set(encoded, entry.project);
      } catch {
        // skip malformed lines
      }
    }

    // Also scan project directories to find any not in history
    const projectsDir = path.join(CLAUDE_DIR, 'projects');
    if (fs.existsSync(projectsDir)) {
      const dirs = fs.readdirSync(projectsDir, { withFileTypes: true });
      for (const dir of dirs) {
        if (dir.isDirectory() && !mapping.has(dir.name)) {
          mapping.set(dir.name, heuristicDecode(dir.name));
        }
      }
    }
  } catch {
    // ignore errors
  }

  return mapping;
}

/**
 * Heuristic decode when no history entry exists:
 * First char is drive letter, first '-' after that is ':', rest '-' are '\'
 */
export function heuristicDecode(encoded: string): string {
  // If it matches the pattern of a drive-letter encoded path
  const match = encoded.match(/^([A-Z])-(.+)$/i);
  if (match) {
    const drive = match[1];
    const rest = match[2].replace(/-/g, '\\');
    return `${drive}:\\${rest}`;
  }
  return encoded;
}

export function getClaudeDir(): string {
  return CLAUDE_DIR;
}

export function getProjectsDir(): string {
  return path.join(CLAUDE_DIR, 'projects');
}

export function getSessionsDir(): string {
  return path.join(CLAUDE_DIR, 'sessions');
}

export function getArchiveDir(): string {
  return path.join(CLAUDE_DIR, 'archive');
}
