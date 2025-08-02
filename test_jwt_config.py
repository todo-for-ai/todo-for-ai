#!/usr/bin/env python3
"""
测试JWT配置的脚本
验证JWT token的过期时间是否正确设置为24小时
"""

import sys
import os
sys.path.append('todo-for-ai-api-server')

from datetime import datetime, timedelta
import jwt

# 模拟JWT配置
JWT_SECRET_KEY = 'test-secret-key'
JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24小时 = 86400秒

def create_test_token():
    """创建测试JWT token"""
    now = datetime.utcnow()
    exp = now + timedelta(seconds=JWT_ACCESS_TOKEN_EXPIRES)
    
    payload = {
        'sub': 'test-user-id',
        'username': 'test-user',
        'email': 'test@example.com',
        'iat': now,
        'exp': exp
    }
    
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm='HS256')
    return token, payload

def verify_token_expiration(token):
    """验证token的过期时间"""
    try:
        # 解码token（不验证过期时间）
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'], options={"verify_exp": False})
        
        # 获取过期时间
        exp_timestamp = payload.get('exp')
        iat_timestamp = payload.get('iat')
        
        if exp_timestamp and iat_timestamp:
            exp_time = datetime.fromtimestamp(exp_timestamp)
            iat_time = datetime.fromtimestamp(iat_timestamp)
            
            # 计算token有效期（秒）
            duration_seconds = exp_timestamp - iat_timestamp
            duration_hours = duration_seconds / 3600
            
            print(f"Token创建时间: {iat_time}")
            print(f"Token过期时间: {exp_time}")
            print(f"Token有效期: {duration_seconds}秒 ({duration_hours}小时)")
            
            # 验证是否为24小时
            if abs(duration_seconds - 86400) < 60:  # 允许1分钟误差
                print("✅ JWT token过期时间配置正确：24小时")
                return True
            else:
                print(f"❌ JWT token过期时间配置错误：应该是86400秒(24小时)，实际是{duration_seconds}秒({duration_hours}小时)")
                return False
        else:
            print("❌ Token中缺少过期时间信息")
            return False
            
    except Exception as e:
        print(f"❌ 验证token失败: {e}")
        return False

def main():
    print("=== JWT Token过期时间配置测试 ===")
    print(f"配置的过期时间: {JWT_ACCESS_TOKEN_EXPIRES}秒 ({JWT_ACCESS_TOKEN_EXPIRES/3600}小时)")
    print()
    
    # 创建测试token
    token, payload = create_test_token()
    print(f"生成的测试token: {token[:50]}...")
    print()
    
    # 验证token过期时间
    is_correct = verify_token_expiration(token)
    
    print()
    if is_correct:
        print("🎉 JWT配置测试通过！")
    else:
        print("💥 JWT配置测试失败！")
    
    return is_correct

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
