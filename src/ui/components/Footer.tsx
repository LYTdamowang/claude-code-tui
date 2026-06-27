import { Box, Text } from 'ink';
import { C } from '../theme.js';
import type { UIState } from '../types.js';

interface FooterProps { uiState: UIState }

export default function Footer({ uiState }: FooterProps) {
  return (
    <Box flexDirection="column" justifyContent="center" height={3} borderStyle="round" borderColor={C.borderHi} backgroundColor={C.card} paddingX={2} marginTop={1}>
      <Box>
        <Box justifyContent="space-between" flexGrow={1}>
        {uiState === 'browse' && (
          <>
            <Box gap={1}>
              <Box><Text color={C.green} bold>↑↓</Text><Text color={C.hint}> 浏览</Text></Box>
              <Box><Text color={C.gold} bold>Enter</Text><Text color={C.hint}> 操作</Text></Box>
              <Box><Text color={C.blue} bold>Ctrl+R</Text><Text color={C.hint}> 刷新</Text></Box>
            </Box>
            <Box><Text color={C.red} bold>Ctrl+C</Text><Text color={C.hint}> 退出</Text></Box>
          </>
        )}
        {uiState === 'action-menu' && (
          <>
            <Box gap={1}>
              <Box><Text color={C.green} bold>↑↓</Text><Text color={C.hint}> 选择</Text></Box>
              <Box><Text color={C.gold} bold>Enter</Text><Text color={C.hint}> 确认</Text></Box>
            </Box>
            <Box><Text color={C.red} bold>Esc</Text><Text color={C.hint}> 返回</Text></Box>
          </>
        )}
        {uiState === 'confirm' && (
          <>
            <Box gap={1}>
              <Box><Text color={C.green} bold>← →</Text><Text color={C.hint}> 切换</Text></Box>
              <Box><Text color={C.gold} bold>Enter</Text><Text color={C.hint}> 执行</Text></Box>
            </Box>
            <Box><Text color={C.red} bold>Esc</Text><Text color={C.hint}> 返回</Text></Box>
          </>
        )}
        {uiState === 'new-session-menu' && (
          <>
            <Box gap={1}>
              <Box><Text color={C.green} bold>← →</Text><Text color={C.hint}> 切换</Text></Box>
              <Box><Text color={C.gold} bold>Enter</Text><Text color={C.hint}> 确认</Text></Box>
            </Box>
            <Box><Text color={C.red} bold>Esc</Text><Text color={C.hint}> 返回</Text></Box>
          </>
        )}
        {uiState === 'migrate-input' && (
          <>
            <Box gap={1}>
              <Box><Text color={C.green}>键入</Text><Text color={C.hint}> 新路径</Text></Box>
              <Box><Text color={C.gold} bold>Enter</Text><Text color={C.hint}> 确认</Text></Box>
            </Box>
            <Box><Text color={C.red} bold>Esc</Text><Text color={C.hint}> 取消</Text></Box>
          </>
        )}
        </Box>
      </Box>
    </Box>
  );
}
