#!/bin/bash

# SSL监控定时任务设置脚本
# 为Cloudflare管理的SSL证书设置自动监控

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITOR_SCRIPT="$SCRIPT_DIR/ssl-monitor-simple.sh"
PROJECT_DIR="$SCRIPT_DIR"

echo -e "${BLUE}🔧 设置SSL证书监控定时任务...${NC}"

# 检查监控脚本是否存在
if [ ! -f "$MONITOR_SCRIPT" ]; then
    echo -e "${RED}❌ 监控脚本不存在: $MONITOR_SCRIPT${NC}"
    exit 1
fi

# 确保脚本可执行
chmod +x "$MONITOR_SCRIPT"

# 创建cron任务脚本
echo -e "${YELLOW}📝 创建cron任务脚本...${NC}"
cat > "$PROJECT_DIR/ssl-monitor-cron.sh" << 'EOF'
#!/bin/bash

# SSL证书监控cron任务脚本
# 此脚本由cron定时执行

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITOR_SCRIPT="$SCRIPT_DIR/ssl-monitor-simple.sh"
LOG_DIR="$SCRIPT_DIR/logs"
CRON_LOG="$LOG_DIR/ssl-monitor-cron.log"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 记录开始时间
echo "$(date): 开始执行SSL证书监控检查" >> "$CRON_LOG"

# 切换到项目目录
cd "$SCRIPT_DIR"

# 执行SSL证书检查
if [ -f "$MONITOR_SCRIPT" ]; then
    "$MONITOR_SCRIPT" >> "$CRON_LOG" 2>&1
    exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo "$(date): SSL证书检查完成，状态正常" >> "$CRON_LOG"
    elif [ $exit_code -eq 1 ]; then
        echo "$(date): SSL证书检查完成，发现警告 (即将过期)" >> "$CRON_LOG"
    else
        echo "$(date): SSL证书检查完成，发现问题 (退出码: $exit_code)" >> "$CRON_LOG"
    fi
else
    echo "$(date): 错误: 监控脚本不存在: $MONITOR_SCRIPT" >> "$CRON_LOG"
    exit_code=1
fi

# 清理旧日志（保留30天）
find "$LOG_DIR" -name "*.log" -mtime +30 -delete 2>/dev/null || true

echo "$(date): SSL证书监控任务完成" >> "$CRON_LOG"
exit $exit_code
EOF

# 设置cron脚本权限
chmod +x "$PROJECT_DIR/ssl-monitor-cron.sh"

# 检查当前用户的cron任务
echo -e "${YELLOW}📋 检查现有的cron任务...${NC}"
current_cron=$(crontab -l 2>/dev/null || echo "")

# 检查是否已存在SSL监控任务
if echo "$current_cron" | grep -q "ssl-monitor"; then
    echo -e "${YELLOW}⚠️  检测到已存在的SSL监控cron任务${NC}"
    echo "现有任务:"
    echo "$current_cron" | grep "ssl-monitor"
    echo ""
    read -p "是否要更新现有任务? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}ℹ️  保持现有cron任务不变${NC}"
        exit 0
    fi
    
    # 移除旧的SSL监控任务
    echo -e "${YELLOW}🗑️  移除旧的SSL监控任务...${NC}"
    new_cron=$(echo "$current_cron" | grep -v "ssl-monitor" || true)
    echo "$new_cron" | crontab -
fi

# 添加新的cron任务
echo -e "${YELLOW}➕ 添加新的SSL监控cron任务...${NC}"

# 获取当前cron任务
current_cron=$(crontab -l 2>/dev/null || echo "")

# 添加SSL监控任务
{
    echo "$current_cron"
    echo ""
    echo "# SSL证书监控任务 - 每天上午9点检查"
    echo "0 9 * * * cd $PROJECT_DIR && ./ssl-monitor-cron.sh"
    echo ""
    echo "# SSL证书监控任务 - 每周一上午10点生成详细报告"
    echo "0 10 * * 1 cd $PROJECT_DIR && ./ssl-monitor-simple.sh -r"
} | crontab -

echo -e "${GREEN}✅ SSL监控cron任务设置完成${NC}"

# 显示设置的任务
echo -e "${BLUE}📋 已设置的SSL监控任务:${NC}"
crontab -l | grep -A2 -B2 "ssl-monitor" || echo "未找到SSL监控任务"

# 创建手动测试脚本
echo -e "${YELLOW}🧪 创建手动测试脚本...${NC}"
cat > "$PROJECT_DIR/test-ssl-monitoring.sh" << 'EOF'
#!/bin/bash

# SSL监控测试脚本
# 用于手动测试SSL监控功能

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🧪 测试SSL监控功能..."
echo ""

echo "1. 测试SSL监控脚本:"
if [ -f "$SCRIPT_DIR/ssl-monitor-simple.sh" ]; then
    "$SCRIPT_DIR/ssl-monitor-simple.sh"
else
    echo "❌ SSL监控脚本不存在"
fi

echo ""
echo "2. 测试cron任务脚本:"
if [ -f "$SCRIPT_DIR/ssl-monitor-cron.sh" ]; then
    echo "✅ 执行cron任务脚本..."
    "$SCRIPT_DIR/ssl-monitor-cron.sh"
else
    echo "❌ cron任务脚本不存在"
fi

echo ""
echo "3. 检查日志文件:"
if [ -f "$SCRIPT_DIR/logs/ssl-monitor.log" ]; then
    echo "✅ 最近的监控日志:"
    tail -5 "$SCRIPT_DIR/logs/ssl-monitor.log"
else
    echo "❌ 监控日志文件不存在"
fi

echo ""
echo "4. 检查cron任务:"
echo "当前用户的SSL监控cron任务:"
crontab -l 2>/dev/null | grep "ssl-monitor" || echo "未找到SSL监控cron任务"

echo ""
echo "🎉 SSL监控测试完成"
EOF

chmod +x "$PROJECT_DIR/test-ssl-monitoring.sh"

# 创建README文件
echo -e "${YELLOW}📖 创建使用说明...${NC}"
cat > "$PROJECT_DIR/SSL_MONITORING_README.md" << 'EOF'
# SSL证书监控系统

## 概述

这是一个专为Cloudflare管理的SSL证书设计的监控系统，用于自动检查SSL证书状态并在证书即将过期时发出告警。

## 文件说明

- `ssl-monitor-simple.sh` - 主要的SSL监控脚本
- `ssl-monitor-cron.sh` - cron任务执行脚本
- `test-ssl-monitoring.sh` - 测试脚本
- `setup-ssl-monitoring-cron.sh` - 安装脚本
- `logs/` - 日志目录

## 使用方法

### 手动检查SSL证书
```bash
./ssl-monitor-simple.sh
```

### 检查指定域名
```bash
./ssl-monitor-simple.sh -d example.com
```

### 设置告警阈值（天数）
```bash
./ssl-monitor-simple.sh -w 7
```

### 只生成报告
```bash
./ssl-monitor-simple.sh -r
```

### 测试监控系统
```bash
./test-ssl-monitoring.sh
```

## 自动监控

系统已设置以下定时任务：
- 每天上午9点：执行SSL证书检查
- 每周一上午10点：生成详细报告

查看cron任务：
```bash
crontab -l | grep ssl-monitor
```

## 日志文件

- `logs/ssl-monitor.log` - 主要监控日志
- `logs/ssl-monitor-cron.log` - cron任务执行日志
- `logs/ssl-monitor-report-YYYYMMDD.txt` - 每日报告

## 监控内容

1. **SSL证书有效期检查**
   - 检查证书过期时间
   - 计算剩余有效天数
   - 在证书即将过期时发出告警

2. **证书颁发者验证**
   - 确认证书由可信的CA颁发
   - 检测CDN管理的证书

3. **Cloudflare服务状态**
   - 验证网站是否使用Cloudflare
   - 检查CDN服务正常运行

## 告警机制

- 🟢 正常：证书有效期超过30天
- 🟡 警告：证书有效期少于30天
- 🔴 严重：证书已过期

## 故障排除

### 权限问题
```bash
chmod +x *.sh
```

### 日志目录问题
```bash
mkdir -p logs
```

### cron任务不执行
```bash
# 检查cron服务状态
sudo service cron status

# 查看cron日志
tail -f /var/log/cron
```

## 自定义配置

编辑脚本顶部的配置变量：
- `DOMAIN` - 要监控的域名
- `DAYS_WARNING` - 告警天数阈值
- `LOG_DIR` - 日志目录路径

## 注意事项

1. 此系统专为Cloudflare管理的SSL证书设计
2. 证书续期由Cloudflare自动处理，无需手动干预
3. 监控系统主要用于确保自动续期正常工作
4. 建议定期检查监控日志确保系统正常运行
EOF

echo ""
echo -e "${GREEN}🎉 SSL监控系统设置完成！${NC}"
echo ""
echo -e "${BLUE}📋 设置信息:${NC}"
echo "  项目目录: $PROJECT_DIR"
echo "  监控脚本: $MONITOR_SCRIPT"
echo "  日志目录: $PROJECT_DIR/logs"
echo ""
echo -e "${BLUE}⏰ 定时任务:${NC}"
echo "  每日检查: 上午9点"
echo "  周报告: 每周一上午10点"
echo ""
echo -e "${BLUE}🔧 管理命令:${NC}"
echo "  手动检查: ./ssl-monitor-simple.sh"
echo "  测试系统: ./test-ssl-monitoring.sh"
echo "  查看日志: tail -f logs/ssl-monitor.log"
echo "  查看cron: crontab -l | grep ssl-monitor"
echo ""
echo -e "${YELLOW}💡 提示:${NC}"
echo "  - 查看 SSL_MONITORING_README.md 了解详细使用说明"
echo "  - 日志文件会自动清理，保留30天"
echo "  - 证书由Cloudflare自动续期，监控系统用于确保续期正常"
echo ""

# 执行一次测试
echo -e "${BLUE}🧪 执行初始测试...${NC}"
"$PROJECT_DIR/test-ssl-monitoring.sh"
