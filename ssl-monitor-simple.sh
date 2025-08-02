#!/bin/bash

# 简化版SSL证书监控脚本
# 专门为Cloudflare管理的SSL证书设计

# 配置
DOMAIN="todo4ai.org"
DAYS_WARNING=30
LOG_DIR="./logs"
LOG_FILE="$LOG_DIR/ssl-monitor.log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 创建日志目录
mkdir -p "$LOG_DIR"

# 日志函数
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# 检查SSL证书状态
check_ssl_certificate() {
    echo -e "${BLUE}🔍 检查 $DOMAIN 的SSL证书状态...${NC}"
    
    # 获取证书信息
    local cert_info=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 无法获取SSL证书信息${NC}"
        log_message "ERROR" "无法获取 $DOMAIN 的SSL证书信息"
        return 1
    fi
    
    # 解析证书日期
    local not_before=$(echo "$cert_info" | grep "notBefore" | cut -d= -f2)
    local not_after=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
    
    echo -e "${BLUE}📅 证书生效时间: $not_before${NC}"
    echo -e "${BLUE}📅 证书过期时间: $not_after${NC}"
    
    # 计算剩余天数
    local expiry_timestamp
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - 使用简化的日期解析
        local year=$(echo "$not_after" | awk '{print $4}')
        local month=$(echo "$not_after" | awk '{print $1}')
        local day=$(echo "$not_after" | awk '{print $2}')
        
        # 转换月份名称为数字
        case $month in
            Jan) month=01 ;;
            Feb) month=02 ;;
            Mar) month=03 ;;
            Apr) month=04 ;;
            May) month=05 ;;
            Jun) month=06 ;;
            Jul) month=07 ;;
            Aug) month=08 ;;
            Sep) month=09 ;;
            Oct) month=10 ;;
            Nov) month=11 ;;
            Dec) month=12 ;;
        esac
        
        expiry_timestamp=$(date -j -f "%Y-%m-%d" "$year-$month-$day" +%s 2>/dev/null)
    else
        # Linux
        expiry_timestamp=$(date -d "$not_after" +%s 2>/dev/null)
    fi
    
    local current_timestamp=$(date +%s)
    local days_left=$(( (expiry_timestamp - current_timestamp) / 86400 ))
    
    echo -e "${BLUE}⏰ 剩余有效天数: $days_left 天${NC}"
    log_message "INFO" "证书剩余有效天数: $days_left 天"
    
    # 检查证书状态
    if [ $days_left -le 0 ]; then
        echo -e "${RED}❌ SSL证书已过期！${NC}"
        log_message "CRITICAL" "SSL证书已过期"
        return 2
    elif [ $days_left -le $DAYS_WARNING ]; then
        echo -e "${YELLOW}⚠️  SSL证书将在 $days_left 天后过期${NC}"
        log_message "WARNING" "SSL证书将在 $days_left 天后过期"
        return 1
    else
        echo -e "${GREEN}✅ SSL证书状态正常${NC}"
        log_message "INFO" "SSL证书状态正常"
        return 0
    fi
}

# 检查证书颁发者
check_certificate_issuer() {
    echo -e "${BLUE}🏢 检查证书颁发者...${NC}"
    
    local issuer_info=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -issuer 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo -e "${BLUE}📋 证书颁发者: $issuer_info${NC}"
        log_message "INFO" "证书颁发者: $issuer_info"
        
        # 检查是否为CDN管理的证书
        if echo "$issuer_info" | grep -q "Google\|Cloudflare\|DigiCert"; then
            echo -e "${GREEN}✅ 检测到CDN管理的证书，自动续期已启用${NC}"
            log_message "INFO" "检测到CDN管理的证书，自动续期应该已启用"
        else
            echo -e "${YELLOW}⚠️  证书可能不是由CDN自动管理${NC}"
            log_message "WARNING" "证书可能不是由CDN自动管理，请检查续期设置"
        fi
    else
        echo -e "${RED}❌ 无法获取证书颁发者信息${NC}"
        log_message "ERROR" "无法获取证书颁发者信息"
    fi
}

# 检查Cloudflare服务状态
check_cloudflare_status() {
    echo -e "${BLUE}☁️  检查Cloudflare服务状态...${NC}"
    
    # 检查响应头中的Cloudflare标识
    local cf_headers=$(curl -s -I "https://$DOMAIN" | grep -i "server\|cf-")
    
    if echo "$cf_headers" | grep -qi "cloudflare"; then
        echo -e "${GREEN}✅ 确认网站正在使用Cloudflare服务${NC}"
        log_message "INFO" "确认网站正在使用Cloudflare服务"
    else
        echo -e "${YELLOW}⚠️  未检测到Cloudflare服务标识${NC}"
        log_message "WARNING" "未检测到Cloudflare服务标识"
    fi
}

# 生成监控报告
generate_report() {
    local report_file="$LOG_DIR/ssl-monitor-report-$(date +%Y%m%d).txt"
    
    {
        echo "SSL证书监控报告"
        echo "=================="
        echo "域名: $DOMAIN"
        echo "检查时间: $(date)"
        echo ""
        echo "最近的监控日志:"
        tail -20 "$LOG_FILE" 2>/dev/null || echo "暂无日志记录"
    } > "$report_file"
    
    echo -e "${BLUE}📊 监控报告已生成: $report_file${NC}"
    log_message "INFO" "监控报告已生成: $report_file"
}

# 主函数
main() {
    echo -e "${BLUE}🚀 开始SSL证书监控检查...${NC}"
    echo ""
    
    log_message "INFO" "开始SSL证书监控检查"
    
    # 执行各项检查
    check_ssl_certificate
    local cert_status=$?
    
    echo ""
    check_certificate_issuer
    
    echo ""
    check_cloudflare_status
    
    echo ""
    generate_report
    
    echo ""
    # 输出最终结果
    case $cert_status in
        0)
            echo -e "${GREEN}🎉 SSL证书状态正常，无需担心${NC}"
            ;;
        1)
            echo -e "${YELLOW}⚠️  SSL证书即将过期，请关注续期情况${NC}"
            ;;
        2)
            echo -e "${RED}🚨 SSL证书已过期，需要立即处理${NC}"
            ;;
        *)
            echo -e "${RED}❌ SSL证书检查失败${NC}"
            ;;
    esac
    
    log_message "INFO" "SSL证书监控检查完成"
    echo ""
    echo -e "${BLUE}📝 详细日志: $LOG_FILE${NC}"
}

# 显示帮助信息
show_help() {
    cat << EOF
SSL证书监控脚本 (Cloudflare版)

用法: $0 [选项]

选项:
    -h, --help          显示此帮助信息
    -d, --domain        指定要检查的域名 (默认: $DOMAIN)
    -w, --warning       设置告警天数阈值 (默认: $DAYS_WARNING)
    -r, --report        只生成报告，不执行检查

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
        -r|--report)
            generate_report
            exit 0
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
