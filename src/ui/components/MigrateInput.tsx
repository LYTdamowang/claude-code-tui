import { Box, Text, useInput } from 'ink';
import { C, D } from '../theme.js';

interface MigrateInputProps {
  oldPath: string;
  value: string;
  onChange: (value: string) => void;
}

export default function MigrateInput({ oldPath, value, onChange }: MigrateInputProps) {
  useInput((input, key) => {
    if (key.backspace || key.delete) { onChange(value.slice(0, -1)); return; }
    if (input && input.length >= 1 && !key.ctrl && !key.meta && !key.tab && !key.escape && !key.return) {
      onChange(value + input);
    }
  });

  const display = value || '█';

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={C.accent} paddingX={3} paddingY={1} minWidth={60}>

      <Box marginBottom={1}>
        <Text color={C.accent}>🔄</Text>
        <Text backgroundColor={C.accentBg} color={C.accentHi} bold> 迁移项目 </Text>
        <Text color={C.mute}> — 将该项目映射到新的磁盘路径</Text>
      </Box>

      <Box paddingLeft={2} marginY={1}>
        <Text color={C.mute}>⚠ 旧路径（已失效） </Text>
        <Text backgroundColor={C.redBg} color={C.red}>  {oldPath}  </Text>
      </Box>

      <Box paddingLeft={2} marginBottom={1}>
        <Text color={C.mute}>📁 新路径（请输入） </Text>
        <Text backgroundColor={C.greenBg} color={C.green} bold>  {display}  </Text>
      </Box>

      <Box paddingLeft={2}>
        <Text color={C.hint}>输入项目在磁盘上的完整路径（如 D:\Projects\my-app）</Text>
      </Box>

      <Box>
        <Text color={C.line}>{'─'.repeat(44)}</Text>
      </Box>

      <Box marginTop={1}>
        <Text color={C.mute}>  直接键入新路径  ·  </Text>
        <Text backgroundColor={C.accentBg} color={C.accent}> Enter </Text>
        <Text color={C.mute}> 确认迁移  ·  </Text>
        <Text backgroundColor={C.redBg} color={C.red}> Esc </Text>
        <Text color={C.mute}> 取消返回</Text>
      </Box>
    </Box>
  );
}
