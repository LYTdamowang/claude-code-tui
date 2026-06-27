import { Box, Text } from 'ink';
import { C, D } from '../theme.js';

interface NewSessionDialogProps {
  cwd: string;
  confirmIndex: number;
}

const CONFIRM_OPTIONS = ['是，确认创建', '否，返回'];

export default function NewSessionDialog({ cwd, confirmIndex }: NewSessionDialogProps) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={C.accent} paddingX={3} paddingY={1}>

      <Box marginBottom={1}>
        <Text color={C.accent}>{D.star} </Text>
        <Text backgroundColor={C.accentBg} color={C.accentHi} bold> 新建对话 </Text>
        <Text color={C.mute}> — 在以下目录启动全新的 Claude Code 会话</Text>
      </Box>

      <Box paddingLeft={2} marginY={1}>
        <Text color={C.mute}>📁 目标目录 </Text>
        <Text color={C.text} bold>  {cwd}</Text>
      </Box>

      <Box paddingLeft={2}>
        <Text color={C.hint}>将在新终端窗口中启动 Claude Code，</Text>
      </Box>
      <Box paddingLeft={2} marginBottom={1}>
        <Text color={C.hint}>本 TUI 保持运行并实时记录新会话。</Text>
      </Box>

      <Box>
        <Text color={C.line}>{'─'.repeat(40)}</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {CONFIRM_OPTIONS.map((opt, i) => {
          const isSel = i === confirmIndex;
          return (
            <Box key={i} backgroundColor={isSel ? C.accentBg : undefined} paddingLeft={1}>
              <Text color={isSel ? C.accent : C.mute}>  {isSel ? D.sel : ' '} </Text>
              <Text color={isSel ? C.accentHi : C.hint} bold={isSel}>{opt}</Text>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text color={C.mute}>  ← → 切换选项    Enter 确认    Esc 取消</Text>
      </Box>
    </Box>
  );
}
