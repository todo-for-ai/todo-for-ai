#!/bin/bash

# SSL监控系统安装脚本
# 为Cloudflare管理的SSL证书设置自动监控和告警

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
INSTALL_DIR="/opt/ssl-monitoring"
LOG_DIR="/var/log"
CRON_USER="root"

echo -e "${BLUE}🔧 开始安装SSL监控系统...${NC}"

# 检查权限
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ 请使用root权限运行此脚本${NC}"
    exit 1
fi

# 创建安装目录
echo -e "${YELLOW}📁 创建安装目录...${NC}"
mkdir -p "$INSTALL_DIR"
mkdir -p "$LOG_DIR"

# 复制脚本文件
echo -e "${YELLOW}📋 复制监控脚本...${NC}"
cp cloudflare-ssl-monitor.sh "$INSTALL_DIR/"
cp cloudflare-ssl-cron.sh "$INSTALL_DIR/"

# 设置执行权限
chmod +x "$INSTALL_DIR/cloudflare-ssl-monitor.sh"
chmod +x "$INSTALL_DIR/cloudflare-ssl-cron.sh"

# 创建配置文件
echo -e "${YELLOW}⚙️  创建配置文件...${NC}"
cat > "$INSTALL_DIR/ssl-monitor.conf" << EOF
# SSL监控配置文件
DOMAIN="todo4ai.org"
DAYS_WARNING=30
LOG_FILE="$LOG_DIR/cloudflare-ssl-monitor.log"
EMAIL_ALERT="admin@todo4ai.org"
ENABLE_EMAIL_ALERTS=false
ENABLE_SLACK_ALERTS=false
SLACK_WEBHOOK_URL=""
EOF

# 设置cron任务
echo -e "${YELLOW}⏰ 设置定时任务...${NC}"

# 检查是否已存在cron任务
if crontab -l 2>/dev/null | grep -q "cloudflare-ssl-cron.sh"; then
    echo -e "${YELLOW}⚠️  检测到已存在的SSL监控cron任务，将更新...${NC}"
    # 移除旧的任务
    crontab -l 2>/dev/null | grep -v "cloudflare-ssl-cron.sh" | crontab -
fi

# 添加新的cron任务
(crontab -l 2>/dev/null; echo "# SSL证书监控 - 每天上午9点检查") | crontab -
(crontab -l 2>/dev/null; echo "0 9 * * * $INSTALL_DIR/cloudflare-ssl-cron.sh") | crontab -

# 添加每周详细报告
(crontab -l 2>/dev/null; echo "# SSL证书监控 - 每周一上午10点生成详细报告") | crontab -
(crontab -l 2>/dev/null; echo "0 10 * * 1 $INSTALL_DIR/cloudflare-ssl-monitor.sh -r") | crontab -

echo -e "${GREEN}✅ Cron任务设置完成${NC}"

# 创建systemd服务（可选）
echo -e "${YELLOW}🔧 创建systemd服务...${NC}"
cat > /etc/systemd/system/ssl-monitor.service << EOF
[Unit]
Description=SSL Certificate Monitor
After=network.target

[Service]
Type=oneshot
ExecStart=$INSTALL_DIR/cloudflare-ssl-monitor.sh
User=root
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# 创建systemd定时器
cat > /etc/systemd/system/ssl-monitor.timer << EOF
[Unit]
Description=Run SSL Certificate Monitor daily
Requires=ssl-monitor.service

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOF

# 启用systemd服务
systemctl daemon-reload
systemctl enable ssl-monitor.timer
systemctl start ssl-monitor.timer

echo -e "${GREEN}✅ Systemd服务设置完成${NC}"

# 创建日志轮转配置
echo -e "${YELLOW}📝 设置日志轮转...${NC}"
cat > /etc/logrotate.d/ssl-monitoring << EOF
$LOG_DIR/cloudflare-ssl-monitor.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}

$LOG_DIR/cloudflare-ssl-cron.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF

# 测试安装
echo -e "${YELLOW}🧪 测试安装...${NC}"
if "$INSTALL_DIR/cloudflare-ssl-monitor.sh" -q; then
    echo -e "${GREEN}✅ SSL监控脚本测试成功${NC}"
else
    echo -e "${RED}❌ SSL监控脚本测试失败${NC}"
    exit 1
fi

# 显示安装结果
echo -e "${GREEN}🎉 SSL监控系统安装完成！${NC}"
echo ""
echo -e "${BLUE}📋 安装信息:${NC}"
echo "  安装目录: $INSTALL_DIR"
echo "  日志目录: $LOG_DIR"
echo "  配置文件: $INSTALL_DIR/ssl-monitor.conf"
echo ""
echo -e "${BLUE}⏰ 定时任务:${NC}"
echo "  每日检查: 上午9点"
echo "  周报告: 每周一上午10点"
echo ""
echo -e "${BLUE}🔧 管理命令:${NC}"
echo "  手动检查: $INSTALL_DIR/cloudflare-ssl-monitor.sh"
echo "  查看日志: tail -f $LOG_DIR/cloudflare-ssl-monitor.log"
echo "  查看cron: crontab -l"
echo "  systemd状态: systemctl status ssl-monitor.timer"
echo ""
echo -e "${YELLOW}💡 提示:${NC}"
echo "  - 可以编辑 $INSTALL_DIR/ssl-monitor.conf 来修改配置"
echo "  - 日志文件会自动轮转，保留30天"
echo "  - 如需邮件告警，请配置邮件服务并修改配置文件"
echo ""

# 显示当前证书状态
echo -e "${BLUE}📊 当前SSL证书状态:${NC}"
"$INSTALL_DIR/cloudflare-ssl-monitor.sh"
