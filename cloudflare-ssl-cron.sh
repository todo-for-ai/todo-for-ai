#!/bin/bash

# Cloudflare SSL证书自动监控和续期检查脚本
# 用于定期检查SSL证书状态并确保Cloudflare自动续期正常工作

# 配置文件路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITOR_SCRIPT="$SCRIPT_DIR/cloudflare-ssl-monitor.sh"
CRON_LOG="/var/log/cloudflare-ssl-cron.log"

# 确保监控脚本存在且可执行
if [ ! -f "$MONITOR_SCRIPT" ]; then
    echo "错误: 监控脚本不存在: $MONITOR_SCRIPT"
    exit 1
fi

if [ ! -x "$MONITOR_SCRIPT" ]; then
    chmod +x "$MONITOR_SCRIPT"
fi

# 执行SSL证书检查
echo "$(date): 开始执行SSL证书检查" >> "$CRON_LOG"
"$MONITOR_SCRIPT" >> "$CRON_LOG" 2>&1
exit_code=$?

# 记录执行结果
if [ $exit_code -eq 0 ]; then
    echo "$(date): SSL证书检查完成，状态正常" >> "$CRON_LOG"
else
    echo "$(date): SSL证书检查完成，发现问题 (退出码: $exit_code)" >> "$CRON_LOG"
fi

# 清理旧日志（保留30天）
find "$(dirname "$CRON_LOG")" -name "*.log" -mtime +30 -delete 2>/dev/null

exit $exit_code
