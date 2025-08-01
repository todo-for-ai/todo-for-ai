#!/bin/bash
# SSL证书续期后重启Nginx
systemctl reload nginx
echo "$(date): SSL certificate renewed, Nginx reloaded" >> /var/log/certbot-renewal.log
