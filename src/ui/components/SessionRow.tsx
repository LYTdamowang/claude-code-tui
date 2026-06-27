import { Box, Text } from 'ink';
import { C, D } from '../theme.js';
import type { SessionMeta } from '../../data/types.js';

interface SessionRowProps {
  session: SessionMeta;
  index: number;
  isSelected: boolean;
  isLast: boolean;
  isOrphaned: boolean;
}

export default function SessionRow({ session, index, isSelected, isLast, isOrphaned }: SessionRowProps) {
  const date = session.firstMessageAt.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  const time = session.firstMessageAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const id = session.sessionId.substring(0, 8);
  const num = `[${String(index + 1).padStart(2)}]`;
  const msg = `${String(session.messageCount).padStart(3)} 条`;
  const tail = isLast ? '└' : '├';

  // 选中态颜色
  const a = isOrphaned ? C.red : C.accent;
  const aHi = isOrphaned ? C.white : C.accentHi;
  const bgHi = isOrphaned ? C.redBg : C.cardHi;

  if (isSelected) {
    return (
      <Box backgroundColor={bgHi}>
        <Text color={a}>{tail}{D.sel}</Text>
        <Text color={aHi} bold> {num}</Text>
        <Text color={a}> {id}</Text>
        <Text color={C.text}> {date} {time}</Text>
        <Text color={aHi}> {msg}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text color={C.mute}>{tail} </Text>
      <Text color={C.hint}>{num}</Text>
      <Text color={C.mute}> {id}</Text>
      <Text color={C.hint}> {date} {time}</Text>
      <Text color={C.mute}> {msg}</Text>
    </Box>
  );
}
