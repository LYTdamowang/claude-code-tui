import { Box, Text } from 'ink';
import { C, D } from '../theme.js';
import type { SessionMeta } from '../../data/types.js';
import type { ActionItem } from './ActionMenu.js';

interface ConfirmDialogProps {
  session: SessionMeta;
  menu: ActionItem[];
  actionMenuIndex: number;
  confirmIndex: number;
}

function trunc(s: string, max: number): string {
  return s.length <= max ? s : '...' + s.slice(-(max - 3));
}

const CONFIRM_OPTIONS = ['是，确认执行', '否，返回上一步'];

export default function ConfirmDialog({ session, menu, actionMenuIndex, confirmIndex }: ConfirmDialogProps) {
  const actionItem = menu[actionMenuIndex];
  if (!actionItem) return null;

  const isDanger = actionItem.dangerous;
  const accent = isDanger ? C.red : C.accent;
  const accentBg = isDanger ? C.redBg : C.accentBg;
  const accentHi = isDanger ? C.white : C.accentHi;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={accent} paddingX={3} paddingY={1}>

      <Box marginBottom={1}>
        <Text color={accent}>⚡</Text>
        <Text backgroundColor={accentBg} color={accentHi} bold> {actionItem.label} </Text>
        <Text color={C.mute}> — 请确认此操作</Text>
      </Box>

      <Box>
        <Text color={C.mute}>会话 </Text>
        <Text color={C.text} bold>{session.sessionId.substring(0, 8)}</Text>
      </Box>
      <Box>
        <Text color={C.mute}>项目 </Text>
        <Text color={C.text}>{trunc(session.projectPath, 44)}</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={C.mute}>消息 </Text>
        <Text color={C.green}>{session.messageCount} 条</Text>
        <Text color={C.mute}>  ·  </Text>
        <Text color={C.blue}>{(session.fileSize / 1024).toFixed(1)} KB</Text>
      </Box>

      {actionItem.action === 'delete' && (
        <Box marginBottom={1}>
          <Text backgroundColor={C.redBg} color={C.red} bold> ✂ 此操作将永久删除会话数据，不可恢复！</Text>
        </Box>
      )}
      {actionItem.action === 'archive' && (
        <Box marginBottom={1}>
          <Text color={C.hint}>📦 对话将移入归档目录保存，不会丢失，后续可随时恢复。</Text>
        </Box>
      )}
      {actionItem.action === 'export' && (
        <Box marginBottom={1}>
          <Text color={C.hint}>📄 对话内容将导出为 Markdown 文件，保存在当前目录。</Text>
        </Box>
      )}
      {actionItem.action === 'resume' && (
        <Box marginBottom={1}>
          <Text color={C.hint}>🖥 将在新终端窗口中恢复此历史对话，并自动切换到项目目录。</Text>
        </Box>
      )}
      {actionItem.action === 'migrate' && (
        <Box marginBottom={1}>
          <Text color={C.hint}>🔄 为该项目指定新的磁盘路径，使历史会话重新可访问。</Text>
        </Box>
      )}

      <Box>
        <Text color={C.line}>{'─'.repeat(40)}</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {CONFIRM_OPTIONS.map((opt, i) => {
          const isSel = i === confirmIndex;
          const isYes = i === 0;
          const c = isYes && isDanger ? C.red : C.accent;
          const cBg = isYes && isDanger ? C.redBg : C.accentBg;
          const cHi = isYes && isDanger ? C.white : C.accentHi;
          return (
            <Box key={i} backgroundColor={isSel ? cBg : undefined} paddingLeft={1}>
              <Text color={isSel ? c : C.mute}>  {isSel ? D.sel : ' '} </Text>
              <Text color={isSel ? cHi : C.hint} bold={isSel}>{opt}</Text>
              {isSel && isYes && isDanger && <Text color={C.red} bold>  ⚠</Text>}
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text color={C.mute}>  ← → 切换选项    Enter 确认执行    Esc 取消返回</Text>
      </Box>
    </Box>
  );
}
