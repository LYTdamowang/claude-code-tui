import * as fs from 'fs';
import * as path from 'path';
import {
  HistoryEntry,
  SessionMeta,
  ProjectEntry,
  SessionEntry,
  ScanResult,
} from './types.js';
import { getClaudeDir, getProjectsDir, buildReverseMapping } from './path-codec.js';

/**
 * Parse the global history.jsonl file.
 */
export function loadHistory(): HistoryEntry[] {
  const historyPath = path.join(getClaudeDir(), 'history.jsonl');
  if (!fs.existsSync(historyPath)) return [];

  const content = fs.readFileSync(historyPath, 'utf-8');
  const entries: HistoryEntry[] = [];

  for (const line of content.trim().split('\n')) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {
      // Skip malformed lines in history index
    }
  }

  return entries;
}

/**
 * Safely parse JSONL content, collecting errors and handling partial lines.
 * A partially-written last line (Claude writing mid-write) is handled gracefully.
 */
function parseJsonlSafe(
  content: string,
  source: string,
): { entries: Record<string, unknown>[]; errors: string[] } {
  const entries: Record<string, unknown>[] = [];
  const errors: string[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      entries.push(JSON.parse(line));
    } catch (err: any) {
      // If it's the last line and incomplete (Claude mid-write), skip it silently
      if (i === lines.length - 1 && line.length > 0 && !line.endsWith('}')) {
        // Partial write — ignore, will be complete on next scan
        continue;
      }
      // Otherwise, it's a genuine parse error
      const errMsg = err?.message || String(err);
      errors.push(`${source}:${i + 1}: ${errMsg.substring(0, 80)}`);
    }
  }

  return { entries, errors };
}

/**
 * Get metadata for a session from its JSONL file.
 * Handles all edge cases: empty files, partial writes, corrupted data.
 */
export function getSessionMeta(
  sessionId: string,
  projectPath: string,
  jsonlPath: string,
): SessionMeta {
  const errors: string[] = [];
  let messageCount = 0;
  let firstMessageAt: Date | null = null;
  let lastMessageAt: Date | null = null;
  let summary = '';
  let parseErrorCount = 0;

  let stat: fs.Stats;
  try {
    stat = fs.statSync(jsonlPath);
  } catch {
    // File disappeared or inaccessible
    return {
      sessionId,
      projectPath,
      jsonlPath,
      firstMessageAt: new Date(0),
      lastMessageAt: new Date(0),
      messageCount: 0,
      summary: '（无法访问）',

      fileSize: 0,
      errors: [`无法读取文件: ${jsonlPath}`],
      parseErrorCount: 0,
    };
  }

  // Handle empty file
  if (stat.size === 0) {
    return {
      sessionId,
      projectPath,
      jsonlPath,
      firstMessageAt: stat.birthtime,
      lastMessageAt: stat.mtime,
      messageCount: 0,
      summary: '（空文件）',

      fileSize: 0,
      errors: [],
      parseErrorCount: 0,
    };
  }

  let content: string;
  try {
    content = fs.readFileSync(jsonlPath, 'utf-8');
  } catch (err: any) {
    return {
      sessionId,
      projectPath,
      jsonlPath,
      firstMessageAt: new Date(0),
      lastMessageAt: new Date(0),
      messageCount: 0,
      summary: '（读取失败）',

      fileSize: stat.size,
      errors: [`读取文件时出错: ${err?.message || err}`],
      parseErrorCount: 0,
    };
  }

  const { entries, errors: parseErrors } = parseJsonlSafe(content, path.basename(jsonlPath));
  errors.push(...parseErrors);
  parseErrorCount = parseErrors.length;

  // Track unique user message count for metadata
  let userMsgCount = 0;

  for (const entry of entries) {
    const type = entry.type as string | undefined;

    // Count user and assistant messages (complete messages only)
    if (type === 'user' || type === 'assistant') {
      messageCount++;
      if (type === 'user') userMsgCount++;
    }

    // Track timestamps from any entry type
    if (entry.timestamp) {
      try {
        const ts = new Date(entry.timestamp as string);
        if (!isNaN(ts.getTime())) {
          if (!firstMessageAt || ts < firstMessageAt) firstMessageAt = ts;
          if (!lastMessageAt || ts > lastMessageAt) lastMessageAt = ts;
        }
      } catch {
        // Invalid timestamp, skip
      }
    }

    // 摘录最后一条用户消息作为摘要
    if (type === 'user') {
      const msg = entry as any;
      if (msg.message?.content && typeof msg.message.content === 'string') {
        const text = msg.message.content.trim();
        if (text) {
          summary = text.length > 60 ? text.substring(0, 60) + '...' : text;
        }
      }
    }
  }

  // Fallbacks
  if (!firstMessageAt) firstMessageAt = stat.birthtime;
  if (!lastMessageAt) lastMessageAt = stat.mtime;
  if (!summary) summary = userMsgCount > 0 ? '（消息内容无法读取）' : '（暂无用户消息）';

  return {
    sessionId,
    projectPath,
    jsonlPath,
    firstMessageAt,
    lastMessageAt,
    messageCount,
    summary,
    fileSize: stat.size,
    errors: errors.length > 0 ? errors : [],
    parseErrorCount,
  };
}

/**
 * Scan all projects and sessions, returning a result with error information.
 */
export function scanAll(): ScanResult {
  const projects = new Map<string, ProjectEntry>();
  const orphanedProjects = new Map<string, import('./types.js').OrphanedProject>();
  const allErrors: string[] = [];
  let totalSessions = 0;
  let totalMessages = 0;
  let totalParseErrors = 0;

  const history = loadHistory();
  const pathMapping = buildReverseMapping();

  // Build a set of all known session IDs
  const historySessionMap = new Map<string, string>();
  for (const entry of history) {
    if (!historySessionMap.has(entry.sessionId)) {
      historySessionMap.set(entry.sessionId, entry.project);
    }
  }

  const projectsDir = getProjectsDir();
  if (!fs.existsSync(projectsDir)) {
    return {
      projects,
      orphanedProjects,
      totalSessions: 0,
      totalMessages: 0,
      totalErrors: 0,
      errors: [],
      scanTime: Date.now(),
    };
  }

  try {
    const projectDirs = fs.readdirSync(projectsDir, { withFileTypes: true });

    for (const projDir of projectDirs) {
      if (!projDir.isDirectory()) continue;

      const encodedName = projDir.name;
      const decodedPath = pathMapping.get(encodedName);

      // If we can't decode the path, use heuristic
      if (!decodedPath) {
        allErrors.push(`未知项目目录: ${encodedName}（在历史记录中未找到匹配项）`);
      }

      const resolvedPath = decodedPath || encodedName;
      const sessions: SessionMeta[] = [];
      const projPath = path.join(projectsDir, encodedName);

      try {
        const files = fs.readdirSync(projPath);
        const seenIds = new Set<string>();

        for (const file of files) {
          // Look for JSONL files (session logs)
          if (file.endsWith('.jsonl')) {
            const sessionId = file.replace('.jsonl', '');
            const jsonlPath = path.join(projPath, file);

            try {
              const meta = getSessionMeta(sessionId, resolvedPath, jsonlPath);
              sessions.push(meta);
              seenIds.add(sessionId);
              totalMessages += meta.messageCount;
              totalParseErrors += meta.parseErrorCount;
              if (meta.errors.length > 0) {
                allErrors.push(...meta.errors.map(e => `${resolvedPath}/${file}: ${e}`));
              }
            } catch (err: any) {
              allErrors.push(`加载会话失败 ${sessionId}: ${err?.message || err}`);
            }
          }
        }

        // Check for session subdirectories (Claude Code sometimes nests session data)
        for (const file of files) {
          try {
            const fullPath = path.join(projPath, file);
            if (!fs.statSync(fullPath).isDirectory()) continue;
            if (seenIds.has(file)) continue; // Already found at project level

            const jsonlFile = path.join(fullPath, `${file}.jsonl`);
            if (fs.existsSync(jsonlFile)) {
              try {
                const meta = getSessionMeta(file, resolvedPath, jsonlFile);
                sessions.push(meta);
                seenIds.add(file);
                totalMessages += meta.messageCount;
                totalParseErrors += meta.parseErrorCount;
              } catch (err: any) {
                allErrors.push(`加载嵌套会话失败 ${file}: ${err?.message || err}`);
              }
            }
          } catch {
            continue;
          }
        }
      } catch (err: any) {
        allErrors.push(`扫描项目失败 ${resolvedPath}: ${err?.message || err}`);
      }

      // 过滤掉 JSONL 文件已不存在的会话（可能在外部被删除）
      // 注意：正在运行但尚未写入 JSONL 的会话（jsonlPath 为空）保留
      const validSessions = sessions.filter(s => s.jsonlPath === '' || fs.existsSync(s.jsonlPath));

      // Sort sessions by last message time (newest first)
      validSessions.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
      totalSessions += validSessions.length;

      if (validSessions.length === 0) continue;

      // 项目路径已失效 → 孤项目
      if (decodedPath && !fs.existsSync(decodedPath)) {
        orphanedProjects.set(encodedName, {
          encodedDirName: encodedName,
          oldPath: resolvedPath,
          sessions: validSessions,
        });
      } else {
        projects.set(resolvedPath, {
          decodedPath: resolvedPath,
          encodedDirName: encodedName,
          sessions: validSessions,
        });
      }
    }
  } catch (err: any) {
    allErrors.push(`扫描项目目录失败: ${err?.message || err}`);
  }

  // Sort projects by most recent activity
  const sortedProjects = new Map(
    [...projects.entries()].sort((a, b) => {
      const aLatest = a[1].sessions[0]?.lastMessageAt.getTime() || 0;
      const bLatest = b[1].sessions[0]?.lastMessageAt.getTime() || 0;
      return bLatest - aLatest;
    }),
  );

  return {
    projects: sortedProjects,
    orphanedProjects,
    totalSessions,
    totalMessages,
    totalErrors: allErrors.length + totalParseErrors,
    errors: allErrors,
    scanTime: Date.now(),
  };
}

/**
 * Load session messages for preview. Handles partial writes gracefully.
 */
export function loadSessionMessages(jsonlPath: string, limit = 200): SessionEntry[] {
  const messages: SessionEntry[] = [];
  if (!fs.existsSync(jsonlPath)) return messages;

  let content: string;
  try {
    content = fs.readFileSync(jsonlPath, 'utf-8');
  } catch {
    return messages;
  }

  if (!content.trim()) return messages;

  const lines = content.split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line) as SessionEntry;
      if (entry.type === 'user' || entry.type === 'assistant') {
        messages.push(entry);
        if (messages.length >= limit) break;
      }
    } catch {
      // Skip unparseable lines (may be mid-write)
      continue;
    }
  }

  return messages;
}

/**
 * Load all user messages from a session (for export).
 */
export function loadAllUserAndAssistantMessages(jsonlPath: string): SessionEntry[] {
  const messages: SessionEntry[] = [];
  if (!fs.existsSync(jsonlPath)) return messages;

  let content: string;
  try {
    content = fs.readFileSync(jsonlPath, 'utf-8');
  } catch {
    return messages;
  }

  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line) as SessionEntry;
      if (entry.type === 'user' || entry.type === 'assistant') {
        messages.push(entry);
      }
    } catch {
      continue;
    }
  }

  return messages;
}
