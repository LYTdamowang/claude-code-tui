import { Box, Text } from 'ink';
import { C } from '../theme.js';

interface HeaderProps {
  cwd: string;
  projectCount: number;
  sessionCount: number;
  messageCount: number;
}

export default function Header({ cwd, projectCount, sessionCount, messageCount }: HeaderProps) {
  const short = cwd.length > 32 ? '...' + cwd.slice(-29) : cwd;
  return (
    <Box flexDirection="column" justifyContent="center" height={3} borderStyle="round" borderColor={C.borderHi} backgroundColor={C.card} paddingX={2} marginBottom={1}>
      <Box>
        <Box width="30%">
          <Text color={C.accent} bold>⚡ Claude Code TUI</Text>
          <Text color={C.hint}> 历史会话管理器</Text>
        </Box>
        <Box width="40%" justifyContent="center">
          <Text color={C.hint}>📁 当前目录：</Text>
          <Text color={C.text}>{short}</Text>
        </Box>
        <Box width="30%" justifyContent="flex-end" gap={1}>
          <Text backgroundColor={C.accentBg} color={C.accent}> {projectCount} 项目 </Text>
          <Text backgroundColor={C.greenBg} color={C.green}> {sessionCount} 会话 </Text>
          <Text backgroundColor={C.blueBg} color={C.blue}> {messageCount} 消息 </Text>
        </Box>
      </Box>
    </Box>
  );
}
