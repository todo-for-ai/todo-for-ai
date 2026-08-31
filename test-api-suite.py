#!/usr/bin/env python3
"""
后端 API 功能测试 - 使用 Python requests 直接测试
"""
import requests
import json
import sys
from datetime import datetime

# 配置
API_URL = "http://127.0.0.1:50110/todo-for-ai/api/v1"
FRONTEND_URL = "http://127.0.0.1:50111"

class APITestSuite:
    def __init__(self):
        self.token = None
        self.results = []
        self.session = requests.Session()

    def login_as_guest(self):
        """以游客身份登录获取token"""
        # 调用游客登录接口，获取重定向URL中的token
        response = self.session.get(
            f"{API_URL}/auth/login/guest?return_to=/todo-for-ai/pages",
            allow_redirects=False
        )

        if response.status_code != 302:
            raise Exception(f"登录失败: {response.status_code}")

        # 从重定向URL中提取token
        location = response.headers.get('Location', '')
        if 'access_token=' not in location:
            raise Exception("登录响应中没有token")

        # 解析token
        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(location)
        params = parse_qs(parsed.query)

        self.token = params.get('access_token', [None])[0]
        if not self.token:
            raise Exception("无法获取access_token")

        print(f"✓ 游客登录成功，获取到token")
        return True

    def test_api(self, name, method, endpoint, expected_status=200, data=None):
        """测试单个API"""
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}

        start = datetime.now()
        try:
            url = f"{API_URL}{endpoint}"
            if method == "GET":
                response = self.session.get(url, headers=headers)
            elif method == "POST":
                response = self.session.post(url, headers=headers, json=data)
            elif method == "PUT":
                response = self.session.put(url, headers=headers, json=data)
            elif method == "DELETE":
                response = self.session.delete(url, headers=headers)
            else:
                raise Exception(f"不支持的HTTP方法: {method}")

            duration = (datetime.now() - start).total_seconds() * 1000

            success = response.status_code == expected_status
            result = {
                "name": name,
                "method": method,
                "endpoint": endpoint,
                "status": response.status_code,
                "expected": expected_status,
                "success": success,
                "duration_ms": duration,
                "error": None
            }

            if success:
                try:
                    result["data_preview"] = response.json()[:200] if isinstance(response.json(), str) else str(response.json())[:200]
                except:
                    result["data_preview"] = response.text[:200]
            else:
                result["error"] = f"期望状态码 {expected_status}, 实际 {response.status_code}"

            self.results.append(result)
            return success

        except Exception as e:
            duration = (datetime.now() - start).total_seconds() * 1000
            self.results.append({
                "name": name,
                "method": method,
                "endpoint": endpoint,
                "status": None,
                "expected": expected_status,
                "success": False,
                "duration_ms": duration,
                "error": str(e)
            })
            return False

    def run_all_tests(self):
        """运行所有API测试"""
        print("="*60)
        print("开始后端 API 功能测试")
        print("="*60)

        # 1. 游客登录
        print("\n【登录测试】")
        try:
            self.login_as_guest()
            self.results.append({
                "name": "游客登录获取Token",
                "success": True,
                "error": None
            })
        except Exception as e:
            self.results.append({
                "name": "游客登录获取Token",
                "success": False,
                "error": str(e)
            })
            print(f"✗ 游客登录失败: {e}")
            return

        # 2. Auth API 测试
        print("\n【Auth API 测试】")
        self.test_api("获取当前用户信息", "GET", "/auth/me")
        self.test_api("获取用户列表(管理员)", "GET", "/auth/users")

        # 3. 项目 API 测试
        print("\n【项目 API 测试】")
        self.test_api("获取项目列表", "GET", "/projects")
        import time
        create_project_result = self.test_api("创建项目", "POST", "/projects", expected_status=201, data={
            "name": f"Test Project {int(time.time())}",
            "description": "Created by automated test"
        })

        # 如果创建成功，测试更新和删除
        if create_project_result:
            # 获取刚创建的项目ID
            projects_res = self.session.get(f"{API_URL}/projects", headers={"Authorization": f"Bearer {self.token}"})
            if projects_res.status_code == 200:
                projects_data = projects_res.json().get('data', {}).get('items', [])
                if projects_data:
                    project_id = projects_data[0]['id']
                    self.test_api(f"获取项目详情", "GET", f"/projects/{project_id}")
                    self.test_api(f"更新项目", "PUT", f"/projects/{project_id}", data={
                        "name": "Updated Test Project",
                        "description": "Updated by automated test"
                    })
                    # 不删除，保留测试数据

        # 4. 任务 API 测试
        print("\n【任务 API 测试】")
        self.test_api("获取任务列表", "GET", "/tasks")

        # 5. 组织 API 测试
        print("\n【组织 API 测试】")
        self.test_api("获取组织列表", "GET", "/organizations")

        # 6. Agents API 测试 - 需要先获取workspace
        print("\n【Agents API 测试】")
        # 获取第一个组织的workspace
        orgs_res = self.session.get(f"{API_URL}/organizations", headers={"Authorization": f"Bearer {self.token}"})
        if orgs_res.status_code == 200:
            orgs = orgs_res.json().get('data', {}).get('items', [])
            if orgs:
                org_id = orgs[0]['id']
                # 尝试获取agents - 组织级别
                self.test_api(f"获取组织{org_id}的Agents", "GET", f"/organizations/{org_id}/agents")
            else:
                self.results.append({
                    "name": "获取Agent列表",
                    "success": False,
                    "error": "没有可用组织"
                })

        # 7. 通知 API 测试
        print("\n【通知 API 测试】")
        self.test_api("获取通知列表", "GET", "/notifications")

        # 8. 系统 API 测试
        print("\n【系统 API 测试】")
        self.test_api("健康检查", "GET", "/health", expected_status=200)

        # 9. Context Rules API 测试
        print("\n【Context Rules API 测试】")
        self.test_api("获取上下文规则列表", "GET", "/context-rules")

        # 生成报告
        self.generate_report()

    def generate_report(self):
        """生成测试报告"""
        total = len(self.results)
        passed = sum(1 for r in self.results if r.get("success"))
        failed = total - passed

        report = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total": total,
                "passed": passed,
                "failed": failed,
                "pass_rate": f"{passed/total*100:.1f}%" if total > 0 else "0%"
            },
            "results": self.results
        }

        # 保存报告
        report_path = "/Users/cc11001100/github/todo-for-ai/todo-for-ai/api-test-report.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        # 打印摘要
        print("\n" + "="*60)
        print("API 测试报告摘要")
        print("="*60)
        print(f"总计: {total} | 通过: {passed} | 失败: {failed} | 通过率: {report['summary']['pass_rate']}")

        if failed > 0:
            print("\n失败的测试:")
            for r in self.results:
                if not r.get("success"):
                    print(f"  ✗ {r['name']}: {r.get('error', 'Unknown error')[:100]}")

        print(f"\n详细报告已保存: {report_path}")
        print("="*60)

if __name__ == "__main__":
    suite = APITestSuite()
    suite.run_all_tests()
