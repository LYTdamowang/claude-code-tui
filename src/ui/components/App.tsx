import { useState, useEffect, useRef } from 'react';
import { Box, useInput, useApp } from 'ink';
import type { AppState } from '../../state/store.js';
import {
  createInitialState,
  getFilteredProjects,
  getFilteredOrphanedProjects,
  getSelectedSession,
  rescanData,
} from '../../state/store.js';
import { startWatcher } from '../../data/watcher.js';
import {
  resumeSession,
  newSession,
  deleteSession,
  archiveSession,
  exportSessionToMarkdown,
  migrateProject,
} from '../../actions/session-actions.js';
import type { UIState } from '../types.js';
import Header from './Header.js';
import Footer from './Footer.js';
import LeftPanel from './LeftPanel.js';
import RightPanel from './RightPanel.js';
import ActionMenu from './ActionMenu.js';
import { ACTION_MENU, ACTION_MENU_ORPHANED } from './ActionMenu.js';
import ConfirmDialog from './ConfirmDialog.js';
import NewSessionDialog from './NewSessionDialog.js';
import MigrateInput from './MigrateInput.js';

const getCWD = () => process.cwd();

export default function App() {
  const { exit } = useApp();
  const [state, setState] = useState<AppState>(() => {
    try { return createInitialState(); }
    catch { return createInitialState(); }
  });
  const [uiState, setUiState] = useState<UIState>('browse');
  const [actionMenuIdx, setActionMenuIdx] = useState(0);
  const [confirmIdx, setConfirmIdx] = useState(1);
  const [migrateValue, setMigrateValue] = useState('');

  const stateRef = useRef(state); stateRef.current = state;
  const uiStateRef = useRef(uiState); uiStateRef.current = uiState;
  const actionMenuIdxRef = useRef(actionMenuIdx); actionMenuIdxRef.current = actionMenuIdx;
  const confirmIdxRef = useRef(confirmIdx); confirmIdxRef.current = confirmIdx;
  const migrateValueRef = useRef(migrateValue); migrateValueRef.current = migrateValue;

  useEffect(() => {
    const doRescan = () => setState(prev => rescanData(prev));
    const stopWatcher = startWatcher(doRescan, doRescan);
    const onSigint = () => { stopWatcher(); exit(); };
    const onSigterm = () => { stopWatcher(); exit(); };
    process.on('SIGINT', onSigint);
    process.on('SIGTERM', onSigterm);
    return () => {
      stopWatcher();
      process.off('SIGINT', onSigint);
      process.off('SIGTERM', onSigterm);
    };
  }, [exit]);

  // ── Navigation ──
  function moveSelection(delta: number): void {
    setState(prev => {
      const projects = getFilteredProjects(prev);
      const orphaned = getFilteredOrphanedProjects(prev);

      if (prev.selectedProjectIndex === -1 && prev.selectedOrphanedIndex === -1) {
        if (delta > 0) {
          // 孤项目在上方 → 先走孤项目，再走正常项目
          if (orphaned.length > 0) return { ...prev, selectedProjectIndex: -1, selectedOrphanedIndex: 0, selectedSessionIndex: 0, previewMessages: [] };
          else if (projects.length > 0) return { ...prev, selectedProjectIndex: 0, selectedSessionIndex: 0, selectedOrphanedIndex: -1, previewMessages: [] };
        }
        return prev;
      }

      if (prev.selectedOrphanedIndex === -1) {
        const project = projects[prev.selectedProjectIndex];
        if (!project) return prev;
        const newIdx = prev.selectedSessionIndex + delta;
        if (newIdx >= 0 && newIdx < project.sessions.length) return { ...prev, selectedSessionIndex: newIdx, previewMessages: [] };
        if (newIdx < 0) {
          const np = prev.selectedProjectIndex - 1;
          if (np >= 0) return { ...prev, selectedProjectIndex: np, selectedSessionIndex: projects[np].sessions.length - 1, previewMessages: [] };
          // 正常项目上到顶 → 进入孤项目
          if (orphaned.length > 0) return { ...prev, selectedProjectIndex: -1, selectedOrphanedIndex: orphaned.length - 1, selectedSessionIndex: orphaned[orphaned.length - 1].sessions.length - 1, previewMessages: [] };
          return { ...prev, selectedProjectIndex: -1, selectedOrphanedIndex: -1, selectedSessionIndex: 0, previewMessages: [] };
        }
        if (newIdx >= project.sessions.length) {
          const np = prev.selectedProjectIndex + 1;
          if (np < projects.length) return { ...prev, selectedProjectIndex: np, selectedSessionIndex: 0, previewMessages: [] };
        }
        return prev;
      }

      const op = orphaned[prev.selectedOrphanedIndex];
      if (!op) return prev;
      const ns = prev.selectedSessionIndex + delta;
      if (ns >= 0 && ns < op.sessions.length) return { ...prev, selectedSessionIndex: ns, previewMessages: [] };
      if (ns < 0) {
        if (prev.selectedOrphanedIndex > 0) {
          const po = orphaned[prev.selectedOrphanedIndex - 1];
          return { ...prev, selectedOrphanedIndex: prev.selectedOrphanedIndex - 1, selectedSessionIndex: po.sessions.length - 1, previewMessages: [] };
        }
        // 孤项目上到顶 → 回到新建对话
        return { ...prev, selectedOrphanedIndex: -1, selectedProjectIndex: -1, selectedSessionIndex: 0, previewMessages: [] };
      }
      if (ns >= op.sessions.length) {
        if (prev.selectedOrphanedIndex + 1 < orphaned.length) return { ...prev, selectedOrphanedIndex: prev.selectedOrphanedIndex + 1, selectedSessionIndex: 0, previewMessages: [] };
        // 孤项目下到底 → 进入正常项目
        if (projects.length > 0) return { ...prev, selectedOrphanedIndex: -1, selectedProjectIndex: 0, selectedSessionIndex: 0, previewMessages: [] };
      }
      return prev;
    });
  }

  // ── Actions ──
  function executeAction(): void {
    const s = stateRef.current;
    const session = getSelectedSession(s);
    if (!session) return;

    const isOrphaned = s.selectedOrphanedIndex >= 0;
    const menu = isOrphaned ? ACTION_MENU_ORPHANED : ACTION_MENU;
    const item = menu[actionMenuIdxRef.current];
    if (!item || item.action === 'cancel') { setUiState('browse'); return; }

    switch (item.action) {
      case 'migrate': {
        const ops = getFilteredOrphanedProjects(s);
        const op = ops[s.selectedOrphanedIndex];
        if (!op) break;
        setMigrateValue('');
        setUiState('migrate-input');
        break;
      }
      case 'resume':
        resumeSession(session);
        try { process.chdir(session.projectPath); } catch { /* ok */ }
        setUiState('browse'); setActionMenuIdx(0); setConfirmIdx(1);
        setState(prev => rescanData(prev));
        setTimeout(() => setState(prev => rescanData(prev)), 800);
        break;
      case 'delete': {
        const ok = deleteSession(session);
        setUiState('browse'); setActionMenuIdx(0); setConfirmIdx(1);
        setState(prev => ok ? { ...rescanData(prev), selectedProjectIndex: -1, selectedOrphanedIndex: -1, selectedSessionIndex: 0 } : rescanData(prev));
        break;
      }
      case 'archive': {
        const ok = archiveSession(session);
        setUiState('browse'); setActionMenuIdx(0); setConfirmIdx(1);
        setState(prev => ok ? { ...rescanData(prev), selectedProjectIndex: -1, selectedOrphanedIndex: -1, selectedSessionIndex: 0 } : rescanData(prev));
        break;
      }
      case 'export': {
        exportSessionToMarkdown(session, `${session.sessionId.substring(0, 8)}.md`);
        setUiState('browse'); setActionMenuIdx(0); setConfirmIdx(1);
        break;
      }
    }
  }

  // ── Keyboard ──
  useInput((input, key) => {
    const curUi = uiStateRef.current;
    const curState = stateRef.current;

    if (curUi === 'migrate-input') {
      if (key.escape) { setUiState('action-menu'); setMigrateValue(''); return; }
      if (key.return) {
        const np = migrateValueRef.current.trim();
        if (!np) return;
        const ops = getFilteredOrphanedProjects(curState);
        const op = ops[curState.selectedOrphanedIndex];
        if (!op) return;
        migrateProject(op.encodedDirName, np);
        setUiState('browse'); setMigrateValue('');
        setState(prev => rescanData(prev));
        return;
      }
      return;
    }

    if (key.escape) {
      if (curUi === 'confirm') { setUiState('action-menu'); return; }
      if (curUi === 'action-menu' || curUi === 'new-session-menu') { setUiState('browse'); setActionMenuIdx(0); setConfirmIdx(1); return; }
      return;
    }

    if (key.upArrow || input === 'k') {
      if (curUi === 'browse') { moveSelection(-1); return; }
      if (curUi === 'action-menu') { const m = curState.selectedOrphanedIndex >= 0 ? ACTION_MENU_ORPHANED : ACTION_MENU; setActionMenuIdx(Math.max(0, actionMenuIdxRef.current - 1)); return; }
      if (curUi === 'confirm' || curUi === 'new-session-menu') { setConfirmIdx(Math.max(0, confirmIdxRef.current - 1)); return; }
    }

    if (key.downArrow || input === 'j') {
      if (curUi === 'browse') { moveSelection(1); return; }
      if (curUi === 'action-menu') { const m = curState.selectedOrphanedIndex >= 0 ? ACTION_MENU_ORPHANED : ACTION_MENU; setActionMenuIdx(Math.min(m.length - 1, actionMenuIdxRef.current + 1)); return; }
      if (curUi === 'confirm' || curUi === 'new-session-menu') { setConfirmIdx(Math.min(1, confirmIdxRef.current + 1)); return; }
    }

    if (key.leftArrow || input === 'h') {
      if (curUi === 'confirm' || curUi === 'new-session-menu') { setConfirmIdx(0); return; }
    }

    if (key.rightArrow || input === 'l') {
      if (curUi === 'confirm' || curUi === 'new-session-menu') { setConfirmIdx(1); return; }
    }

    if (key.return) {
      if (curUi === 'browse') {
        const s = curState;
        if (s.selectedProjectIndex === -1 && s.selectedOrphanedIndex === -1) { setUiState('new-session-menu'); setConfirmIdx(1); return; }
        const sess = getSelectedSession(s);
        if (!sess) return;
        setUiState('action-menu'); setActionMenuIdx(0);
        return;
      }
      if (curUi === 'action-menu') {
        const m = curState.selectedOrphanedIndex >= 0 ? ACTION_MENU_ORPHANED : ACTION_MENU;
        const item = m[actionMenuIdxRef.current];
        if (!item || item.action === 'cancel') { setUiState('browse'); setActionMenuIdx(0); return; }
        setUiState('confirm'); setConfirmIdx(1);
        return;
      }
      if (curUi === 'confirm') {
        if (confirmIdxRef.current === 0) executeAction(); else setUiState('action-menu');
        return;
      }
      if (curUi === 'new-session-menu') {
        if (confirmIdxRef.current === 0) {
          setUiState('browse'); setConfirmIdx(1);
          newSession(getCWD());
          setState(prev => rescanData(prev));
          setTimeout(() => setState(prev => rescanData(prev)), 800);
        } else { setUiState('browse'); setConfirmIdx(1); }
        return;
      }
    }

    if (key.ctrl && input === 'r') {
      if (curUi === 'browse') setState(prev => rescanData(prev));
    }
  });

  // ── Derived data ──
  const projects = getFilteredProjects(state);
  const orphaned = getFilteredOrphanedProjects(state);
  const session = getSelectedSession(state);
  const cwd = getCWD();
  const termHeight = process.stdout.rows || 40;
  const isNewSessionSel = state.selectedProjectIndex === -1 && state.selectedOrphanedIndex === -1;

  // ── Modals ──
  if (uiState === 'action-menu' && session) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" height={termHeight}>
        <ActionMenu session={session} isOrphaned={state.selectedOrphanedIndex >= 0} selectedIndex={actionMenuIdx} />
      </Box>
    );
  }
  if (uiState === 'confirm' && session) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" height={termHeight}>
        <ConfirmDialog
          session={session}
          menu={state.selectedOrphanedIndex >= 0 ? ACTION_MENU_ORPHANED : ACTION_MENU}
          actionMenuIndex={actionMenuIdx}
          confirmIndex={confirmIdx}
        />
      </Box>
    );
  }
  if (uiState === 'new-session-menu') {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" height={termHeight}>
        <NewSessionDialog cwd={cwd} confirmIndex={confirmIdx} />
      </Box>
    );
  }
  if (uiState === 'migrate-input') {
    const op = orphaned[state.selectedOrphanedIndex];
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" height={termHeight}>
        <MigrateInput oldPath={op?.oldPath || ''} value={migrateValue} onChange={setMigrateValue} />
      </Box>
    );
  }

  // ── Main layout ──
  return (
    <Box flexDirection="column" height={termHeight}>
      <Header
        cwd={cwd}
        projectCount={projects.length}
        sessionCount={state.totalSessions}
        messageCount={state.totalMessages}
      />
      <Box flexDirection="row" height={Math.max(10, termHeight - 4)}>
        <LeftPanel
          session={session}
          isNewSessionSelected={isNewSessionSel}
          cwd={cwd}
        />
        <RightPanel
          projects={projects}
          orphaned={orphaned}
          selectedProjectIndex={state.selectedProjectIndex}
          selectedOrphanedIndex={state.selectedOrphanedIndex}
          selectedSessionIndex={state.selectedSessionIndex}
          cwd={cwd}
        />
      </Box>
      <Footer uiState={uiState} />
    </Box>
  );
}
