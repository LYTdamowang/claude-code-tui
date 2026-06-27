import { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { C, D } from '../theme.js';
import type { ProjectEntry, OrphanedProject } from '../../data/types.js';
import ProjectNode from './ProjectNode.js';

interface RightPanelProps {
  projects: ProjectEntry[];
  orphaned: OrphanedProject[];
  selectedProjectIndex: number;
  selectedOrphanedIndex: number;
  selectedSessionIndex: number;
  cwd: string;
}

type ListItem =
  | { kind: 'orphaned'; project: OrphanedProject; oi: number }
  | { kind: 'project'; project: ProjectEntry; pi: number };

export default function RightPanel({
  projects, orphaned, selectedProjectIndex,
  selectedOrphanedIndex, selectedSessionIndex, cwd,
}: RightPanelProps) {
  const colW = Math.max(30, Math.floor((process.stdout.columns || 100) * 0.56));
  const VISIBLE = 8;

  // 拼成统一列表：孤项目在上，正常项目在下
  const items: ListItem[] = [
    ...orphaned.map((op, oi) => ({ kind: 'orphaned' as const, project: op, oi })),
    ...projects.map((p, pi) => ({ kind: 'project' as const, project: p, pi })),
  ];

  // 统一的选中索引
  const unifiedSel = selectedOrphanedIndex >= 0
    ? selectedOrphanedIndex
    : selectedProjectIndex >= 0
      ? orphaned.length + selectedProjectIndex
      : -1;

  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    if (unifiedSel >= 0) {
      if (unifiedSel < scrollOffset) {
        setScrollOffset(unifiedSel);
      } else if (unifiedSel >= scrollOffset + VISIBLE) {
        setScrollOffset(unifiedSel - VISIBLE + 1);
      }
    }
  }, [unifiedSel]);

  const visibleItems = items.slice(scrollOffset, scrollOffset + VISIBLE);
  const hasAbove = scrollOffset > 0;
  const hasBelow = scrollOffset + VISIBLE < items.length;

  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text color={C.accent}>{D.project}</Text>
        <Text color={C.text} bold> 项目历史</Text>
        <Text color={C.mute}>  {items.length} 个项目</Text>
        {hasAbove && <Text color={C.gold}>  ↑</Text>}
        {hasBelow && <Text color={C.gold}>  ↓</Text>}
      </Box>

      {items.length > 0 ? (
        <Box flexDirection="column">
          {hasAbove && (
            <Text backgroundColor={C.accentBg} color={C.accent}> ↑ 上方 {scrollOffset} 个项目 </Text>
          )}
          {visibleItems.map((item, vi) => (
            <Box key={`${item.kind}-${item.project.encodedDirName}`} marginBottom={1}>
              <ProjectNode
                project={item.kind === 'orphaned'
                  ? { decodedPath: (item.project as OrphanedProject).oldPath, encodedDirName: item.project.encodedDirName, sessions: item.project.sessions }
                  : item.project as ProjectEntry}
                isExpanded={item.kind === 'orphaned'
                  ? item.oi === selectedOrphanedIndex
                  : item.pi === selectedProjectIndex}
                isCurrentProject={item.kind === 'project' && (item.project as ProjectEntry).decodedPath.replace(/\\/g, '/').toLowerCase() === cwd.replace(/\\/g, '/').toLowerCase()}
                selectedSessionIndex={
                  (item.kind === 'orphaned' && item.oi === selectedOrphanedIndex) ||
                  (item.kind === 'project' && item.pi === selectedProjectIndex)
                    ? selectedSessionIndex : -1}
                isOrphaned={item.kind === 'orphaned'}
                width={colW}
              />
            </Box>
          ))}
          {hasBelow && (
            <Text backgroundColor={C.accentBg} color={C.accent}> ↓ 下方 {items.length - scrollOffset - VISIBLE} 个项目 </Text>
          )}
        </Box>
      ) : (
        <Box marginY={2} paddingLeft={2}>
          <Text color={C.hint}>暂无历史对话。启动 Claude Code 即可自动记录。</Text>
        </Box>
      )}
    </Box>
  );
}
