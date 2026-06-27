// Data types for Claude Code conversation history

export interface HistoryEntry {
  display: string;
  pastedContents: Record<string, unknown>;
  timestamp: number;
  project: string;
  sessionId: string;
}

export type SessionEntryType =
  | 'user'
  | 'assistant'
  | 'thinking'
  | 'tool_use'
  | 'tool_result'
  | 'message'
  | 'text'
  | 'file-history-snapshot'
  | 'attachment'
  | 'plan_mode'
  | 'permission-mode'
  | 'ai-title'
  | 'task_reminder'
  | 'skill_listing'
  | 'last-prompt'
  | 'system';

export interface SessionEntryUser {
  type: 'user';
  message: { role: 'user'; content: string };
  timestamp: string;
  sessionId: string;
  uuid: string;
  cwd?: string;
  parentUuid?: string | null;
  isSidechain?: boolean;
  userType?: string;
  entrypoint?: string;
}

export interface SessionEntryAssistant {
  type: 'assistant';
  message: {
    role: 'assistant';
    content: Array<{ type: string; text?: string; tool_use?: unknown }>;
  };
  timestamp: string;
  sessionId: string;
  uuid: string;
  parentUuid?: string | null;
}

export interface SessionEntryThinking {
  type: 'thinking';
  thinking: string;
  timestamp: string;
}

export interface SessionEntryToolUse {
  type: 'tool_use';
  name: string;
  input: unknown;
  timestamp: string;
  tool_use_id?: string;
}

export interface SessionEntryToolResult {
  type: 'tool_result';
  content: string;
  timestamp: string;
  tool_use_id?: string;
}

export type SessionEntry =
  | SessionEntryUser
  | SessionEntryAssistant
  | SessionEntryThinking
  | SessionEntryToolUse
  | SessionEntryToolResult
  | { type: string; [key: string]: unknown };

export interface SessionMeta {
  sessionId: string;
  projectPath: string;
  jsonlPath: string;
  firstMessageAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  summary: string;
  fileSize: number;
  errors: string[]; // Parsing errors encountered
  parseErrorCount: number; // Number of lines that failed to parse
}

export interface ProjectEntry {
  decodedPath: string;
  encodedDirName: string;
  sessions: SessionMeta[];
}

export interface OrphanedProject {
  encodedDirName: string;
  oldPath: string;          // 历史记录中的旧路径（已失效）
  sessions: SessionMeta[];
}

export interface ScanResult {
  projects: Map<string, ProjectEntry>;
  orphanedProjects: Map<string, OrphanedProject>;
  totalSessions: number;
  totalMessages: number;
  totalErrors: number;
  errors: string[];
  scanTime: number;
}

export interface FilterState {
  textQuery: string;
  sortBy: 'time' | 'name';
}

export type SortMode = 'time' | 'name';

export type FocusPanel = 'tree' | 'search';

export type DialogType = 'none' | 'confirm-resume' | 'confirm-delete' | 'confirm-archive' | 'export-options' | 'help' | 'help-dialog' | 'new-session';
