import { Box, Text } from 'ink';
import { C, D } from '../theme.js';
import type { SessionMeta } from '../../data/types.js';

interface LeftPanelProps {
  session: SessionMeta | null;
  isNewSessionSelected: boolean;
  cwd: string;
}

export default function LeftPanel({ session, isNewSessionSelected, cwd }: LeftPanelProps) {
  return (
    <Box width="42%" flexDirection="column" marginRight={1}>
      {/* 新建对话 — 浮窗卡片 */}
      <Box
        height={4} flexDirection="column" justifyContent="center"
        borderStyle="bold" borderColor={C.accent}
        borderLeft={true} borderTop={false} borderRight={false} borderBottom={false}
        backgroundColor={isNewSessionSelected ? C.greenBg : C.card} paddingX={1}
      >
        <Box>
          <Text color={C.accent}>{D.star} </Text>
          <Text color={isNewSessionSelected ? C.green : C.text} bold>新建对话</Text>
        </Box>
        <Box paddingLeft={2}>
          <Text color={C.hint}>在当前目录启动全新的会话</Text>
        </Box>
      </Box>

      {/* 会话详情 / 欢迎 — 浮窗卡片 */}
      <Box flexGrow={1} marginTop={1}>
        <Box
          flexGrow={1}
          borderStyle="bold" borderColor={C.accent}
          borderLeft={true} borderTop={false} borderRight={false} borderBottom={false}
          backgroundColor={C.card}
        >
          {session ? (
            <SessionInfo session={session} />
          ) : isNewSessionSelected ? (
            <NewSessionHelp cwd={cwd} />
          ) : (
            <WelcomeHelp />
          )}
        </Box>
      </Box>
    </Box>
  );
}

function SessionInfo({ session }: { session: SessionMeta }) {
  const kb = (session.fileSize / 1024).toFixed(1);
  const summary = session.summary ? session.summary.substring(0, 43) + (session.summary.length > 43 ? '...' : '') : '暂无消息内容';
  return (
    <Box flexDirection="column" paddingX={1} paddingTop={1}>
      <Text color={C.accent}>{D.detail}<Text color={C.text} bold> 会话详情</Text></Text>

      <Box paddingLeft={2}>
        <Text color={C.text} bold>{session.sessionId}</Text>
      </Box>

      <Text color={C.line}>{'─'.repeat(28)}</Text>

      <Box paddingLeft={2}>
        <Text color={C.hint}>🕐 {session.firstMessageAt.toLocaleString('zh-CN')}</Text>
        <Text color={C.mute}> ~ </Text>
        <Text color={C.hint}>{session.lastMessageAt.toLocaleString('zh-CN')}</Text>
      </Box>

      <Box paddingLeft={2}>
        <Text color={C.green} bold>{session.messageCount} 条</Text>
        <Text color={C.mute}> · </Text>
        <Text color={C.blue}>{kb} KB</Text>
      </Box>

      <Text color={C.line}>{'─'.repeat(28)}</Text>

      <Text color={C.accent}>💬 最近消息：</Text>
      <Box paddingLeft={2}>
        <Text color={C.hint}>{summary}</Text>
      </Box>

      <Box marginTop={1}>
        <Text backgroundColor={C.accentBg} color={C.accent}> Enter </Text>
        <Text color={C.hint}> 打开操作菜单</Text>
      </Box>
    </Box>
  );
}

function NewSessionHelp({ cwd }: { cwd: string }) {
  return (
    <Box flexDirection="column" paddingX={1} paddingTop={1}>
      <Box marginBottom={1}>
        <Text color={C.accent}>{D.star} </Text>
        <Text color={C.text} bold>新建对话</Text>
      </Box>
      <Box paddingLeft={2}>
        <Text color={C.hint}>📁 目标目录</Text>
      </Box>
      <Box paddingLeft={2} marginBottom={1}>
        <Text color={C.text} bold>{cwd}</Text>
      </Box>
      <Box paddingLeft={2} marginBottom={1}>
        <Text color={C.hint}>将在新终端窗口中启动全新 Claude Code 会话</Text>
      </Box>
      <Box>
        <Text backgroundColor={C.accentBg} color={C.accent}> Enter </Text>
        <Text color={C.hint}> 确认创建</Text>
      </Box>
    </Box>
  );
}

function WelcomeHelp() {
  return (
    <Box flexDirection="column" paddingX={1} paddingTop={1}>
      <Box marginBottom={1}>
        <Text color={C.accent}>⚡</Text>
        <Text color={C.title} bold> Claude Code TUI</Text>
      </Box>
      <Box paddingLeft={2}>
        <Text color={C.hint}>终端历史会话管理器</Text>
      </Box>
      <Box marginY={1}>
        <Text color={C.line}>{'─'.repeat(26)}</Text>
      </Box>
      <Box flexDirection="column" gap={1}>
        <Box><Text backgroundColor={C.greenBg} color={C.green}> ↑↓ </Text><Text color={C.hint}>  浏览项目与会话</Text></Box>
        <Box><Text backgroundColor={C.accentBg} color={C.accent}> Enter </Text><Text color={C.hint}>  打开操作菜单</Text></Box>
        <Box><Text backgroundColor={C.redBg} color={C.red}> Esc </Text><Text color={C.hint}>  返回上级 / 退出</Text></Box>
        <Box><Text backgroundColor={C.blueBg} color={C.blue}> Ctrl+R </Text><Text color={C.hint}>  刷新数据</Text></Box>
        <Box><Text backgroundColor={C.goldBg} color={C.gold}> ← → </Text><Text color={C.hint}>  切换是/否选项</Text></Box>
      </Box>
    </Box>
  );
}
