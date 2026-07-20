import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec, execSync } from 'child_process';
import { SessionMeta, OrphanedProject, ProjectEntry } from '../data/types.js';
import { getArchiveDir, encodePath, getProjectsDir } from '../data/path-codec.js';
import { loadAllUserAndAssistantMessages } from '../data/scanner.js';

/**
 * Spawn Claude Code in a NEW terminal window.
 * TUI keeps running independently. No extra flags — Claude reads its own config.
 */
function hasWindowsTerminal(): boolean {
  if (process.platform !== 'win32') return false;
  try {
    // wt.exe 通过 AppX 安装，在 PATH 中；execSync 失败会抛异常
    execSync('where wt', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function findClaudeExe(): string {
  if (process.platform === 'win32') {
    const candidates = [
      path.join(process.env.USERPROFILE || '', '.local', 'bin', 'claude.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'bin', 'claude.exe'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }
  return 'claude';
}

function spawnClaudeInNewWindow(args: string[], cwd: string): void {
  const isWindows = process.platform === 'win32';
  const claudeExe = findClaudeExe();
  const argsStr = args.length > 0 ? args.join(' ') : '';

  if (isWindows) {
    const psCmd = `chcp 65001 > $null; Set-Location -LiteralPath '${cwd}'; & '${claudeExe}' ${argsStr}`.trim();
    // PowerShell -EncodedCommand 要求 UTF-16LE 编码
    const encodedCmd = Buffer.from(psCmd, 'utf16le').toString('base64');

    if (hasWindowsTerminal()) {
      // -w 0 指定当前聚焦的 WT 窗口，在其中新建标签页
      const cmd = `wt -w 0 new-tab powershell -NoExit -EncodedCommand ${encodedCmd}`;
      exec(cmd, (err) => {
        if (err) {
          console.error(`\n启动 Claude Code 失败: ${err.message}`);
        }
      });
    } else {
      // 回退：创建新的 PowerShell 窗口
      const cmd = `start "" powershell -NoExit -EncodedCommand ${encodedCmd}`;
      exec(cmd, { windowsHide: false, shell: 'cmd.exe' }, (err) => {
        if (err) {
          console.error(`\n启动 Claude Code 失败: ${err.message}`);
        }
      });
    }
  } else {
    const terminal = process.env.TERMINAL || 'x-terminal-emulator';
    exec(`${terminal} -e "cd '${cwd}' && ${claudeExe} ${argsStr}"`, (err) => {
      if (err) {
        console.error(`\n启动 Claude Code 失败: ${err.message}`);
      }
    });
  }
}

/**
 * Resume a session in a new terminal window. TUI stays open.
 */
export function resumeSession(session: SessionMeta): void {
  spawnClaudeInNewWindow(['--resume', session.sessionId], session.projectPath);
}

/**
 * Start a new conversation in a new terminal window. TUI stays open.
 */
export function newSession(projectPath: string): void {
  spawnClaudeInNewWindow([], projectPath);
}

/**
 * Delete a session's JSONL file. Returns success.
 */
export function deleteSession(session: SessionMeta): boolean {
  const errors: string[] = [];

  // 1. 删除 JSONL 文件
  try {
    if (fs.existsSync(session.jsonlPath)) {
      fs.unlinkSync(session.jsonlPath);
    }
  } catch (err: any) {
    errors.push(`JSONL: ${err?.message || err}`);
  }

  // 2. 删除会话子目录（含 subagents 等所有内容）
  const sessionDir = path.join(path.dirname(session.jsonlPath), session.sessionId);
  try {
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  } catch (err: any) {
    errors.push(`Dir: ${err?.message || err}`);
  }

  // 3. 清理残留的 session 状态文件
  const sessionsDir = path.join(os.homedir(), '.claude', 'sessions');
  try {
    if (fs.existsSync(sessionsDir)) {
      const statusFiles = fs.readdirSync(sessionsDir);
      for (const sf of statusFiles) {
        if (!sf.endsWith('.json')) continue;
        try {
          const sfPath = path.join(sessionsDir, sf);
          const data = JSON.parse(fs.readFileSync(sfPath, 'utf-8'));
          if (data.sessionId === session.sessionId) {
            fs.unlinkSync(sfPath);
          }
        } catch { /* skip */ }
      }
    }
  } catch { /* ignore */ }

  // 4. 验证删除结果
  const jsonlGone = !session.jsonlPath || fs.existsSync(session.jsonlPath) === false;
  const dirGone = fs.existsSync(sessionDir) === false;

  if (!jsonlGone || !dirGone) {
    const parts: string[] = [];
    if (!jsonlGone) parts.push('JSONL 文件删除失败');
    if (!dirGone) parts.push('子目录删除失败');
    console.error('删除会话未完全清除:', parts.join('; '));
    return false;
  }

  if (errors.length > 0) {
    console.error('删除过程中有错误但最终清理成功:', errors.join('; '));
  }

  return true;
}

/**
 * Archive a session by moving its JSONL to ~/.claude/archive/
 */
export function archiveSession(session: SessionMeta): boolean {
  try {
    const archiveDir = getArchiveDir();
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }
    const destPath = path.join(archiveDir, `${session.sessionId}.jsonl`);
    fs.renameSync(session.jsonlPath, destPath);
    return true;
  } catch (err: any) {
    console.error('归档失败:', err?.message || err);
    return false;
  }
}

/**
 * Export a session to Markdown format.
 */
export function exportSessionToMarkdown(session: SessionMeta, exportPath: string): boolean {
  try {
    const messages = loadAllUserAndAssistantMessages(session.jsonlPath);
    let md = `# Session: ${session.sessionId}\n\n`;
    md += `- **Project**: ${session.projectPath}\n`;
    md += `- **Period**: ${session.firstMessageAt.toLocaleString()} ~ ${session.lastMessageAt.toLocaleString()}\n`;
    md += `- **Messages**: ${session.messageCount}\n`;
    md += `- **Size**: ${(session.fileSize / 1024).toFixed(1)} KB\n\n`;
    md += `---\n\n`;

    for (const msg of messages) {
      if (msg.type === 'user') {
        const userMsg = msg as import('../data/types.js').SessionEntryUser;
        md += `### You (${new Date(userMsg.timestamp).toLocaleTimeString()})\n\n${userMsg.message.content}\n\n`;
      } else if (msg.type === 'assistant') {
        const asstMsg = msg as import('../data/types.js').SessionEntryAssistant;
        const text = asstMsg.message?.content
          ?.filter((b: any) => b.type === 'text')
          ?.map((b: any) => b.text)
          ?.join('\n') || '(tool response)';
        md += `### Claude (${new Date(asstMsg.timestamp).toLocaleTimeString()})\n\n${text}\n\n`;
      }
    }

    fs.writeFileSync(exportPath, md, 'utf-8');
    return true;
  } catch (err: any) {
    console.error('导出失败:', err?.message || err);
    return false;
  }
}

/**
 * Get the list of historical project paths.
 */
export function getHistoricalProjects(): string[] {
  const projects: string[] = [];
  const claudeDir = path.join(os.homedir(), '.claude');
  const historyPath = path.join(claudeDir, 'history.jsonl');

  if (!fs.existsSync(historyPath)) return projects;

  try {
    const content = fs.readFileSync(historyPath, 'utf-8');
    const seen = new Set<string>();

    for (const line of content.trim().split('\n')) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        const proj = entry.project;
        if (proj && !seen.has(proj)) {
          seen.add(proj);
          projects.push(proj);
        }
      } catch {
        continue;
      }
    }
  } catch {
    // ignore
  }

  return projects;
}

/**
 * Migrate an orphaned project to a new directory path.
 * Renames the encoded project directory and updates history.jsonl.
 */
export function migrateProject(oldEncodedDir: string, newPath: string): string | null {
  const projectsDir = getProjectsDir();
  const newEncodedDir = encodePath(newPath);
  const oldDirPath = path.join(projectsDir, oldEncodedDir);
  const newDirPath = path.join(projectsDir, newEncodedDir);

  if (!fs.existsSync(oldDirPath)) return '旧项目目录不存在';
  if (!fs.existsSync(newPath)) return '新路径在磁盘上不存在';
  if (fs.existsSync(newDirPath) && newEncodedDir !== oldEncodedDir) return '新路径已有对应的项目目录，请先处理';

  // 1. 重命名编码目录（新旧编码相同时跳过）
  if (newEncodedDir !== oldEncodedDir) {
    try {
      fs.renameSync(oldDirPath, newDirPath);
    } catch (err: any) {
      return `重命名目录失败: ${err.message}`;
    }
  }

  // 2. 更新 history.jsonl 中的 project 字段
  const historyPath = path.join(os.homedir(), '.claude', 'history.jsonl');
  if (fs.existsSync(historyPath)) {
    try {
      const content = fs.readFileSync(historyPath, 'utf-8');
      const lines = content.trim().split('\n');
      const updatedLines = lines.map(line => {
        try {
          const entry = JSON.parse(line);
          // 根据编码目录名匹配需要更新的条目
          if (entry.project && encodePath(entry.project) === oldEncodedDir) {
            entry.project = newPath;
          }
          return JSON.stringify(entry);
        } catch {
          return line;
        }
      });
      fs.writeFileSync(historyPath, updatedLines.join('\n') + '\n', 'utf-8');
    } catch (err: any) {
      // 回滚目录重命名
      if (newEncodedDir !== oldEncodedDir) {
        try { fs.renameSync(newDirPath, oldDirPath); } catch { /* ignore */ }
      }
      return `更新 history.jsonl 失败: ${err.message}`;
    }
  }

  return null; // success
}

/**
 * 从孤项目的 session JSONL 文件中扫描有效的 cwd 路径（备用方案）。
 */
function findValidCwdFromSessions(encodedDirName: string): string | null {
  const projectsDir = getProjectsDir();
  const projPath = path.join(projectsDir, encodedDirName);

  if (!fs.existsSync(projPath)) return null;

  const candidates = new Map<string, number>();

  try {
    const files = fs.readdirSync(projPath);

    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;
      const jsonlPath = path.join(projPath, file);

      try {
        const content = fs.readFileSync(jsonlPath, 'utf-8');
        const lines = content.trim().split('\n');

        const startIdx = Math.max(0, lines.length - 200);
        for (let i = lines.length - 1; i >= startIdx; i--) {
          const line = lines[i].trim();
          if (!line) continue;
          try {
            const entry = JSON.parse(line);
            if (entry.type === 'user' && entry.cwd && typeof entry.cwd === 'string') {
              const cwd = entry.cwd.trim();
              if (cwd && fs.existsSync(cwd)) {
                candidates.set(cwd, (candidates.get(cwd) || 0) + 1);
                break;
              }
            }
          } catch { continue; }
        }
      } catch { continue; }
    }
  } catch { return null; }

  if (candidates.size === 0) return null;

  let bestPath = '';
  let bestCount = 0;
  for (const [p, count] of candidates) {
    if (count > bestCount) {
      bestCount = count;
      bestPath = p;
    }
  }

  return bestPath || null;
}

/**
 * 在文件系统中搜索孤项目可能的新位置。
 * 规则与 Claude Code 定位会话的逻辑一致——完全基于路径名匹配。
 * 1. 父目录下找同名目录（大小写变化/临时不可用恢复）
 * 2. 已知正常项目中找同叶子名的（移到了其他位置）
 * 3. 父目录下找"旧名为新名子串"的目录（改名：my-app → my-app-v2）
 * 4. 备用：扫描 session 中记录的 cwd 字段
 */
function findValidPathForOrphan(
  oldPath: string,
  encodedDirName: string,
  allProjects: Map<string, ProjectEntry>,
): string | null {
  const leaf = path.basename(oldPath);
  const parent = path.dirname(oldPath);
  const leafLower = leaf.toLowerCase();

  // 1. 同父目录下找同名目录（大小写变化/临时不可用恢复）
  if (fs.existsSync(parent)) {
    try {
      for (const entry of fs.readdirSync(parent, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const candidate = path.join(parent, entry.name);
        if (entry.name.toLowerCase() === leafLower && path.resolve(candidate) !== path.resolve(oldPath)) {
          return candidate;
        }
      }
    } catch { /* permission error */ }
  }

  // 2. 在所有已知正常项目中找同叶子名的
  for (const [projPath] of allProjects) {
    if (path.basename(projPath).toLowerCase() === leafLower && path.resolve(projPath) !== path.resolve(oldPath)) {
      return projPath;
    }
  }

  // 3. 父目录下找"旧名是新名子串"的目录（my-app → my-app-v2 / old-my-app）
  //    只匹配长度 >= 3 的旧名，避免短名误匹配
  if (leaf.length >= 3 && fs.existsSync(parent)) {
    try {
      for (const entry of fs.readdirSync(parent, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const nameLower = entry.name.toLowerCase();
        if (nameLower === leafLower) continue; // 已在步骤1处理
        if (nameLower.includes(leafLower)) {
          return path.join(parent, entry.name);
        }
      }
    } catch { /* permission error */ }
  }

  // 4. 备用：从 session cwd 字段查找
  return findValidCwdFromSessions(encodedDirName);
}

/**
 * 删除整个孤项目目录。
 */
function deleteProjectDir(encodedDirName: string): boolean {
  const projectsDir = getProjectsDir();
  const projPath = path.join(projectsDir, encodedDirName);

  if (!fs.existsSync(projPath)) return true;

  try {
    fs.rmSync(projPath, { recursive: true, force: true });
    return !fs.existsSync(projPath);
  } catch {
    return false;
  }
}

/**
 * 自动迁移孤项目 + 清理完全失效的项目。
 * - 在文件系统中搜索同名/相似名目录尝试自动迁移
 * - 四个策略都找不到有效路径 → 项目彻底消失 → 自动删除
 * - 迁移失败（如目标已存在项目）→ 跳过，保留为孤项目
 * 返回处理统计
 */
export function autoMigrateOrDelete(
  orphanedProjects: Map<string, OrphanedProject>,
  allProjects: Map<string, ProjectEntry>,
): { migrated: number; deleted: number; skipped: number } {
  let migrated = 0;
  let deleted = 0;
  let skipped = 0;

  for (const [encodedName, op] of orphanedProjects) {
    const validPath = findValidPathForOrphan(op.oldPath, encodedName, allProjects);

    if (!validPath || validPath === op.oldPath) {
      // 四个策略都找不到有效路径 → 项目彻底消失 → 删除
      if (deleteProjectDir(encodedName)) {
        deleted++;
      } else {
        skipped++;
      }
      continue;
    }

    const err = migrateProject(encodedName, validPath);
    if (err === null) {
      migrated++;
    } else {
      // 迁移失败（如目标已有项目目录）→ 保留，不删除
      skipped++;
    }
  }

  return { migrated, deleted, skipped };
}
