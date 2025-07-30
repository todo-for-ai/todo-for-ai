# Todo for AI - macOS Service 安装和使用指南

## 概述

Todo for AI 现在支持作为 macOS 系统级服务运行，可以在开机时自动启动，无需手动干预。本指南将详细介绍如何安装、配置和管理 Todo for AI 服务。

## 系统要求

- macOS 10.10 或更高版本
- 管理员权限（sudo 访问）
- Node.js (推荐通过 Homebrew 安装)
- Python 3.8 或更高版本
- MySQL 数据库

## 安装前准备

### 1. 确保依赖已安装

```bash
# 检查 Node.js
node --version

# 检查 Python
python3 --version

# 检查 MySQL
mysql --version
```

### 2. 确保项目正常运行

在安装服务之前，建议先使用常规方式启动项目，确保一切正常：

```bash
./start.sh
```

## 服务安装

### 1. 安装系统级服务

```bash
sudo ./service-manager.sh install
```

安装过程将：
- 创建必要的系统目录
- 复制项目文件到 `/usr/local/share/todoforai`
- 安装 LaunchDaemon 配置文件
- 设置正确的文件权限
- 自动加载服务

### 2. 验证安装

```bash
sudo ./service-manager.sh status
```

成功安装后应该看到：
```
✅ 服务已安装
✅ 服务正在运行
```

## 服务管理

### 基本命令

```bash
# 查看帮助
./service-manager.sh help

# 查看服务状态
sudo ./service-manager.sh status

# 启动服务
sudo ./service-manager.sh start

# 停止服务
sudo ./service-manager.sh stop

# 重启服务
sudo ./service-manager.sh restart

# 查看日志
sudo ./service-manager.sh logs

# 卸载服务
sudo ./service-manager.sh uninstall
```

### 服务状态说明

- **已安装**: 服务配置文件已安装到系统
- **正在运行**: 服务进程正在运行
- **端口监听**: 检查服务是否正在监听指定端口

## 文件位置

### 系统文件

- **LaunchDaemon 配置**: `/Library/LaunchDaemons/com.todoforai.service.plist`
- **服务脚本**: `/usr/local/bin/todoforai-service.sh`
- **项目文件**: `/usr/local/share/todoforai/`

### 日志文件

- **服务日志**: `/usr/local/var/log/todoforai/service.log`
- **错误日志**: `/usr/local/var/log/todoforai/service-error.log`

## 配置说明

### 端口配置

默认端口：
- **后端 API**: 50110
- **前端界面**: 50111

### 环境变量

服务运行时的关键环境变量：
- `TODOFORAI_SERVICE_MODE=daemon`: 标识服务模式
- `PATH`: 包含 Homebrew 和系统路径
- `HOME`: 服务工作目录

### 自动启动

服务安装后会自动配置为开机启动。LaunchDaemon 配置包括：
- `RunAtLoad`: 系统启动时自动运行
- `KeepAlive`: 进程意外退出时自动重启
- `StartInterval`: 定期检查服务状态

## 故障排除

### 常见问题

#### 1. 服务无法启动

**症状**: 服务状态显示未运行

**解决方案**:
```bash
# 查看详细日志
sudo ./service-manager.sh logs

# 检查端口占用
lsof -i :50110
lsof -i :50111

# 重启服务
sudo ./service-manager.sh restart
```

#### 2. 端口被占用

**症状**: 日志显示 "Address already in use"

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :50110

# 杀死占用进程
sudo kill -9 <PID>

# 重启服务
sudo ./service-manager.sh restart
```

#### 3. 依赖找不到

**症状**: 日志显示 "Node.js 未安装" 或 "Python3 未安装"

**解决方案**:
```bash
# 检查 PATH 环境变量
echo $PATH

# 确保 Homebrew 路径在 PATH 中
export PATH="/opt/homebrew/bin:$PATH"

# 重新安装服务
sudo ./service-manager.sh uninstall
sudo ./service-manager.sh install
```

#### 4. 数据库连接失败

**症状**: 后端无法连接到 MySQL

**解决方案**:
```bash
# 检查 MySQL 服务状态
brew services list | grep mysql

# 启动 MySQL 服务
brew services start mysql

# 检查数据库配置
mysql -u root -p -e "SHOW DATABASES;"
```

### 日志分析

#### 查看实时日志

```bash
# 实时查看服务日志
sudo tail -f /usr/local/var/log/todoforai/service.log

# 实时查看错误日志
sudo tail -f /usr/local/var/log/todoforai/service-error.log
```

#### 日志级别

- **INFO**: 正常操作信息
- **WARN**: 警告信息，服务可能继续运行
- **ERROR**: 错误信息，可能导致服务失败

### 性能监控

#### 检查资源使用

```bash
# 查看服务进程
ps aux | grep todoforai

# 查看内存使用
top -pid $(pgrep -f todoforai)

# 查看网络连接
netstat -an | grep 50110
```

## 高级配置

### 修改服务配置

如需修改服务配置，编辑 plist 文件：

```bash
sudo nano /Library/LaunchDaemons/com.todoforai.service.plist
```

修改后重新加载：

```bash
sudo launchctl unload /Library/LaunchDaemons/com.todoforai.service.plist
sudo launchctl load /Library/LaunchDaemons/com.todoforai.service.plist
```

### 自定义启动脚本

服务使用专门的启动脚本 `start-service.sh`，可以根据需要进行自定义。

## 安全注意事项

1. **权限管理**: 服务以 root 权限运行，确保只有授权用户可以管理
2. **网络安全**: 默认绑定到所有网络接口，考虑防火墙配置
3. **日志安全**: 定期清理日志文件，避免磁盘空间耗尽

## 备份和恢复

### 备份配置

```bash
# 备份服务配置
sudo cp /Library/LaunchDaemons/com.todoforai.service.plist ~/todoforai-service-backup.plist

# 备份项目文件
sudo tar -czf ~/todoforai-backup.tar.gz /usr/local/share/todoforai/
```

### 恢复配置

```bash
# 恢复服务配置
sudo cp ~/todoforai-service-backup.plist /Library/LaunchDaemons/com.todoforai.service.plist

# 恢复项目文件
sudo tar -xzf ~/todoforai-backup.tar.gz -C /
```

## 支持和反馈

如果遇到问题或有改进建议，请：

1. 查看日志文件获取详细错误信息
2. 检查系统要求和依赖
3. 尝试重启服务
4. 如问题持续，请提供详细的错误日志

---

**注意**: 本服务管理工具专为 macOS 设计，不适用于其他操作系统。
