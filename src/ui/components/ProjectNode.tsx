import { Box, Text } from 'ink';
import { C, D } from '../theme.js';
import type { ProjectEntry, SessionMeta } from '../../data/types.js';
import SessionRow from './SessionRow.js';

interface ProjectNodeProps {
  project: ProjectEntry;
  isExpanded: boolean;
  isCurrentProject: boolean;
  selectedSessionIndex: number;
  isOrphaned: boolean;
  width: number;
}

function trunc(s: string, max: number): string {
  return s.length <= max ? s : '...' + s.slice(-(max - 3));
}

export default function ProjectNode({ project, isExpanded, isCurrentProject, selectedSessionIndex, isOrphaned, width }: ProjectNodeProps) {
  const p = isExpanded ? D.expand : D.fold;
  const maxPath = Math.max(width - 20, 14);
  const name = trunc(project.decodedPath, maxPath);
  const sc = project.sessions.length;
  const fg = isOrphaned ? C.red : C.text;

  return (
    <Box flexDirection="column">
      {/* 项目行 — 展开时柔绿背景高亮 */}
      <Box backgroundColor={isExpanded ? C.greenBg : undefined} paddingX={1}>
        <Text color={isExpanded ? C.accent : C.hint} bold={isExpanded}>{p} </Text>
        <Text color={fg} bold={isExpanded}>  ◈ {name}  </Text>
        {isCurrentProject && (
          <Text color={C.green}> {D.current} 当前项目</Text>
        )}
        <Text color={C.mute}>  {sc} 个会话</Text>
      </Box>
      {isExpanded && (
        <Box flexDirection="column" paddingLeft={2}>
            <Text color={isOrphaned ? C.red : C.hint}>{D.session} 会话记录</Text>
          {project.sessions.map((s: SessionMeta, i: number) => (
            <SessionRow
              key={s.sessionId}
              session={s}
              index={i}
              isSelected={i === selectedSessionIndex}
              isLast={i === project.sessions.length - 1}
              isOrphaned={isOrphaned}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
