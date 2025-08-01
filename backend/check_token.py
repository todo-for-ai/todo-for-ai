#!/usr/bin/env python3
"""
检查API token是否在数据库中
"""

import os
import sys
import hashlib
import sqlite3

def check_token_in_db():
    """检查token是否在数据库中"""
    # 数据库路径
    db_path = 'todo_for_ai.db'
    if not os.path.exists(db_path):
        print(f"Database file not found: {db_path}")
        return
    
    # 我们要检查的token
    test_token = 'VqGbuPQvFygVmqJwrMQ1rSHDVrb0iYapNbfOaDAmCFs'
    test_hash = hashlib.sha256(test_token.encode()).hexdigest()
    
    print(f"Checking token: {test_token}")
    print(f"Token hash: {test_hash}")
    
    # 连接数据库
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 查询所有tokens
    cursor.execute("SELECT name, token_hash, is_active, created_at FROM api_tokens")
    tokens = cursor.fetchall()
    
    print(f"\nTotal tokens in database: {len(tokens)}")
    for token in tokens:
        name, token_hash, is_active, created_at = token
        print(f"Token: {name}, Hash: {token_hash[:10]}..., Active: {is_active}, Created: {created_at}")
    
    # 查找我们的token
    cursor.execute("SELECT * FROM api_tokens WHERE token_hash = ?", (test_hash,))
    found_token = cursor.fetchone()
    
    if found_token:
        print(f"\n✅ Found our token in database!")
        print(f"Details: {found_token}")
    else:
        print(f"\n❌ Our token NOT found in database!")
    
    conn.close()

if __name__ == "__main__":
    check_token_in_db()
