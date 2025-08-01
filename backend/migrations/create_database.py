#!/usr/bin/env python3
"""
创建数据库脚本

直接连接MySQL服务器创建todo_for_ai数据库
"""

import pymysql
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()


def create_database():
    """创建数据库"""
    # 从DATABASE_URL解析连接信息
    database_url = os.environ.get('DATABASE_URL', 'mysql+pymysql://root:password@localhost:3306/todo_for_ai')
    
    # 解析URL
    # mysql+pymysql://root:password@localhost:3306/todo_for_ai
    parts = database_url.replace('mysql+pymysql://', '').split('/')
    connection_part = parts[0]
    database_name = parts[1] if len(parts) > 1 else 'todo_for_ai'
    
    # 解析用户名、密码、主机、端口
    if '@' in connection_part:
        auth_part, host_part = connection_part.split('@')
        if ':' in auth_part:
            username, password = auth_part.split(':')
        else:
            username = auth_part
            password = ''
    else:
        username = 'root'
        password = ''
        host_part = connection_part
    
    if ':' in host_part:
        host, port = host_part.split(':')
        port = int(port)
    else:
        host = host_part
        port = 3306
    
    print(f"🔗 连接到 MySQL 服务器...")
    print(f"主机: {host}:{port}")
    print(f"用户: {username}")
    print(f"数据库: {database_name}")
    
    try:
        # 连接到MySQL服务器（不指定数据库）
        connection = pymysql.connect(
            host=host,
            port=port,
            user=username,
            password=password,
            charset='utf8mb4'
        )
        
        with connection.cursor() as cursor:
            # 创建数据库
            print(f"📝 创建数据库 {database_name}...")
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {database_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            
            # 检查数据库是否创建成功
            cursor.execute("SHOW DATABASES")
            databases = [row[0] for row in cursor.fetchall()]
            
            if database_name in databases:
                print(f"✅ 数据库 {database_name} 创建成功！")
                return True
            else:
                print(f"❌ 数据库 {database_name} 创建失败")
                return False
                
    except pymysql.Error as e:
        print(f"❌ MySQL 错误: {e}")
        return False
    except Exception as e:
        print(f"❌ 连接失败: {e}")
        return False
    finally:
        if 'connection' in locals():
            connection.close()


def check_mysql_connection():
    """检查MySQL服务器连接"""
    database_url = os.environ.get('DATABASE_URL', 'mysql+pymysql://root:password@localhost:3306/todo_for_ai')
    
    # 解析连接信息（同上）
    parts = database_url.replace('mysql+pymysql://', '').split('/')
    connection_part = parts[0]
    
    if '@' in connection_part:
        auth_part, host_part = connection_part.split('@')
        if ':' in auth_part:
            username, password = auth_part.split(':')
        else:
            username = auth_part
            password = ''
    else:
        username = 'root'
        password = ''
        host_part = connection_part
    
    if ':' in host_part:
        host, port = host_part.split(':')
        port = int(port)
    else:
        host = host_part
        port = 3306
    
    try:
        connection = pymysql.connect(
            host=host,
            port=port,
            user=username,
            password=password,
            charset='utf8mb4'
        )
        connection.close()
        print("✅ MySQL 服务器连接正常")
        return True
    except Exception as e:
        print(f"❌ MySQL 服务器连接失败: {e}")
        print("请检查:")
        print("1. MySQL 服务是否运行")
        print("2. 用户名和密码是否正确")
        print("3. 主机和端口是否正确")
        return False


if __name__ == '__main__':
    print("🗄️ MySQL 数据库创建工具")
    print("=" * 40)
    
    if check_mysql_connection():
        create_database()
    else:
        print("请先解决MySQL连接问题")
