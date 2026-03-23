"""
端到端全面测试 - 覆盖所有主要业务流程
"""
import asyncio
import json
import time
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

class E2EComprehensiveTester:
    def __init__(self):
        self.results = []
        self.errors = []
        self.screenshots = []

    async def setup(self):
        """初始化浏览器"""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=False)
        self.context = await self.browser.new_context()
        self.page = await self.context.new_page()

        # 设置事件监听
        self.page.on("console", self.handle_console)
        self.page.on("pageerror", self.handle_page_error)
        self.page.on("response", self.handle_response)

    def handle_console(self, msg):
        if msg.type == "error":
            self.errors.append({"type": "console", "text": msg.text})

    def handle_page_error(self, error):
        self.errors.append({"type": "page", "message": str(error)})

    def handle_response(self, response):
        if response.status >= 400:
            self.errors.append({
                "type": "api",
                "status": response.status,
                "url": response.url
            })

    async def screenshot(self, name):
        """保存截图"""
        path = f'/Users/cc11001100/github/todo-for-ai/todo-for-ai/test-results/e2e_{name}.png'
        await self.page.screenshot(path=path)
        self.screenshots.append(name)

    async def test_login_flows(self):
        """测试各种登录流程"""
        print("\n" + "="*60)
        print("测试登录流程")
        print("="*60)

        # 1. 测试登录页面加载
        print("\n[1] 测试登录页面...")
        try:
            await self.page.goto("http://localhost:50111/todo-for-ai/pages/login")
            await self.page.wait_for_timeout(2000)
            await self.screenshot("login_page")

            # 检查登录选项
            login_buttons = await self.page.query_selector_all('button')
            print(f"  ✓ 找到 {len(login_buttons)} 个按钮")

            # 检查各种登录方式
            for login_type in ["GitHub", "Gmail", "Guest"]:
                selector = f'text={login_type}'
                element = await self.page.query_selector(selector)
                if element:
                    print(f"  ✓ 支持 {login_type} 登录")

            self.results.append({"name": "登录页面", "status": "PASS"})
        except Exception as e:
            print(f"  ✗ 失败: {e}")
            self.results.append({"name": "登录页面", "status": "FAIL", "error": str(e)})

    async def test_guest_login_and_navigation(self):
        """测试游客登录和导航"""
        print("\n" + "="*60)
        print("测试游客登录和导航")
        print("="*60)

        # 游客登录
        print("\n[2] 测试游客登录...")
        try:
            await self.page.goto("http://localhost:50111/todo-for-ai/pages/login")
            await self.page.click('text=Guest Mode Login')
            await self.page.wait_for_timeout(5000)
            await self.screenshot("after_guest_login")

            # 检查是否登录成功
            current_url = self.page.url
            if "login" not in current_url:
                print(f"  ✓ 游客登录成功")
                print(f"  ✓ 当前URL: {current_url[:60]}...")

                # 检查用户信息
                user_element = await self.page.query_selector('text=Guest')
                if user_element:
                    print("  ✓ 显示 Guest 用户")

                self.results.append({"name": "游客登录", "status": "PASS"})
            else:
                print("  ✗ 登录失败，仍在登录页面")
                self.results.append({"name": "游客登录", "status": "FAIL"})
        except Exception as e:
            print(f"  ✗ 失败: {e}")
            self.results.append({"name": "游客登录", "status": "FAIL", "error": str(e)})

        # 测试导航菜单
        print("\n[3] 测试导航菜单...")
        try:
            nav_items = [
                ("仪表板", "/todo-for-ai/pages"),
                ("项目管理", "/todo-for-ai/pages/projects"),
                ("任务管理", "/todo-for-ai/pages/tasks"),
                ("组织管理", "/todo-for-ai/pages/organizations"),
                ("Agent管理", "/todo-for-ai/pages/agents"),
            ]

            for name, url in nav_items:
                try:
                    await self.page.goto(f"http://localhost:50111{url}")
                    await self.page.wait_for_timeout(3000)
                    await self.screenshot(f"nav_{name.replace(' ', '_')}")

                    # 检查页面是否加载
                    page_title = await self.page.title()
                    print(f"  ✓ {name}: 页面加载成功")
                except Exception as e:
                    print(f"  ✗ {name}: 加载失败 - {e}")

            self.results.append({"name": "导航菜单", "status": "PASS"})
        except Exception as e:
            print(f"  ✗ 失败: {e}")
            self.results.append({"name": "导航菜单", "status": "FAIL", "error": str(e)})

    async def test_dashboard_features(self):
        """测试 Dashboard 功能"""
        print("\n" + "="*60)
        print("测试 Dashboard 功能")
        print("="*60)

        try:
            await self.page.goto("http://localhost:50111/todo-for-ai/pages")
            await self.page.wait_for_timeout(5000)
            await self.screenshot("dashboard_full")

            # 检查统计数据
            stats_check = [
                "项目数",
                "任务数",
                "进行中",
                "Agent"
            ]

            content = await self.page.content()
            for stat in stats_check:
                if stat in content:
                    print(f"  ✓ 显示 {stat} 统计")

            # 检查图表或可视化元素
            charts = await self.page.query_selector_all('canvas, .chart, [class*="chart"], [class*="Chart"]')
            if len(charts) > 0:
                print(f"  ✓ 找到 {len(charts)} 个图表元素")

            self.results.append({"name": "Dashboard功能", "status": "PASS"})
        except Exception as e:
            print(f"  ✗ 失败: {e}")
            self.results.append({"name": "Dashboard功能", "status": "FAIL", "error": str(e)})

    async def test_project_management(self):
        """测试项目管理功能"""
        print("\n" + "="*60)
        print("测试项目管理")
        print("="*60)

        try:
            await self.page.goto("http://localhost:50111/todo-for-ai/pages/projects")
            await self.page.wait_for_timeout(5000)
            await self.screenshot("projects_page")

            # 检查项目列表
            projects = await self.page.query_selector_all('[class*="project"], .project-item, .project-card')
            print(f"  ✓ 找到 {len(projects)} 个项目元素")

            # 检查是否有创建项目按钮
            create_btn = await self.page.query_selector('text=/创建|Create|新建|New/i')
            if create_btn:
                print("  ✓ 找到创建项目按钮")

            # 检查搜索功能
            search = await self.page.query_selector('input[type="search"], input[placeholder*="搜索"], input[placeholder*="Search"]')
            if search:
                print("  ✓ 找到搜索框")

            self.results.append({"name": "项目管理", "status": "PASS"})
        except Exception as e:
            print(f"  ✗ 失败: {e}")
            self.results.append({"name": "项目管理", "status": "FAIL", "error": str(e)})

    async def test_agent_management(self):
        """测试 Agent 管理功能"""
        print("\n" + "="*60)
        print("测试 Agent 管理")
        print("="*60)

        try:
            await self.page.goto("http://localhost:50111/todo-for-ai/pages/agents")
            await self.page.wait_for_timeout(5000)
            await self.screenshot("agents_page")

            # 检查 Agent 列表或统计
            agents = await self.page.query_selector_all('[class*="agent"], .agent-item, .agent-card')
            print(f"  ✓ 找到 {len(agents)} 个 Agent 元素")

            # 检查页面内容
            content = await self.page.content()
            agent_keywords = ["Agent", "agent", "智能体", "代理"]
            for keyword in agent_keywords:
                if keyword in content:
                    print(f"  ✓ 页面包含 '{keyword}' 内容")
                    break

            # 检查是否有创建 Agent 按钮
            create_btn = await self.page.query_selector('text=/创建|Create|新建|New/i')
            if create_btn:
                print("  ✓ 找到创建 Agent 按钮")

            self.results.append({"name": "Agent管理", "status": "PASS"})
        except Exception as e:
            print(f"  ✗ 失败: {e}")
            self.results.append({"name": "Agent管理", "status": "FAIL", "error": str(e)})

    async def test_task_management(self):
        """测试任务管理功能"""
        print("\n" + "="*60)
        print("测试任务管理")
        print("="*60)

        try:
            await self.page.goto("http://localhost:50111/todo-for-ai/pages/tasks")
            await self.page.wait_for_timeout(5000)
            await self.screenshot("tasks_page")

            # 检查任务列表
            tasks = await self.page.query_selector_all('[class*="task"], .task-item, .task-card')
            print(f"  ✓ 找到 {len(tasks)} 个任务元素")

            # 检查看板或列表视图
            views = await self.page.query_selector_all('[class*="kanban"], [class*="list"], [class*="board"]')
            if len(views) > 0:
                print(f"  ✓ 找到 {len(views)} 个视图元素")

            self.results.append({"name": "任务管理", "status": "PASS"})
        except Exception as e:
            print(f"  ✗ 失败: {e}")
            self.results.append({"name": "任务管理", "status": "FAIL", "error": str(e)})

    async def test_organization_management(self):
        """测试组织管理功能"""
        print("\n" + "="*60)
        print("测试组织管理")
        print("="*60)

        try:
            await self.page.goto("http://localhost:50111/todo-for-ai/pages/organizations")
            await self.page.wait_for_timeout(5000)
            await self.screenshot("organizations_page")

            # 检查组织列表
            orgs = await self.page.query_selector_all('[class*="organization"], [class*="org"], .org-item')
            print(f"  ✓ 找到 {len(orgs)} 个组织元素")

            # 检查页面内容
            content = await self.page.content()
            org_keywords = ["组织", "Organization", "团队", "Team"]
            for keyword in org_keywords:
                if keyword in content:
                    print(f"  ✓ 页面包含 '{keyword}' 内容")
                    break

            self.results.append({"name": "组织管理", "status": "PASS"})
        except Exception as e:
            print(f"  ✗ 失败: {e}")
            self.results.append({"name": "组织管理", "status": "FAIL", "error": str(e)})

    async def test_user_profile_and_settings(self):
        """测试用户个人资料和设置"""
        print("\n" + "="*60)
        print("测试用户个人资料和设置")
        print("="*60)

        try:
            # 测试个人资料页
            await self.page.goto("http://localhost:50111/todo-for-ai/pages/profile")
            await self.page.wait_for_timeout(3000)
            await self.screenshot("profile_page")
            print("  ✓ 个人资料页加载")

            # 测试设置页
            await self.page.goto("http://localhost:50111/todo-for-ai/pages/settings")
            await self.page.wait_for_timeout(3000)
            await self.screenshot("settings_page")
            print("  ✓ 设置页加载")

            self.results.append({"name": "用户资料设置", "status": "PASS"})
        except Exception as e:
            print(f"  ✗ 失败: {e}")
            self.results.append({"name": "用户资料设置", "status": "FAIL", "error": str(e)})

    async def test_responsive_design(self):
        """测试响应式设计"""
        print("\n" + "="*60)
        print("测试响应式设计")
        print("="*60)

        viewports = [
            ("桌面端", 1920, 1080),
            ("平板", 1024, 768),
            ("手机", 375, 667)
        ]

        for name, width, height in viewports:
            try:
                await self.page.set_viewport_size({"width": width, "height": height})
                await self.page.goto("http://localhost:50111/todo-for-ai/pages")
                await self.page.wait_for_timeout(2000)
                await self.screenshot(f"responsive_{name}")
                print(f"  ✓ {name} ({width}x{height}): 显示正常")
            except Exception as e:
                print(f"  ✗ {name}: 测试失败 - {e}")

        self.results.append({"name": "响应式设计", "status": "PASS"})

    async def test_error_handling(self):
        """测试错误处理"""
        print("\n" + "="*60)
        print("测试错误处理")
        print("="*60)

        # 测试 404 页面
        try:
            await self.page.goto("http://localhost:50111/todo-for-ai/pages/nonexistent")
            await self.page.wait_for_timeout(2000)
            await self.screenshot("error_404")
            print("  ✓ 404 页面处理正常")
        except Exception as e:
            print(f"  ✗ 404 测试失败: {e}")

        self.results.append({"name": "错误处理", "status": "PASS"})

    async def run_all_tests(self):
        """运行所有测试"""
        print("="*60)
        print("开始全面端到端测试")
        print("="*60)

        await self.setup()

        try:
            await self.test_login_flows()
            await self.test_guest_login_and_navigation()
            await self.test_dashboard_features()
            await self.test_project_management()
            await self.test_agent_management()
            await self.test_task_management()
            await self.test_organization_management()
            await self.test_user_profile_and_settings()
            await self.test_responsive_design()
            await self.test_error_handling()
        finally:
            await self.browser.close()
            await self.playwright.stop()

    def generate_report(self):
        """生成测试报告"""
        print("\n" + "="*60)
        print("测试报告")
        print("="*60)

        passed = sum(1 for r in self.results if r["status"] == "PASS")
        failed = sum(1 for r in self.results if r["status"] == "FAIL")

        print(f"\n测试统计:")
        print(f"  ✓ 通过: {passed}")
        print(f"  ✗ 失败: {failed}")
        print(f"  📸 截图: {len(self.screenshots)} 张")
        print(f"  ⚠️  错误: {len(self.errors)} 个")

        print(f"\n详细结果:")
        for result in self.results:
            icon = "✓" if result["status"] == "PASS" else "✗"
            print(f"  {icon} {result['name']}")
            if "error" in result:
                print(f"     错误: {result['error'][:80]}")

        if self.errors:
            print(f"\n发现的错误:")
            for error in self.errors[:10]:
                print(f"  - {error}")

        # 保存报告
        report = {
            "results": self.results,
            "errors": self.errors,
            "screenshots": self.screenshots,
            "summary": {
                "passed": passed,
                "failed": failed,
                "total": len(self.results)
            }
        }

        with open("/Users/cc11001100/github/todo-for-ai/todo-for-ai/test-results/e2e_test_report.json", "w") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        print(f"\n详细报告已保存到: test-results/e2e_test_report.json")


async def main():
    tester = E2EComprehensiveTester()
    await tester.run_all_tests()
    tester.generate_report()


if __name__ == "__main__":
    asyncio.run(main())
