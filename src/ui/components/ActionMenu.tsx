import { Box, Text } from 'ink';
import { C, D } from '../theme.js';
import type { SessionMeta } from '../../data/types.js';

export interface ActionItem {
  label: string;
  action: string;
  desc: string;
  dangerous: boolean;
}

export const ACTION_MENU: ActionItem[] = [
  { label: '恢复对话', action: 'resume', desc: '在新终端窗口中恢复此历史对话，并自动切换到项目目录', dangerous: false },
  { label: '导出对话', action: 'export', desc: '将对话导出为 Markdown 文件，保存在当前目录下', dangerous: false },
  { label: '归档对话', action: 'archive', desc: '将会话移入归档目录保存，后续可随时恢复', dangerous: false },
  { label: '删除对话', action: 'delete', desc: '永久删除此对话记录及其所有数据，此操作不可撤销', dangerous: true },
  { label: '返回', action: 'cancel', desc: '关闭操作菜单，返回主界面', dangerous: false },
];

export const ACTION_MENU_ORPHANED: ActionItem[] = [
  { label: '迁移项目', action: 'migrate', desc: '为该项目指定新的磁盘路径，使历史会话恢复可访问', dangerous: true },
  { label: '恢复对话', action: 'resume', desc: '尝试在旧路径下恢复此历史对话', dangerous: false },
  { label: '导出对话', action: 'export', desc: '将对话导出为 Markdown 文件，保存在当前目录下', dangerous: false },
  { label: '归档对话', action: 'archive', desc: '将会话移入归档目录保存，后续可随时恢复', dangerous: false },
  { label: '删除对话', action: 'delete', desc: '永久删除此对话记录及其所有数据，此操作不可撤销', dangerous: true },
  { label: '返回', action: 'cancel', desc: '关闭操作菜单，返回主界面', dangerous: false },
];

interface ActionMenuProps {
  session: SessionMeta;
  isOrphaned: boolean;
  selectedIndex: number;
}

export default function ActionMenu({ session, isOrphaned, selectedIndex }: ActionMenuProps) {
  const menu = isOrphaned ? ACTION_MENU_ORPHANED : ACTION_MENU;
  const idShort = session.sessionId.substring(0, 8);
  const summary = session.summary.length > 44 ? session.summary.substring(0, 44) + '...' : session.summary;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={C.accent} paddingX={3} paddingY={1} width={73}>

      <Box marginBottom={1}>
        <Text color={C.accent}>⚡</Text>
        <Text backgroundColor={C.accentBg} color={C.accentHi} bold> 选择操作 </Text>
        <Text color={C.mute}> — 请选择要对当前会话执行的操作</Text>
      </Box>

      <Box paddingLeft={2}>
        <Text color={C.mute}>会话 </Text>
        <Text color={C.text} bold>{idShort}</Text>
        <Text color={C.mute}>  ·  </Text>
        <Text color={C.green}>{session.messageCount} 条消息</Text>
      </Box>
      <Box paddingLeft={2} marginBottom={1}>
        <Text color={C.mute}>最近 </Text>
        <Text color={C.hint}>{summary}</Text>
      </Box>

      <Box>
        <Text color={C.line}>{'─'.repeat(44)}</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {menu.map((item, i) => {
          const isSel = i === selectedIndex;
          if (item.dangerous) {
            return (
              <Box key={item.action} flexDirection="column" marginTop={i > 0 ? 1 : 0} backgroundColor={isSel ? C.redBg : undefined}>
                <Box paddingLeft={1}>
                  <Text color={isSel ? C.red : C.mute}> {isSel ? D.sel : ' '} </Text>
                  <Text color={isSel ? C.white : C.hint} bold={isSel}>
                    {D.danger} {item.label}
                  </Text>
                  {isSel && <Text color={C.red} bold> {item.action === 'migrate' ? '⚠ 尽快迁移新路径' : '⚠ 危险操作'}</Text>}
                </Box>
                {item.desc ? (
                  <Box paddingLeft={5}>
                    <Text color={isSel ? C.red : C.mute}>{item.desc}</Text>
                  </Box>
                ) : null}
              </Box>
            );
          }
          return (
            <Box key={item.action} flexDirection="column" marginTop={i > 0 ? 1 : 0} backgroundColor={isSel ? C.cardHi : undefined}>
              <Box paddingLeft={1}>
                <Text color={isSel ? C.accent : C.mute}> {isSel ? D.sel : ' '} </Text>
                <Text color={isSel ? C.accentHi : C.hint} bold={isSel}>
                  {item.label}
                </Text>
              </Box>
              {item.desc ? (
                <Box paddingLeft={5}>
                  <Text color={isSel ? C.hint : C.mute}>{item.desc}</Text>
                </Box>
              ) : null}
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text color={C.mute}>  ↑↓ 选择操作    Enter 确认    Esc 返回</Text>
      </Box>
    </Box>
  );
}
