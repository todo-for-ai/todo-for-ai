#!/usr/bin/env python3
"""
全面功能测试套件 - 使用游客模式登录测试所有页面和API
"""
import asyncio
import json
import sys
from datetime import datetime
from playwright.async_api import async_playwright, Page, Browser, BrowserContext

# 测试配置
BASE_URL = "http://127.0.0.1:50111"
API_URL = "http://127.0.0.1:50110"
TEST_RESULTS = []

class TestResult:
    def __init__(self, name, category):
        self.name = name
        self.category = category
        self.passed = False
        self.error = None
        self.duration = 0
        self.screenshot = None
        self.details = {}

    def to_dict(self):
        return {
            "name": self.name,
            "category": self.category,
            "passed": self.passed,
            "error": self.error,
            "duration_ms": self.duration,
            "screenshot": self.screenshot,
            "details": self.details
        }

class ComprehensiveTestSuite:
    def __init__(self):
        self.browser = None
        self.context = None
        self.page = None
        self.token = None
        self.refresh_token = None
        self.results = []

    async def setup(self):
        """初始化浏览器"""
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(headless=True)
        self.context = await self.browser.new_context(viewport={"width": 1280, "height": 720})
        self.page = await self.context.new_page()

        # 监听控制台和网络错误
        self.console_errors = []
        self.network_errors = []
        self.api_calls = []

        self.page.on("console", lambda msg: self._handle_console(msg))
        self.page.on("response", lambda response: asyncio.create_task(self._handle_response(response)))
        self.page.on("pageerror", lambda error: self.console_errors.append(str(error)))

    def _handle_console(self, msg):
        if msg.type == "error":
            text = msg.text
            # 过滤掉已知的非关键错误
            if not any(x in text.lower() for x in ['github', 'rate limit', 'favicon']):
                self.console_errors.append(text[:200])

    async def _handle_response(self, response):
        url = response.url
        status = response.status
        if ':50110/todo-for-ai/api' in url:
            self.api_calls.append({"url": url, "status": status})
            if status >= 400:
                self.network_errors.append({"url": url, "status": status})

    async def teardown(self):
        """关闭浏览器"""
        if self.browser:
            await self.browser.close()

    async def run_test(self, test_func, name, category):
        """运行单个测试"""
        result = TestResult(name, category)
        start = datetime.now()

        try:
            await test_func(result)
            result.passed = True
        except Exception as e:
            result.error = str(e)
            # 保存失败截图
            try:
                screenshot_path = f"/tmp/test_fail_{name.replace(' ', '_')}.png"
                await self.page.screenshot(path=screenshot_path)
                result.screenshot = screenshot_path
            except:
                pass

        result.duration = (datetime.now() - start).total_seconds() * 1000
        self.results.append(result)
        return result

    # ==================== 登录相关测试 ====================

    async def test_guest_login(self, result):
        """测试游客登录"""
        await self.page.goto(f"{BASE_URL}/todo-for-ai/pages/login")
        await self.page.wait_for_timeout(2000)

        # 点击游客登录按钮
        await self.page.click('button:has-text("Guest")')
        await self.page.wait_for_timeout(4000)

        # 验证跳转成功
        current_url = self.page.url
        if 'login' in current_url:
            raise Exception(f"登录失败，仍在登录页面: {current_url}")

        # 获取token
        self.token = await self.page.evaluate("() => localStorage.getItem('auth_token')")
        self.refresh_token = await self.page.evaluate("() => localStorage.getItem('refresh_token')")

        if not self.token:
            raise Exception("Token未存储到localStorage")

        result.details["current_url"] = current_url
        result.details["has_token"] = True

    async def test_auth_me_api(self, result):
        """测试 /auth/me API"""
        if not self.token:
            raise Exception("未获取到token")

        response = await self.page.evaluate(f"""
            async () => {{
                const res = await fetch('{API_URL}/todo-for-ai/api/v1/auth/me', {{
                    headers: {{ 'Authorization': 'Bearer {self.token}' }}
                }});
                return {{ status: res.status, data: await res.json() }};
            }}
        """)

        if response['status'] != 200:
            raise Exception(f"API返回错误状态: {response['status']}")

        user_data = response['data'].get('data', {})
        result.details["user_email"] = user_data.get('email')
        result.details["user_role"] = user_data.get('role')

    # ==================== 页面访问测试 ====================

    async def test_dashboard_page(self, result):
        """测试仪表板页面"""
        await self.page.goto(f"{BASE_URL}/todo-for-ai/pages")
        await self.page.wait_for_timeout(3000)

        # 检查页面关键元素
        title = await self.page.title()
        content = await self.page.content()

        if 'Guest' not in content and '游客' not in content:
            raise Exception("页面未显示用户信息")

        result.details["title"] = title

    async def test_projects_page(self, result):
        """测试项目管理页面"""
        await self.page.goto(f"{BASE_URL}/todo-for-ai/pages/projects")
        await self.page.wait_for_timeout(3000)

        # 检查页面加载
        content = await self.page.content()
        if '项目' not in content and 'Project' not in content:
            raise Exception("项目页面内容未加载")

    async def test_organizations_page(self, result):
        """测试组织页面"""
        await self.page.goto(f"{BASE_URL}/todo-for-ai/pages/organizations")
        await self.page.wait_for_timeout(3000)

        content = await self.page.content()
        if '组织' not in content and 'Organization' not in content:
            raise Exception("组织页面内容未加载")

    async def test_agents_page(self, result):
        """测试 Agents 页面"""
        await self.page.goto(f"{BASE_URL}/todo-for-ai/pages/agents")
        await self.page.wait_for_timeout(3000)

        content = await self.page.content()
        if 'Agent' not in content:
            raise Exception("Agents页面内容未加载")

    async def test_settings_page(self, result):
        """测试设置页面"""
        await self.page.goto(f"{BASE_URL}/todo-for-ai/pages/settings")
        await self.page.wait_for_timeout(3000)

        content = await self.page.content()
        if '设置' not in content and 'Settings' not in content:
            raise Exception("设置页面内容未加载")

    async def test_profile_page(self, result):
        """测试个人资料页面"""
        await self.page.goto(f"{BASE_URL}/todo-for-ai/pages/profile")
        await self.page.wait_for_timeout(3000)

        content = await self.page.content()
        if 'Profile' not in content and '资料' not in content:
            raise Exception("个人资料页面内容未加载")

    async def test_notifications_page(self, result):
        """测试通知页面"""
        await self.page.goto(f"{BASE_URL}/todo-for-ai/pages/notifications")
        await self.page.wait_for_timeout(3000)

        content = await self.page.content()
        if '通知' not in content and 'Notification' not in content:
            raise Exception("通知页面内容未加载")

    async def test_kanban_page(self, result):
        """测试看板页面"""
        await self.page.goto(f"{BASE_URL}/todo-for-ai/pages/kanban")
        await self.page.wait_for_timeout(3000)

        content = await self.page.content()
        if 'Kanban' not in content and '看板' not in content:
            raise Exception("看板页面内容未加载")

    async def test_context_rules_page(self, result):
        """测试上下文规则页面"""
        await self.page.goto(f"{BASE_URL}/todo-for-ai/pages/context-rules")
        await self.page.wait_for_timeout(3000)

        content = await self.page.content()
        if 'Context' not in content and '规则' not in content:
            raise Exception("上下文规则页面内容未加载")

    async def test_api_docs_page(self, result):
        """测试API文档页面"""
        await self.page.goto(f"{BASE_URL}/todo-for-ai/pages/api-documentation")
        await self.page.wait_for_timeout(3000)

        content = await self.page.content()
        if 'API' not in content:
            raise Exception("API文档页面内容未加载")

    # ==================== API 功能测试 ====================

    async def test_projects_api(self, result):
        """测试项目列表API"""
        response = await self.page.evaluate(f"""
            async () => {{
                const res = await fetch('{API_URL}/todo-for-ai/api/v1/projects', {{
                    headers: {{ 'Authorization': 'Bearer {self.token}' }}
                }});
                return {{ status: res.status, data: await res.json() }};
            }}
        """)

        if response['status'] != 200:
            raise Exception(f"项目API返回错误: {response['status']}")

        result.details["projects_count"] = len(response['data'].get('data', {}).get('projects', []))

    async def test_organizations_api(self, result):
        """测试组织列表API"""
        response = await self.page.evaluate(f"""
            async () => {{
                const res = await fetch('{API_URL}/todo-for-ai/api/v1/organizations', {{
                    headers: {{ 'Authorization': 'Bearer {self.token}' }}
                }});
                return {{ status: res.status, data: await res.json() }};
            }}
        """)

        if response['status'] != 200:
            raise Exception(f"组织API返回错误: {response['status']}")

        result.details["orgs_count"] = len(response['data'].get('data', {}).get('organizations', []))

    async def test_agents_api(self, result):
        """测试 Agents API"""
        response = await self.page.evaluate(f"""
            async () => {{
                const res = await fetch('{API_URL}/todo-for-ai/api/v1/agents', {{
                    headers: {{ 'Authorization': 'Bearer {self.token}' }}
                }});
                return {{ status: res.status, data: await res.json() }};
            }}
        """)

        if response['status'] != 200:
            raise Exception(f"Agents API返回错误: {response['status']}")

        result.details["agents_count"] = len(response['data'].get('data', {}).get('agents', []))

    async def test_tasks_api(self, result):
        """测试任务列表API"""
        response = await self.page.evaluate(f"""
            async () => {{
                const res = await fetch('{API_URL}/todo-for-ai/api/v1/tasks', {{
                    headers: {{ 'Authorization': 'Bearer {self.token}' }}
                }});
                return {{ status: res.status, data: await res.json() }};
            }}
        """)

        if response['status'] != 200:
            raise Exception(f"任务API返回错误: {response['status']}")

        result.details["tasks_count"] = len(response['data'].get('data', {}).get('tasks', []))

    async def test_notifications_api(self, result):
        """测试通知API"""
        response = await self.page.evaluate(f"""
            async () => {{
                const res = await fetch('{API_URL}/todo-for-ai/api/v1/notifications', {{
                    headers: {{ 'Authorization': 'Bearer {self.token}' }}
                }});
                return {{ status: res.status, data: await res.json() }};
            }}
        """)

        if response['status'] != 200:
            raise Exception(f"通知API返回错误: {response['status']}")

        result.details["notifications_count"] = len(response['data'].get('data', {}).get('notifications', []))

    async def test_health_api(self, result):
        """测试健康检查API"""
        response = await self.page.evaluate(f"""
            async () => {{
                const res = await fetch('{API_URL}/todo-for-ai/api/v1/health');
                return {{ status: res.status, data: await res.json() }};
            }}
        """)

        if response['status'] != 200:
            raise Exception(f"健康检查API返回错误: {response['status']}")

        result.details["service_status"] = response['data'].get('data', {}).get('status')

    # ==================== 运行所有测试 ====================

    async def run_all_tests(self):
        """运行完整测试套件"""
        print("="*60)
        print("开始全面功能测试")
        print("="*60)

        await self.setup()

        # 1. 登录测试
        print("\n【登录测试】")
        await self.run_test(self.test_guest_login, "游客登录", "auth")
        await self.run_test(self.test_auth_me_api, "获取当前用户信息", "auth")

        # 2. 页面访问测试
        print("\n【页面访问测试】")
        await self.run_test(self.test_dashboard_page, "仪表板页面", "page")
        await self.run_test(self.test_projects_page, "项目管理页面", "page")
        await self.run_test(self.test_organizations_page, "组织页面", "page")
        await self.run_test(self.test_agents_page, "Agents页面", "page")
        await self.run_test(self.test_settings_page, "设置页面", "page")
        await self.run_test(self.test_profile_page, "个人资料页面", "page")
        await self.run_test(self.test_notifications_page, "通知页面", "page")
        await self.run_test(self.test_kanban_page, "看板页面", "page")
        await self.run_test(self.test_context_rules_page, "上下文规则页面", "page")
        await self.run_test(self.test_api_docs_page, "API文档页面", "page")

        # 3. API功能测试
        print("\n【API功能测试】")
        await self.run_test(self.test_health_api, "健康检查API", "api")
        await self.run_test(self.test_projects_api, "项目列表API", "api")
        await self.run_test(self.test_organizations_api, "组织列表API", "api")
        await self.run_test(self.test_agents_api, "Agents列表API", "api")
        await self.run_test(self.test_tasks_api, "任务列表API", "api")
        await self.run_test(self.test_notifications_api, "通知列表API", "api")

        await self.teardown()

        # 生成报告
        self.generate_report()

    def generate_report(self):
        """生成测试报告"""
        total = len(self.results)
        passed = sum(1 for r in self.results if r.passed)
        failed = total - passed

        categories = {}
        for r in self.results:
            cat = r.category
            if cat not in categories:
                categories[cat] = {"total": 0, "passed": 0}
            categories[cat]["total"] += 1
            if r.passed:
                categories[cat]["passed"] += 1

        report = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total": total,
                "passed": passed,
                "failed": failed,
                "pass_rate": f"{passed/total*100:.1f}%" if total > 0 else "0%"
            },
            "categories": {k: {**v, "rate": f"{v['passed']/v['total']*100:.1f}%"} for k, v in categories.items()},
            "results": [r.to_dict() for r in self.results],
            "console_errors": self.console_errors[:20],
            "network_errors": self.network_errors[:20]
        }

        # 保存报告
        report_path = "/Users/cc11001100/github/todo-for-ai/todo-for-ai/comprehensive-test-report.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        # 打印摘要
        print("\n" + "="*60)
        print("测试报告摘要")
        print("="*60)
        print(f"总计: {total} | 通过: {passed} | 失败: {failed} | 通过率: {report['summary']['pass_rate']}")
        print("\n分类统计:")
        for cat, stats in categories.items():
            print(f"  {cat}: {stats['passed']}/{stats['total']} ({stats['passed']/stats['total']*100:.1f}%)")

        if failed > 0:
            print("\n失败的测试:")
            for r in self.results:
                if not r.passed:
                    print(f"  ✗ {r.name}: {r.error[:100]}")

        print(f"\n详细报告已保存: {report_path}")
        print("="*60)

async def main():
    suite = ComprehensiveTestSuite()
    await suite.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())
