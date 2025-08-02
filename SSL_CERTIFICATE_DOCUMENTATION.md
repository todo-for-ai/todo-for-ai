# SSL证书管理文档

## 概述

本文档记录了todo4ai.org域名的SSL证书配置和管理过程。

## 当前配置状态

### 证书信息
- **域名**: todo4ai.org, *.todo4ai.org
- **证书颁发者**: Google Trust Services (WE1)
- **证书类型**: Cloudflare管理的自动续期证书
- **有效期**: 2025年8月1日 - 2025年10月30日 (约3个月)
- **剩余天数**: 89天 (截至2025年8月2日)

### 服务配置
- **CDN服务**: Cloudflare
- **SSL模式**: Full SSL (自动续期)
- **HTTPS重定向**: 已启用
- **HSTS**: 已启用 (max-age=0)
- **支持协议**: TLSv1.2, TLSv1.3

## 监控系统

### 自动监控脚本
- **主监控脚本**: `ssl-monitor-simple.sh`
- **功能**: 检查证书有效期、颁发者、Cloudflare状态
- **告警阈值**: 30天
- **日志位置**: `logs/ssl-monitor.log`

### 定时任务
```bash
# 每天上午9点检查SSL证书状态
0 9 * * * cd /Users/cc11001100/github/ai-coding-labs/todo-for-ai && ./ssl-monitor-simple.sh >> logs/ssl-monitor-cron.log 2>&1

# 每周一上午10点生成详细报告
0 10 * * 1 cd /Users/cc11001100/github/ai-coding-labs/todo-for-ai && ./ssl-monitor-simple.sh -r >> logs/ssl-monitor-cron.log 2>&1
```

### 监控内容
1. **证书有效期检查**
   - 自动计算剩余天数
   - 30天内过期时发出警告
   - 过期时发出严重告警

2. **证书颁发者验证**
   - 确认证书由可信CA颁发
   - 检测CDN管理的证书类型

3. **Cloudflare服务状态**
   - 验证CDN服务正常运行
   - 检查响应头中的Cloudflare标识

## 自动续期机制

### Cloudflare自动续期
- **续期方式**: Cloudflare自动管理
- **续期时间**: 证书到期前自动续期
- **无需手动干预**: 完全自动化

### 监控验证
- 定期检查证书有效期
- 确保自动续期正常工作
- 在续期失败时及时告警

## 文件结构

```
todo-for-ai/
├── ssl-monitor-simple.sh          # 主监控脚本
├── ssl-monitoring-crontab.txt     # cron任务配置
├── SSL_CERTIFICATE_DOCUMENTATION.md # 本文档
├── logs/
│   ├── ssl-monitor.log            # 监控日志
│   ├── ssl-monitor-cron.log       # cron执行日志
│   └── ssl-monitor-report-*.txt   # 每日报告
└── backup/
    ├── nginx_config.txt           # Nginx配置备份
    ├── nginx_config_final.txt     # 最终Nginx配置
    └── check-ssl-expiry.sh        # 原SSL检查脚本
```

## 使用说明

### 手动检查SSL证书
```bash
./ssl-monitor-simple.sh
```

### 检查指定域名
```bash
./ssl-monitor-simple.sh -d example.com
```

### 设置告警阈值
```bash
./ssl-monitor-simple.sh -w 7  # 7天告警
```

### 生成报告
```bash
./ssl-monitor-simple.sh -r
```

### 查看监控日志
```bash
tail -f logs/ssl-monitor.log
```

### 查看cron任务
```bash
crontab -l | grep ssl-monitor
```

## 故障排除

### 常见问题

1. **证书即将过期**
   - 检查Cloudflare控制台
   - 确认自动续期设置
   - 联系Cloudflare支持

2. **监控脚本失败**
   - 检查脚本权限: `chmod +x ssl-monitor-simple.sh`
   - 检查网络连接
   - 查看错误日志

3. **cron任务不执行**
   - 检查cron服务: `sudo service cron status`
   - 验证cron任务: `crontab -l`
   - 检查脚本路径

### 应急处理

如果Cloudflare自动续期失败：

1. **立即检查**
   ```bash
   ./ssl-monitor-simple.sh
   ```

2. **联系Cloudflare支持**
   - 登录Cloudflare控制台
   - 检查SSL/TLS设置
   - 提交支持票据

3. **备用方案**
   - 考虑使用Let's Encrypt
   - 参考项目中的nginx配置文件
   - 使用check-ssl-expiry.sh脚本

## 安全建议

1. **定期检查**
   - 每月手动验证一次
   - 关注监控告警
   - 检查日志文件

2. **备份配置**
   - 定期备份Cloudflare设置
   - 保存重要配置文件
   - 记录DNS配置

3. **监控优化**
   - 根据需要调整告警阈值
   - 添加邮件通知
   - 集成到监控系统

## 更新记录

- **2025-08-02**: 初始配置完成
  - 创建SSL监控系统
  - 设置自动监控任务
  - 验证Cloudflare自动续期
  - 文档化配置过程

## 联系信息

- **项目**: Todo for AI
- **域名**: todo4ai.org
- **SSL管理**: Cloudflare自动续期
- **监控**: 本地脚本 + cron任务
