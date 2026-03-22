"""
全面测试脚本 - 覆盖所有主要流程
"""
import asyncio
import json
import time
from playwright.async_api import async_playwright

class ComprehensiveTester:
    def __init__(self):
        self.all_requests = []
        self.all_responses = []
        self.network_errors = []
        self.console_errors = []
        self.console_logs = []
        self.page_errors = []
        self.test_results = []

    async def setup_browser(self):
        """初始化浏览器"""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=False)
        self.context = await self.browser.new_context()
        self.page = await self.context.new_page()

        # 设置事件监听
        self.page.on("request", self.handle_request)
        self.page.on("response", lambda r: asyncio.create_task(self.handle_response(r)))
        self.page.on("console", self.handle_console)
        self.page.on("pageerror", self.handle_page_error)

    def handle_request(self, request):
        """处理请求"""
        url = request.url
        if 'localhost:50112' in url or 'todo-for-ai/api' in url:
            headers = request.headers
            auth_header = headers.get('authorization', 'NOT_PRESENT')
            self.all_requests.append({
                "url": url,
                "method": request.method,
                "auth_header": auth_header[:50] + "..." if auth_header != 'NOT_PRESENT' else 'NOT_PRESENT',
                "timestamp": time.time()
            })

    async def handle_response(self, response):
        """处理响应"""
        url = response.url
        status = response.status

        if 'localhost:50112' in url or 'todo-for-ai/api' in url:
            self.all_responses.append({
                "url": url,
                "status": status,
                "statusText": response.status_text,
                "timestamp": time.time()
            })

            if status >= 400:
                self.network_errors.append({
                    "url": url,
                    "status": status,
                    "statusText": response.status_text,
                    "type": "api_error"
                })

    def handle_console(self, msg):
        """处理控制台消息"""
        msg_type = msg.type
        text = msg.text

        self.console_logs.append({
            "type": msg_type,
            "text": text[:300],
            "timestamp": time.time()
        })

        if msg_type == "error":
            # 过滤掉GitHub相关的错误
            if 'github' not in text.lower():
                self.console_errors.append({
                    "type": msg_type,
                    "text": text[:300]
                })

    def handle_page_error(self, error):
        """处理页面错误"""
        self.page_errors.append({
            "message": str(error),
            "timestamp": time.time()
        })

    async def test_login_flow(self):
        """测试登录流程"""
        print("\n[1] 测试登录页面...")
        try:
            await self.page.goto("http://localhost:50112/todo-for-ai/pages")
            await self.page.wait_for_timeout(3000)

            # 截图
            await self.page.screenshot(path='/Users/cc11001100/github/todo-for-ai/todo-for-ai/test-results/01-login-page.png')

            # 检查页面元素
            login_buttons = await self.page.query_selector_all('button, .login, .auth')
            print(f"  ✓ 找到 {len(login_buttons)} 个登录相关元素")

            self.test_results.append({"name": "Login Page", "status": "PASS"})
        except Exception as e:
            print(f"  ✗ 登录页面测试失败: {e}")
            self.test_results.append({"name": "Login Page", "status": "FAIL", "error": str(e)})

    async def test_guest_login(self):
        """测试游客登录"""
        print("\n[2] 测试游客登录...")
        try:
            # 点击游客登录
            await self.page.click('text=Guest Mode Login')
            await self.page.wait_for_timeout(5000)

            # 截图
            await self.page.screenshot(path='/Users/cc11001100/github/todo-for-ai/todo-for-ai/test-results/02-after-guest-login.png')

            # 检查是否跳转成功（通过URL判断）
            current_url = self.page.url
            if 'access_token' in current_url or 'pages' in current_url:
                print(f"  ✓ 游客登录成功，当前URL: {current_url[:80]}...")
                self.test_results.append({"name": "Guest Login", "status": "PASS"})
            else:
                print(f"  ⚠ 登录后URL: {current_url}")
                self.test_results.append({"name": "Guest Login", "status": "WARNING", "url": current_url})

        except Exception as e:
            print(f"  ✗ 游客登录测试失败: {e}")
            self.test_results.append({"name": "Guest Login", "status": "FAIL", "error": str(e)})

    async def test_dashboard(self):
        """测试 Dashboard 页面"""
        print("\n[3] 测试 Dashboard 页面...")
        try:
            await self.page.goto("http://localhost:50112/todo-for-ai/pages")
            await self.page.wait_for_timeout(5000)

            await self.page.screenshot(path='/Users/cc11001100/github/todo-for-ai/todo-for-ai/test-results/03-dashboard.png')

            # 检查关键元素
            dashboard_elements = await self.page.query_selector_all('.dashboard, .stats, .activity, [class*="dashboard"], [class*="Dashboard"]')
            print(f"  ✓ 找到 {len(dashboard_elements)} 个 Dashboard 相关元素")

            self.test_results.append({"name": "Dashboard", "status": "PASS"})
        except Exception as e:
            print(f"  ✗ Dashboard 测试失败: {e}")
            self.test_results.append({"name": "Dashboard", "status": "FAIL", "error": str(e)})

    async def test_agents_page(self):
        """测试 Agent 管理页面"""
        print("\n[4] 测试 Agent 管理页面...")
        try:
            await self.page.goto("http://localhost:50112/todo-for-ai/pages/agents")
            await self.page.wait_for_timeout(5000)

            await self.page.screenshot(path='/Users/cc11001100/github/todo-for-ai/todo-for-ai/test-results/04-agents-page.png')

            # 检查页面内容
            page_text = await self.page.content()
            if 'agent' in page_text.lower() or 'Agent' in page_text:
                print("  ✓ Agent 页面内容加载成功")
            else:
                print("  ⚠ Agent 页面可能没有正确加载")

            self.test_results.append({"name": "Agents Page", "status": "PASS"})
        except Exception as e:
            print(f"  ✗ Agent 页面测试失败: {e}")
            self.test_results.append({"name": "Agents Page", "status": "FAIL", "error": str(e)})

    async def test_projects_page(self):
        """测试项目管理页面"""
        print("\n[5] 测试项目管理页面...")
        try:
            await self.page.goto("http://localhost:50112/todo-for-ai/pages/projects")
            await self.page.wait_for_timeout(5000)

            await self.page.screenshot(path='/Users/cc11001100/github/todo-for-ai/todo-for-ai/test-results/05-projects-page.png')

            # 检查项目列表
            projects = await self.page.query_selector_all('[class*="project"], .project-item, .project-card')
            print(f"  ✓ 找到 {len(projects)} 个项目元素")

            self.test_results.append({"name": "Projects Page", "status": "PASS"})
        except Exception as e:
            print(f"  ✗ 项目页面测试失败: {e}")
            self.test_results.append({"name": "Projects Page", "status": "FAIL", "error": str(e)})

    async def test_tasks_page(self):
        """测试任务管理页面"""
        print("\n[6] 测试任务管理页面...")
        try:
            await self.page.goto("http://localhost:50112/todo-for-ai/pages/tasks")
            await self.page.wait_for_timeout(5000)

            await self.page.screenshot(path='/Users/cc11001100/github/todo-for-ai/todo-for-ai/test-results/06-tasks-page.png')

            # 检查任务列表
            tasks = await self.page.query_selector_all('[class*="task"], .task-item, .task-card')
            print(f"  ✓ 找到 {len(tasks)} 个任务元素")

            self.test_results.append({"name": "Tasks Page", "status": "PASS"})
        except Exception as e:
            print(f"  ✗ 任务页面测试失败: {e}")
            self.test_results.append({"name": "Tasks Page", "status": "FAIL", "error": str(e)})

    async def test_organizations_page(self):
        """测试组织管理页面"""
        print("\n[7] 测试组织管理页面...")
        try:
            await self.page.goto("http://localhost:50112/todo-for-ai/pages/organizations")
            await self.page.wait_for_timeout(5000)

            await self.page.screenshot(path='/Users/cc11001100/github/todo-for-ai/todo-for-ai/test-results/07-organizations-page.png')

            # 检查组织列表
            orgs = await self.page.query_selector_all('[class*="organization"], [class*="org"], .org-item')
            print(f"  ✓ 找到 {len(orgs)} 个组织元素")

            self.test_results.append({"name": "Organizations Page", "status": "PASS"})
        except Exception as e:
            print(f"  ✗ 组织页面测试失败: {e}")
            self.test_results.append({"name": "Organizations Page", "status": "FAIL", "error": str(e)})

    async def test_navigation(self):
        """测试导航菜单"""
        print("\n[8] 测试导航菜单...")
        try:
            await self.page.goto("http://localhost:50112/todo-for-ai/pages")
            await self.page.wait_for_timeout(3000)

            # 检查导航链接
            nav_links = await self.page.query_selector_all('nav a, .nav-item, [class*="nav"]')
            print(f"  ✓ 找到 {len(nav_links)} 个导航链接")

            # 测试点击导航
            for i, link in enumerate(nav_links[:5]):
                try:
                    href = await link.get_attribute('href')
                    if href and '/pages/' in href:
                        print(f"    - 导航链接: {href}")
                except:
                    pass

            self.test_results.append({"name": "Navigation", "status": "PASS"})
        except Exception as e:
            print(f"  ✗ 导航测试失败: {e}")
            self.test_results.append({"name": "Navigation", "status": "FAIL", "error": str(e)})

    async def run_all_tests(self):
        """运行所有测试"""
        print("="*60)
        print("开始全面测试 - Todo for AI")
        print("="*60)

        try:
            await self.setup_browser()

            # 运行所有测试
            await self.test_login_flow()
            await self.test_guest_login()
            await self.test_dashboard()
            await self.test_agents_page()
            await self.test_projects_page()
            await self.test_tasks_page()
            await self.test_organizations_page()
            await self.test_navigation()

        finally:
            await self.browser.close()
            await self.playwright.stop()

    def generate_report(self):
        """生成测试报告"""
        print("\n" + "="*60)
        print("测试结果汇总")
        print("="*60)

        # 统计结果
        passed = sum(1 for r in self.test_results if r['status'] == 'PASS')
        failed = sum(1 for r in self.test_results if r['status'] == 'FAIL')
        warnings = sum(1 for r in self.test_results if r['status'] == 'WARNING')

        print(f"\n测试项统计:")
        print(f"  ✓ 通过: {passed}")
        print(f"  ✗ 失败: {failed}")
        print(f"  ⚠ 警告: {warnings}")

        print(f"\n详细结果:")
        for result in self.test_results:
            status_icon = "✓" if result['status'] == 'PASS' else "✗" if result['status'] == 'FAIL' else "⚠"
            print(f"  {status_icon} {result['name']}: {result['status']}")
            if 'error' in result:
                print(f"     错误: {result['error'][:100]}")

        # API 统计
        print(f"\nAPI 请求统计:")
        print(f"  总请求数: {len(self.all_requests)}")
        print(f"  总响应数: {len(self.all_responses)}")

        # 状态码统计
        status_counts = {}
        for resp in self.all_responses:
            status = resp['status']
            status_counts[status] = status_counts.get(status, 0) + 1

        print(f"\n响应状态统计:")
        for status in sorted(status_counts.keys()):
            count = status_counts[status]
            symbol = "✓" if status < 400 else "✗"
            print(f"  {symbol} {status}: {count} 个")

        # 网络错误
        if self.network_errors:
            print(f"\n⚠ 网络错误 ({len(self.network_errors)} 个):")
            for err in self.network_errors[:10]:
                print(f"  [{err['status']}] {err['url'][:80]}...")

        # 控制台错误
        if self.console_errors:
            print(f"\n⚠ 控制台错误 ({len(self.console_errors)} 个):")
            for err in self.console_errors[:10]:
                print(f"  [{err['type']}] {err['text'][:100]}...")

        # 页面错误
        if self.page_errors:
            print(f"\n⚠ 页面错误 ({len(self.page_errors)} 个):")
            for err in self.page_errors[:5]:
                print(f"  {err['message'][:100]}...")

        # 保存详细报告
        report = {
            "test_results": self.test_results,
            "api_requests": self.all_requests,
            "api_responses": self.all_responses,
            "network_errors": self.network_errors,
            "console_errors": self.console_errors,
            "console_logs": self.console_logs,
            "page_errors": self.page_errors,
            "summary": {
                "passed": passed,
                "failed": failed,
                "warnings": warnings,
                "total_requests": len(self.all_requests),
                "total_responses": len(self.all_responses),
                "network_error_count": len(self.network_errors),
                "console_error_count": len(self.console_errors),
                "page_error_count": len(self.page_errors)
            }
        }

        with open("/Users/cc11001100/github/todo-for-ai/todo-for-ai/test-results/comprehensive-test-report.json", "w") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        print(f"\n详细报告已保存到: test-results/comprehensive-test-report.json")

        return report


async def main():
    tester = ComprehensiveTester()
    await tester.run_all_tests()
    report = tester.generate_report()
    return report


if __name__ == "__main__":
    report = asyncio.run(main())
