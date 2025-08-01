#!/bin/bash
# 检查SSL证书过期时间的脚本

DOMAIN="todo4ai.org"
LOG_FILE="/var/log/ssl-check.log"
DAYS_WARNING=30

# 检查证书过期时间
check_ssl_expiry() {
    if [ -f "/etc/letsencrypt/live/$DOMAIN/cert.pem" ]; then
        EXPIRY_DATE=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/cert.pem" | cut -d= -f2)
        EXPIRY_TIMESTAMP=$(date -d "$EXPIRY_DATE" +%s)
        CURRENT_TIMESTAMP=$(date +%s)
        DAYS_LEFT=$(( (EXPIRY_TIMESTAMP - CURRENT_TIMESTAMP) / 86400 ))
        
        echo "$(date): SSL certificate for $DOMAIN expires in $DAYS_LEFT days" >> $LOG_FILE
        
        if [ $DAYS_LEFT -le $DAYS_WARNING ]; then
            echo "$(date): WARNING: SSL certificate for $DOMAIN expires in $DAYS_LEFT days!" >> $LOG_FILE
            # 这里可以添加邮件通知或其他告警方式
        fi
    else
        echo "$(date): SSL certificate file not found for $DOMAIN" >> $LOG_FILE
    fi
}

# 执行检查
check_ssl_expiry
