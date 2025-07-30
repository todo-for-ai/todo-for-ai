#!/bin/bash

# 设置代理环境变量 - 尝试HTTP代理
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890

# 禁用SSL验证
export PYTHONHTTPSVERIFY=0
export REQUESTS_CA_BUNDLE=""
export CURL_CA_BUNDLE=""

# 激活虚拟环境并启动应用
cd backend
source venv/bin/activate
PORT=50110 python app.py
