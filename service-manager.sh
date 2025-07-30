#!/bin/bash

# Todo for AI - macOS Service 管理脚本
# 用于安装、卸载、启动、停止 Todo for AI 服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置常量
SERVICE_NAME="com.todoforai.service"
PLIST_FILE="com.todoforai.service.plist"
LAUNCHD_DIR="/Library/LaunchDaemons"
INSTALL_DIR="/usr/local/share/todoforai"
BIN_DIR="/usr/local/bin"
LOG_DIR="/usr/local/var/log/todoforai"
SERVICE_SCRIPT="todoforai-service.sh"

# 当前脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 显示帮助信息
show_help() {
    echo -e "${BLUE}Todo for AI - macOS Service 管理工具${NC}"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  install     安装服务"
    echo "  uninstall   卸载服务"
    echo "  start       启动服务"
    echo "  stop        停止服务"
    echo "  restart     重启服务"
    echo "  status      查看服务状态"
    echo "  logs        查看服务日志"
    echo "  help        显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 install    # 安装服务"
    echo "  $0 start      # 启动服务"
    echo "  $0 status     # 查看状态"
    echo "  $0 logs       # 查看日志"
}

# 检查权限
check_permissions() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}❌ 此操作需要管理员权限，请使用 sudo 运行${NC}"
        exit 1
    fi
}

# 检查服务是否已安装
is_service_installed() {
    [ -f "$LAUNCHD_DIR/$PLIST_FILE" ]
}

# 检查服务是否正在运行
is_service_running() {
    launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null
}

# 安装服务
install_service() {
    echo -e "${CYAN}🔧 安装 Todo for AI 服务...${NC}"
    
    # 检查是否已安装
    if is_service_installed; then
        echo -e "${YELLOW}⚠️  服务已安装，请先卸载后再安装${NC}"
        return 1
    fi
    
    # 创建必要的目录
    echo "创建目录结构..."
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$BIN_DIR"
    
    # 复制项目文件
    echo "复制项目文件..."
    cp -r "$SCRIPT_DIR"/* "$INSTALL_DIR/"
    
    # 复制 plist 文件
    echo "安装服务配置..."
    cp "$SCRIPT_DIR/$PLIST_FILE" "$LAUNCHD_DIR/"
    
    # 创建服务启动脚本
    create_service_script
    
    # 设置权限
    echo "设置文件权限..."
    chown -R root:wheel "$INSTALL_DIR"
    chown root:wheel "$LAUNCHD_DIR/$PLIST_FILE"
    chown root:wheel "$BIN_DIR/$SERVICE_SCRIPT"
    chmod 644 "$LAUNCHD_DIR/$PLIST_FILE"
    chmod 755 "$BIN_DIR/$SERVICE_SCRIPT"
    chmod 755 "$INSTALL_DIR/start.sh"
    
    # 加载服务
    echo "加载服务..."
    launchctl load "$LAUNCHD_DIR/$PLIST_FILE"
    
    echo -e "${GREEN}✅ 服务安装成功！${NC}"
    echo -e "${BLUE}服务将在下次重启时自动启动${NC}"
    echo -e "${BLUE}或者现在手动启动: sudo $0 start${NC}"
}

# 创建服务启动脚本
create_service_script() {
    cat > "$BIN_DIR/$SERVICE_SCRIPT" << 'EOF'
#!/bin/bash

# Todo for AI Service 启动脚本
# 此脚本由 launchd 调用

set -e

# 配置
INSTALL_DIR="/usr/local/share/todoforai"
LOG_DIR="/usr/local/var/log/todoforai"

# 确保日志目录存在
mkdir -p "$LOG_DIR"

# 切换到项目目录
cd "$INSTALL_DIR"

# 设置环境变量
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export TODOFORAI_SERVICE_MODE="daemon"

# 记录启动时间
echo "$(date): Todo for AI Service 启动中..." >> "$LOG_DIR/service.log"

# 启动服务
exec ./start.sh >> "$LOG_DIR/service.log" 2>> "$LOG_DIR/service-error.log"
EOF
}

# 卸载服务
uninstall_service() {
    echo -e "${CYAN}🗑️  卸载 Todo for AI 服务...${NC}"
    
    # 检查是否已安装
    if ! is_service_installed; then
        echo -e "${YELLOW}⚠️  服务未安装${NC}"
        return 1
    fi
    
    # 停止服务
    if is_service_running; then
        echo "停止服务..."
        launchctl unload "$LAUNCHD_DIR/$PLIST_FILE" 2>/dev/null || true
    fi
    
    # 删除文件
    echo "删除服务文件..."
    rm -f "$LAUNCHD_DIR/$PLIST_FILE"
    rm -f "$BIN_DIR/$SERVICE_SCRIPT"
    
    # 询问是否删除数据目录
    echo -e "${YELLOW}是否删除服务数据目录? ($INSTALL_DIR) [y/N]${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        rm -rf "$INSTALL_DIR"
        echo "数据目录已删除"
    fi
    
    # 询问是否删除日志目录
    echo -e "${YELLOW}是否删除日志目录? ($LOG_DIR) [y/N]${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        rm -rf "$LOG_DIR"
        echo "日志目录已删除"
    fi
    
    echo -e "${GREEN}✅ 服务卸载成功！${NC}"
}

# 启动服务
start_service() {
    echo -e "${CYAN}▶️  启动 Todo for AI 服务...${NC}"
    
    if ! is_service_installed; then
        echo -e "${RED}❌ 服务未安装，请先安装服务${NC}"
        return 1
    fi
    
    if is_service_running; then
        echo -e "${YELLOW}⚠️  服务已在运行${NC}"
        return 0
    fi
    
    launchctl load "$LAUNCHD_DIR/$PLIST_FILE"
    
    # 等待服务启动
    echo "等待服务启动..."
    for i in {1..10}; do
        if is_service_running; then
            echo -e "${GREEN}✅ 服务启动成功${NC}"
            return 0
        fi
        sleep 1
    done
    
    echo -e "${RED}❌ 服务启动失败，请检查日志${NC}"
    return 1
}

# 停止服务
stop_service() {
    echo -e "${CYAN}⏹️  停止 Todo for AI 服务...${NC}"
    
    if ! is_service_installed; then
        echo -e "${RED}❌ 服务未安装${NC}"
        return 1
    fi
    
    if ! is_service_running; then
        echo -e "${YELLOW}⚠️  服务未运行${NC}"
        return 0
    fi
    
    launchctl unload "$LAUNCHD_DIR/$PLIST_FILE"
    
    # 等待服务停止
    echo "等待服务停止..."
    for i in {1..10}; do
        if ! is_service_running; then
            echo -e "${GREEN}✅ 服务停止成功${NC}"
            return 0
        fi
        sleep 1
    done
    
    echo -e "${RED}❌ 服务停止失败${NC}"
    return 1
}

# 重启服务
restart_service() {
    echo -e "${CYAN}🔄 重启 Todo for AI 服务...${NC}"
    stop_service
    sleep 2
    start_service
}

# 查看服务状态
show_status() {
    echo -e "${BLUE}📊 Todo for AI 服务状态${NC}"
    echo "=================================="
    
    if is_service_installed; then
        echo -e "${GREEN}✅ 服务已安装${NC}"
        echo "配置文件: $LAUNCHD_DIR/$PLIST_FILE"
        echo "安装目录: $INSTALL_DIR"
        echo "日志目录: $LOG_DIR"
    else
        echo -e "${RED}❌ 服务未安装${NC}"
        return 0
    fi
    
    if is_service_running; then
        echo -e "${GREEN}✅ 服务正在运行${NC}"
        
        # 显示进程信息
        echo ""
        echo "进程信息:"
        launchctl list | grep "$SERVICE_NAME" || true
        
        # 检查端口
        echo ""
        echo "端口状态:"
        lsof -i :50110 2>/dev/null | head -5 || echo "后端端口 50110 未监听"
        lsof -i :50111 2>/dev/null | head -5 || echo "前端端口 50111 未监听"
        
    else
        echo -e "${RED}❌ 服务未运行${NC}"
    fi
    
    echo "=================================="
}

# 查看日志
show_logs() {
    echo -e "${BLUE}📋 Todo for AI 服务日志${NC}"
    
    if [ ! -d "$LOG_DIR" ]; then
        echo -e "${RED}❌ 日志目录不存在${NC}"
        return 1
    fi
    
    echo "日志文件:"
    ls -la "$LOG_DIR/" 2>/dev/null || echo "无日志文件"
    
    echo ""
    echo "最近的服务日志:"
    echo "=================================="
    tail -20 "$LOG_DIR/service.log" 2>/dev/null || echo "无服务日志"
    
    echo ""
    echo "最近的错误日志:"
    echo "=================================="
    tail -20 "$LOG_DIR/service-error.log" 2>/dev/null || echo "无错误日志"
}

# 主函数
main() {
    case "${1:-help}" in
        install)
            check_permissions
            install_service
            ;;
        uninstall)
            check_permissions
            uninstall_service
            ;;
        start)
            check_permissions
            start_service
            ;;
        stop)
            check_permissions
            stop_service
            ;;
        restart)
            check_permissions
            restart_service
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}❌ 未知命令: $1${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"
