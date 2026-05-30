#!/usr/bin/env python3
"""
配置 LongCat API 到系统设置

用法:
    python scripts/configure_longcat_api.py
"""

import sys
import os

# 添加 API server 目录到路径
api_server_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'todo-for-ai-api-server')
sys.path.insert(0, api_server_path)

from app import create_app
from models import db
from models.system_settings import SystemSettings


def configure_longcat_api():
    """配置 LongCat API"""
    app = create_app()

    # 从环境变量读取 API Key（安全方式）
    api_key = os.environ.get('LONGCAT_API_KEY', '')
    if not api_key:
        print("❌ 错误: 请设置环境变量 LONGCAT_API_KEY")
        print("   示例: LONGCAT_API_KEY=your_key python scripts/configure_longcat_api.py")
        sys.exit(1)

    with app.app_context():
        # LongCat API 配置
        longcat_config = {
            'provider': 'openai',  # 使用 OpenAI 兼容格式
            'api_base': 'https://api.longcat.chat/openai',  # OpenAI 格式端点
            'api_key': api_key,  # 从环境变量读取
            'model': 'LongCat-Flash-Lite',  # 模型名称
            'temperature': 0.7,
            'max_tokens': 4096,
            'timeout': 120,
        }

        # 保存配置（加密存储）
        setting = SystemSettings.set_llm_config(
            longcat_config,
            updated_by=1,  # 系统管理员
        )

        print(f"✅ LongCat API 配置已保存!")
        print(f"   - Provider: {longcat_config['provider']}")
        print(f"   - API Base: {longcat_config['api_base']}")
        print(f"   - Model: {longcat_config['model']}")
        print(f"   - API Key: {longcat_config['api_key'][:10]}...")
        print(f"   - 设置 ID: {setting.id}")

        # 验证配置
        saved_config = SystemSettings.get_llm_config()
        print(f"\n📋 验证配置:")
        print(f"   - Provider: {saved_config.get('provider')}")
        print(f"   - API Base: {saved_config.get('api_base')}")
        print(f"   - Model: {saved_config.get('model')}")

        return setting


if __name__ == '__main__':
    configure_longcat_api()
