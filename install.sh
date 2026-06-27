#!/bin/bash
# Claude Code TUI - 自动化安装（Git Bash / macOS / Linux）
# 用法：在项目目录下运行  bash install.sh
# 自带便携版 Node.js，不依赖系统 Node.js 版本

set -e
echo -e "\033[32m=== Claude Code TUI 安装 ===\033[0m"

PROJECT_ROOT="$(pwd -P)"
NODE_DIR="$PROJECT_ROOT/runtime/node"
NODE_EXE="$NODE_DIR/bin/node"
NPM_CLI="$NODE_DIR/bin/npm"
NODE_VERSION="22.14.0"

# 0. 确保有可用的 Node.js
echo -e "\n\033[33m[0/3] 检查 Node.js 运行环境...\033[0m"

if [ ! -f "$NODE_EXE" ]; then
    # 先检查系统 Node.js 是否可用
    USE_SYSTEM_NODE=false
    if SYS_VER=$(node -v 2>/dev/null | sed 's/^v//'); then
        SYS_MAJOR=$(echo "$SYS_VER" | cut -d. -f1)
        if [ "$SYS_MAJOR" -ge 16 ]; then
            echo -e "  系统 Node.js v$SYS_VER ✓，无需下载便携版"
            NODE_EXE="node"
            NPM_CLI="npm"
            USE_SYSTEM_NODE=true
        fi
    fi

    if [ "$USE_SYSTEM_NODE" = false ]; then
        # 检测平台
        case "$(uname -s)" in
            Darwin)
                ARCH=$(uname -m)
                if [ "$ARCH" = "arm64" ]; then
                    NODE_ARCH="darwin-arm64"
                else
                    NODE_ARCH="darwin-x64"
                fi
                ;;
            Linux|*)
                NODE_ARCH="linux-x64"
                ;;
        esac

        NODE_TARBALL="node-v${NODE_VERSION}-${NODE_ARCH}.tar.xz"
        NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_TARBALL}"

        echo -e "\033[33m  系统 Node.js 不满足要求，正在下载便携版 Node.js v${NODE_VERSION}...\033[0m"
        echo -e "    (约 30MB，仅首次安装需要)"

        TMP_DIR=$(mktemp -d)
        if command -v curl >/dev/null 2>&1; then
            curl -fsSL "$NODE_URL" -o "$TMP_DIR/$NODE_TARBALL" || {
                echo -e "\033[31m下载失败，请手动下载 $NODE_URL 并解压到 $NODE_DIR\033[0m"
                echo -e "\033[31m  或自行安装 Node.js 16+：https://nodejs.org\033[0m"
                exit 1
            }
        else
            wget -q "$NODE_URL" -O "$TMP_DIR/$NODE_TARBALL" || {
                echo -e "\033[31m下载失败，请手动下载 $NODE_URL 并解压到 $NODE_DIR\033[0m"
                echo -e "\033[31m  或自行安装 Node.js 16+：https://nodejs.org\033[0m"
                exit 1
            }
        fi

        echo "  正在解压..."
        tar -xf "$TMP_DIR/$NODE_TARBALL" -C "$TMP_DIR"
        rm -f "$TMP_DIR/$NODE_TARBALL"
        EXTRACTED_DIR=$(ls -d "$TMP_DIR"/node-v* 2>/dev/null | head -1)
        rm -rf "$NODE_DIR"
        mkdir -p "$(dirname "$NODE_DIR")"
        mv "$EXTRACTED_DIR" "$NODE_DIR"
        rm -rf "$TMP_DIR"

        echo -e "\033[32m  便携版 Node.js 就绪 ✓\033[0m"
    fi
else
    echo -e "\033[32m  便携版 Node.js 已存在 ✓\033[0m"
fi

# 1. 安装依赖
echo -e "\n\033[33m[1/3] 安装 npm 依赖...\033[0m"
"$NODE_EXE" "$NPM_CLI" install

# 2. 编译
echo -e "\n\033[33m[2/3] 编译 TypeScript...\033[0m"
"$NODE_EXE" "$NPM_CLI" run build

# 3. 设置环境变量
echo -e "\n\033[33m[3/3] 配置环境变量与 shell 函数...\033[0m"

case "$(uname -s)" in
    Darwin)  ENV_FILE="$HOME/.zprofile" ;;
    Linux)   ENV_FILE="$HOME/.profile" ;;
    *)       ENV_FILE="$HOME/.bashrc" ;;
esac

# 写 CLAUDE_TUI_HOME 到配置文件
if grep -q "CLAUDE_TUI_HOME" "$ENV_FILE" 2>/dev/null; then
    sed -i.bak "/CLAUDE_TUI_HOME/d" "$ENV_FILE"
    rm -f "$ENV_FILE.bak"
fi
echo "export CLAUDE_TUI_HOME=\"$PROJECT_ROOT\"" >> "$ENV_FILE"
export CLAUDE_TUI_HOME="$PROJECT_ROOT"
echo "  CLAUDE_TUI_HOME = $PROJECT_ROOT"

# 4. 配置 shell 包装函数
case "$SHELL" in
    */zsh) RC_FILE="$HOME/.zshrc" ;;
    *)     RC_FILE="$HOME/.bashrc" ;;
esac

# 移除旧版函数
if grep -q "function claude\|claude ()" "$RC_FILE" 2>/dev/null; then
    sed -i.bak '/^# Claude Code TUI/,/^}/d' "$RC_FILE"
    sed -i.bak '/^claude ()/,/^}/d' "$RC_FILE"
    rm -f "$RC_FILE.bak"
    echo -e "\033[33m  已移除旧版 claude 函数\033[0m"
fi

cat >> "$RC_FILE" << 'EOF'

# Claude Code TUI — 输入 claude 打开历史管理器，TUI 失效时自动回退
claude () {
    if [ $# -gt 0 ]; then
        command claude "$@";
    elif [ -n "$CLAUDE_TUI_HOME" ] && [ -f "$CLAUDE_TUI_HOME/dist/main.js" ]; then
        # 优先用项目自带的便携版 Node.js，否则用系统 node
        if [ -x "$CLAUDE_TUI_HOME/runtime/node/bin/node" ]; then
            NODE_BIN="$CLAUDE_TUI_HOME/runtime/node/bin/node"
        else
            NODE_BIN="node"
        fi
        "$NODE_BIN" "$CLAUDE_TUI_HOME/dist/main.js" || { echo "TUI 启动失败，回退到原始 Claude..."; command claude; }
    else
        command claude;
    fi
}
EOF
echo -e "\033[32m  已添加 claude 函数到 $RC_FILE\033[0m"

echo -e "\n\033[32m安装完成！执行 source $RC_FILE 或重新打开终端，输入 claude 即可。\033[0m"
echo -e "\033[33m如果之后移动了项目目录，在新目录下重新运行 bash install.sh 即可。\033[0m"
