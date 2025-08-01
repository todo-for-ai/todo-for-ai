#!/bin/bash

# GitHub Actions 部署设置脚本
# 此脚本帮助设置GitHub Actions所需的SSH密钥和Secrets

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 生成SSH密钥
generate_ssh_key() {
    log_info "生成SSH密钥对..."
    
    # 创建临时目录
    TEMP_DIR=$(mktemp -d)
    SSH_KEY_PATH="$TEMP_DIR/github_actions_key"
    
    # 生成SSH密钥
    ssh-keygen -t ed25519 -f "$SSH_KEY_PATH" -N "" -C "github-actions@$(date +%Y%m%d)"
    
    log_success "SSH密钥已生成"
    
    echo "=================================="
    echo "私钥内容 (用于GitHub Secrets SSH_PRIVATE_KEY):"
    echo "=================================="
    cat "$SSH_KEY_PATH"
    echo ""
    echo "=================================="
    echo "公钥内容 (需要添加到VPS的 ~/.ssh/authorized_keys):"
    echo "=================================="
    cat "$SSH_KEY_PATH.pub"
    echo ""
    
    # 保存到当前目录
    cp "$SSH_KEY_PATH" "./github_actions_private_key"
    cp "$SSH_KEY_PATH.pub" "./github_actions_public_key.pub"
    
    log_warning "密钥已保存到当前目录，请妥善保管私钥文件"
    log_warning "设置完成后请删除本地的私钥文件: rm ./github_actions_private_key"
    
    # 清理临时目录
    rm -rf "$TEMP_DIR"
}

# 显示VPS配置说明
show_vps_setup() {
    log_info "VPS配置步骤："
    echo "=================================="
    echo "1. 登录到你的VPS (107.175.69.178):"
    echo "   ssh root@107.175.69.178"
    echo ""
    echo "2. 创建.ssh目录并设置权限:"
    echo "   mkdir -p ~/.ssh"
    echo "   chmod 700 ~/.ssh"
    echo ""
    echo "3. 将公钥添加到authorized_keys:"
    echo "   echo '$(cat ./github_actions_public_key.pub)' >> ~/.ssh/authorized_keys"
    echo "   chmod 600 ~/.ssh/authorized_keys"
    echo ""
    echo "4. 安装Docker和Docker Compose:"
    echo "   # 安装Docker"
    echo "   curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "   sh get-docker.sh"
    echo "   systemctl enable docker"
    echo "   systemctl start docker"
    echo ""
    echo "   # 安装Docker Compose"
    echo "   curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
    echo "   chmod +x /usr/local/bin/docker-compose"
    echo ""
    echo "5. 创建部署目录:"
    echo "   mkdir -p /opt/todo-for-ai"
    echo "   chown root:root /opt/todo-for-ai"
    echo ""
    echo "6. 配置防火墙 (如果使用ufw):"
    echo "   ufw allow 22/tcp"
    echo "   ufw allow 80/tcp"
    echo "   ufw allow 443/tcp"
    echo "   ufw --force enable"
    echo "=================================="
}

# 显示GitHub Secrets配置
show_github_secrets() {
    log_info "GitHub Secrets 配置："
    echo "=================================="
    echo "在GitHub仓库的 Settings > Secrets and variables > Actions 中添加以下Secrets:"
    echo ""
    echo "必需的Secrets:"
    echo "- SSH_PRIVATE_KEY: (使用上面生成的私钥内容)"
    echo "- VPS_HOST: 107.175.69.178"
    echo "- VPS_USER: root"
    echo "- DOMAIN: 你的域名 (例如: example.com)"
    echo ""
    echo "数据库配置:"
    echo "- MYSQL_ROOT_PASSWORD: 强密码"
    echo "- MYSQL_USER: todouser"
    echo "- MYSQL_PASSWORD: 强密码"
    echo ""
    echo "应用配置:"
    echo "- SECRET_KEY: $(openssl rand -base64 32)"
    echo "- JWT_SECRET_KEY: $(openssl rand -base64 32)"
    echo ""
    echo "Auth0配置 (如果使用):"
    echo "- AUTH0_DOMAIN: 你的Auth0域名"
    echo "- AUTH0_CLIENT_ID: 你的Auth0客户端ID"
    echo "- AUTH0_CLIENT_SECRET: 你的Auth0客户端密钥"
    echo "=================================="
}

# 测试SSH连接
test_ssh_connection() {
    log_info "测试SSH连接..."
    
    if [ ! -f "./github_actions_private_key" ]; then
        log_error "私钥文件不存在，请先运行密钥生成"
        return 1
    fi
    
    chmod 600 ./github_actions_private_key
    
    echo "测试SSH连接到VPS..."
    if ssh -i ./github_actions_private_key -o StrictHostKeyChecking=no root@107.175.69.178 "echo 'SSH连接成功!'; docker --version; docker-compose --version"; then
        log_success "SSH连接测试成功！"
        log_success "Docker和Docker Compose已安装"
    else
        log_error "SSH连接失败，请检查配置"
        return 1
    fi
}

# 主菜单
show_menu() {
    echo "=================================="
    echo "GitHub Actions 部署设置向导"
    echo "=================================="
    echo "1. 生成SSH密钥"
    echo "2. 显示VPS配置说明"
    echo "3. 显示GitHub Secrets配置"
    echo "4. 测试SSH连接"
    echo "5. 全部执行 (推荐)"
    echo "0. 退出"
    echo "=================================="
}

# 主函数
main() {
    while true; do
        show_menu
        read -p "请选择操作 [0-5]: " choice
        
        case $choice in
            1)
                generate_ssh_key
                ;;
            2)
                show_vps_setup
                ;;
            3)
                show_github_secrets
                ;;
            4)
                test_ssh_connection
                ;;
            5)
                generate_ssh_key
                echo ""
                show_vps_setup
                echo ""
                show_github_secrets
                echo ""
                log_info "请按照上述说明配置VPS和GitHub Secrets"
                log_info "配置完成后可以选择选项4测试SSH连接"
                ;;
            0)
                log_info "退出设置向导"
                break
                ;;
            *)
                log_error "无效选择，请重新输入"
                ;;
        esac
        
        echo ""
        read -p "按Enter键继续..."
        echo ""
    done
}

# 运行主函数
main "$@"
