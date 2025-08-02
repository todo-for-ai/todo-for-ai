#!/bin/bash

# Cloudflare SSL证书监控脚本
# 用于监控通过Cloudflare管理的SSL证书状态

# 配置
DOMAIN="todo4ai.org"
LOG_FILE="./logs/cloudflare-ssl-monitor.log"
DAYS_WARNING=30
EMAIL_ALERT="admin@todo4ai.org"  # 可选：邮件告警地址

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# 检查SSL证书状态
check_ssl_certificate() {
    log_message "INFO" "开始检查 $DOMAIN 的SSL证书状态"
    
    # 获取证书信息
    local cert_info=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        log_message "ERROR" "无法获取 $DOMAIN 的SSL证书信息"
        return 1
    fi
    
    # 解析证书日期
    local not_before=$(echo "$cert_info" | grep "notBefore" | cut -d= -f2)
    local not_after=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
    
    if [ -z "$not_after" ]; then
        log_message "ERROR" "无法解析证书过期时间"
        return 1
    fi
    
    # 计算剩余天数（兼容macOS和Linux）
    local expiry_timestamp
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        expiry_timestamp=$(date -j -f "%b %d %H:%M:%S %Y %Z" "$not_after" +%s 2>/dev/null)
    else
        # Linux
        expiry_timestamp=$(date -d "$not_after" +%s 2>/dev/null)
    fi

    local current_timestamp=$(date +%s)
    local days_left=$(( (expiry_timestamp - current_timestamp) / 86400 ))
    
    log_message "INFO" "证书生效时间: $not_before"
    log_message "INFO" "证书过期时间: $not_after"
    log_message "INFO" "剩余有效天数: $days_left 天"
    
    # 检查是否需要告警
    if [ $days_left -le 0 ]; then
        log_message "CRITICAL" "SSL证书已过期！"
        send_alert "CRITICAL" "SSL证书已过期"
        return 2
    elif [ $days_left -le $DAYS_WARNING ]; then
        log_message "WARNING" "SSL证书将在 $days_left 天后过期"
        send_alert "WARNING" "SSL证书将在 $days_left 天后过期"
        return 1
    else
        log_message "INFO" "SSL证书状态正常"
        return 0
    fi
}

# 检查证书颁发者
check_certificate_issuer() {
    log_message "INFO" "检查证书颁发者信息"
    
    local issuer_info=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -issuer 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        log_message "INFO" "证书颁发者: $issuer_info"
        
        # 检查是否为Cloudflare管理的证书
        if echo "$issuer_info" | grep -q "Google\|Cloudflare\|DigiCert"; then
            log_message "INFO" "检测到CDN管理的证书，自动续期应该已启用"
        else
            log_message "WARNING" "证书可能不是由CDN自动管理，请检查续期设置"
        fi
    else
        log_message "ERROR" "无法获取证书颁发者信息"
    fi
}

# 检查Cloudflare服务状态
check_cloudflare_status() {
    log_message "INFO" "检查Cloudflare服务状态"
    
    # 检查响应头中的Cloudflare标识
    local cf_headers=$(curl -s -I "https://$DOMAIN" | grep -i "server\|cf-")
    
    if echo "$cf_headers" | grep -qi "cloudflare"; then
        log_message "INFO" "确认网站正在使用Cloudflare服务"
        log_message "INFO" "Cloudflare响应头: $cf_headers"
    else
        log_message "WARNING" "未检测到Cloudflare服务标识"
    fi
}

# 检查SSL配置
check_ssl_configuration() {
    log_message "INFO" "检查SSL配置"
    
    # 检查SSL协议版本
    local ssl_protocols=$(nmap --script ssl-enum-ciphers -p 443 "$DOMAIN" 2>/dev/null | grep "TLSv")
    
    if [ ! -z "$ssl_protocols" ]; then
        log_message "INFO" "支持的SSL协议: $ssl_protocols"
    fi
    
    # 检查HSTS头
    local hsts_header=$(curl -s -I "https://$DOMAIN" | grep -i "strict-transport-security")
    
    if [ ! -z "$hsts_header" ]; then
        log_message "INFO" "HSTS已启用: $hsts_header"
    else
        log_message "WARNING" "未检测到HSTS头，建议启用"
    fi
}

# 发送告警
send_alert() {
    local level=$1
    local message=$2
    
    # 这里可以添加邮件、Slack、钉钉等告警方式
    log_message "ALERT" "[$level] $message"
    
    # 示例：发送邮件告警（需要配置邮件服务）
    # if command -v mail >/dev/null 2>&1; then
    #     echo "SSL证书告警: $message" | mail -s "[$level] SSL Certificate Alert for $DOMAIN" "$EMAIL_ALERT"
    # fi
}

# 生成监控报告
generate_report() {
    local report_file="/tmp/ssl-monitor-report-$(date +%Y%m%d).txt"
    
    {
        echo "SSL证书监控报告"
        echo "=================="
        echo "域名: $DOMAIN"
        echo "检查时间: $(date)"
        echo ""
        echo "最近的监控日志:"
        tail -20 "$LOG_FILE"
    } > "$report_file"
    
    log_message "INFO" "监控报告已生成: $report_file"
}

# 主函数
main() {
    echo -e "${BLUE}开始SSL证书监控检查...${NC}"

    # 创建日志目录
    mkdir -p "$(dirname "$LOG_FILE")"

    # 确保日志文件可写
    touch "$LOG_FILE" 2>/dev/null || {
        echo -e "${YELLOW}⚠️  无法创建日志文件，使用临时日志${NC}"
        LOG_FILE="/tmp/cloudflare-ssl-monitor.log"
        touch "$LOG_FILE"
    }
    
    # 执行各项检查
    check_ssl_certificate
    local cert_status=$?
    
    check_certificate_issuer
    check_cloudflare_status
    check_ssl_configuration
    
    # 生成报告
    generate_report
    
    # 输出结果
    case $cert_status in
        0)
            echo -e "${GREEN}✅ SSL证书状态正常${NC}"
            ;;
        1)
            echo -e "${YELLOW}⚠️  SSL证书即将过期，请关注${NC}"
            ;;
        2)
            echo -e "${RED}❌ SSL证书已过期，需要立即处理${NC}"
            ;;
        *)
            echo -e "${RED}❌ SSL证书检查失败${NC}"
            ;;
    esac
    
    log_message "INFO" "SSL证书监控检查完成"
}

# 显示帮助信息
show_help() {
    cat << EOF
Cloudflare SSL证书监控脚本

用法: $0 [选项]

选项:
    -h, --help          显示此帮助信息
    -d, --domain        指定要检查的域名 (默认: $DOMAIN)
    -w, --warning       设置告警天数阈值 (默认: $DAYS_WARNING)
    -l, --log           指定日志文件路径 (默认: $LOG_FILE)
    -r, --report        只生成报告，不执行检查
    -q, --quiet         静默模式，只输出错误信息

示例:
    $0                          # 使用默认设置检查
    $0 -d example.com           # 检查指定域名
    $0 -w 7                     # 设置7天告警阈值
    $0 -r                       # 只生成报告

EOF
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        -w|--warning)
            DAYS_WARNING="$2"
            shift 2
            ;;
        -l|--log)
            LOG_FILE="$2"
            shift 2
            ;;
        -r|--report)
            generate_report
            exit 0
            ;;
        -q|--quiet)
            exec > /dev/null
            shift
            ;;
        *)
            echo "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 执行主函数
main
