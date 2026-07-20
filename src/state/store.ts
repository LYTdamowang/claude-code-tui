import { ProjectEntry, SessionMeta, SessionEntry, FilterState, SortMode, FocusPanel, DialogType, ScanResult, OrphanedProject } from '../data/types.js';
import { scanAll, loadSessionMessages } from '../data/scanner.js';
import { autoMigrateOrDelete } from '../actions/session-actions.js';

export interface AppState {
  projects: Map<string, ProjectEntry>;
  orphanedProjects: Map<string, OrphanedProject>;
  selectedProjectIndex: number;
  selectedSessionIndex: number;
  // 孤项目列表有独立的选中索引，-1 表示未选中孤项目
  selectedOrphanedIndex: number;
  previewMessages: SessionEntry[];
  previewScrollOffset: number;
  filter: FilterState;
  focus: FocusPanel;
  dialog: DialogType;
  dialogData: unknown;
  statusMessage: string;
  scanTime: number;
  totalSessions: number;
  totalMessages: number;
  totalErrors: number;
  scanErrors: string[];
  liveStatus: 'idle' | 'scanning' | 'live';
}

export function createInitialState(): AppState {
  let result = scanAll();

  if (result.orphanedProjects.size > 0) {
    const stats = autoMigrateOrDelete(result.orphanedProjects, result.projects);
    if (stats.migrated > 0 || stats.deleted > 0) {
      result = scanAll();
    }
  }

  return buildState(result);
}

function buildState(result: ScanResult): AppState {
  return {
    projects: result.projects,
    orphanedProjects: result.orphanedProjects,
    selectedProjectIndex: -1,
    selectedOrphanedIndex: -1,
    selectedSessionIndex: 0,
    previewMessages: [],
    previewScrollOffset: 0,
    filter: { textQuery: '', sortBy: 'time' },
    focus: 'tree',
    dialog: 'none',
    dialogData: null,
    statusMessage: 'Ready',
    scanTime: result.scanTime,
    totalSessions: result.totalSessions,
    totalMessages: result.totalMessages,
    totalErrors: result.totalErrors,
    scanErrors: result.errors,
    liveStatus: 'live',
  };
}

export function getSelectedSession(state: AppState): SessionMeta | null {
  const project = getSelectedProject(state);
  if (project && state.selectedSessionIndex < project.sessions.length) {
    return project.sessions[state.selectedSessionIndex];
  }
  // 检查孤项目
  if (state.selectedOrphanedIndex >= 0) {
    const orphaned = getFilteredOrphanedProjects(state);
    if (state.selectedOrphanedIndex < orphaned.length && state.selectedSessionIndex < orphaned[state.selectedOrphanedIndex].sessions.length) {
      return orphaned[state.selectedOrphanedIndex].sessions[state.selectedSessionIndex];
    }
  }
  return null;
}

export function getSelectedProject(state: AppState): ProjectEntry | null {
  const projects = getFilteredProjects(state);
  if (state.selectedProjectIndex >= 0 && state.selectedProjectIndex < projects.length) {
    return projects[state.selectedProjectIndex];
  }
  return null;
}

export function getFilteredOrphanedProjects(state: AppState): OrphanedProject[] {
  let result = [...state.orphanedProjects.values()].filter(p => p.sessions.length > 0);
  if (state.filter.textQuery) {
    const query = state.filter.textQuery.toLowerCase();
    result = result.filter(
      p =>
        p.oldPath.toLowerCase().includes(query) ||
        p.sessions.some(
          s =>
            s.summary.toLowerCase().includes(query) ||
            s.sessionId.toLowerCase().includes(query),
        ),
    );
  }
  return result;
}

export function getFilteredProjects(state: AppState): ProjectEntry[] {
  // 过滤掉没有任何会话的空项目
  let projects = [...state.projects.values()].filter(p => p.sessions.length > 0);

  if (state.filter.textQuery) {
    const query = state.filter.textQuery.toLowerCase();
    projects = projects.filter(
      p =>
        p.decodedPath.toLowerCase().includes(query) ||
        p.sessions.some(
          s =>
            s.summary.toLowerCase().includes(query) ||
            s.sessionId.toLowerCase().includes(query),
        ),
    );
  }

  if (state.filter.sortBy === 'name') {
    projects.sort((a, b) => a.decodedPath.localeCompare(b.decodedPath));
  }

  return projects;
}

export function loadPreviewForSession(state: AppState): AppState {
  const session = getSelectedSession(state);
  if (!session) {
    return { ...state, previewMessages: [], previewScrollOffset: 0 };
  }

  try {
    const messages = loadSessionMessages(session.jsonlPath, 200);
    return { ...state, previewMessages: messages, previewScrollOffset: 0 };
  } catch {
    return { ...state, previewMessages: [], previewScrollOffset: 0 };
  }
}

export function rescanData(state: AppState): AppState {
  let result = scanAll();

  if (result.orphanedProjects.size > 0) {
    const stats = autoMigrateOrDelete(result.orphanedProjects, result.projects);
    if (stats.migrated > 0 || stats.deleted > 0) {
      result = scanAll();
    }
  }

  const newState = buildState(result);

  // Preserve "新建对话" selection
  if (state.selectedProjectIndex === -1 && state.selectedOrphanedIndex === -1) {
    newState.selectedProjectIndex = -1;
    newState.selectedOrphanedIndex = -1;
    newState.selectedSessionIndex = 0;
    newState.previewMessages = [];
    return newState;
  }

  // Preserve session selection if possible
  const oldSession = getSelectedSession(state);
  if (oldSession) {
    // 先在正常项目中查找
    const project = newState.projects.get(oldSession.projectPath);
    if (project) {
      const projects = [...newState.projects.values()];
      const projIdx = projects.indexOf(project);
      const sessIdx = project.sessions.findIndex(s => s.sessionId === oldSession.sessionId);
      if (projIdx >= 0 && sessIdx >= 0) {
        newState.selectedProjectIndex = projIdx;
        newState.selectedSessionIndex = sessIdx;
      }
    } else {
      // 在孤项目中查找
      for (const [encodedName, op] of newState.orphanedProjects) {
        const sessIdx = op.sessions.findIndex(s => s.sessionId === oldSession.sessionId);
        if (sessIdx >= 0) {
          const orphaned = [...newState.orphanedProjects.values()].filter(p => p.sessions.length > 0);
          const opIdx = orphaned.indexOf(op);
          if (opIdx >= 0) {
            newState.selectedProjectIndex = -1;
            newState.selectedOrphanedIndex = opIdx;
            newState.selectedSessionIndex = sessIdx;
          }
          break;
        }
      }
    }
  }

  // Load preview for current selection
  const session = getSelectedSession(newState);
  if (session) {
    try {
      newState.previewMessages = loadSessionMessages(session.jsonlPath, 200);
    } catch {
      newState.previewMessages = [];
    }
  }

  return newState;
}

export function getTotalSessionCount(state: AppState): number {
  let count = 0;
  for (const project of state.projects.values()) {
    count += project.sessions.length;
  }
  return count;
}
