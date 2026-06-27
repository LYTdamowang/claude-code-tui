import { Box, Text } from 'ink';
import { C } from '../theme.js';
import type { OrphanedProject } from '../../data/types.js';
import ProjectNode from './ProjectNode.js';

interface OrphanedSectionProps {
  orphanedProjects: OrphanedProject[];
  selectedOrphanedIndex: number;
  selectedSessionIndex: number;
  width: number;
}

export default function OrphanedSection({ orphanedProjects, selectedOrphanedIndex, selectedSessionIndex, width }: OrphanedSectionProps) {
  if (orphanedProjects.length === 0) return null;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginY={1}>
        <Text backgroundColor={C.redBg} color={C.red} bold> ⚠ 路径已失效 — {orphanedProjects.length} 个项目需迁移 </Text>
      </Box>
      {orphanedProjects.map((op, oi) => (
        <ProjectNode
          key={op.encodedDirName}
          project={{ decodedPath: op.oldPath, encodedDirName: op.encodedDirName, sessions: op.sessions }}
          isExpanded={oi === selectedOrphanedIndex}
          isCurrentProject={false}
          selectedSessionIndex={oi === selectedOrphanedIndex ? selectedSessionIndex : -1}
          isOrphaned
          width={width}
        />
      ))}
    </Box>
  );
}
