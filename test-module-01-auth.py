import asyncio
import json
from playwright.async_api import async_playwright

async def test_auth_module():
    """测试用户认证模块"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        # 收集测试数据
        test_results = []
        network_errors = []
        console_errors = []

        async def log_response(response):
            url = response.url
            status = response.status
            if 'localhost:50110/todo-for-ai/api' in url:
                if status >= 400:
                    network_errors.append({"url": url, "status": status})

        def log_console(msg):
            if msg.type == "error":
                text = msg.text
                if 'github' not in text.lower():
                    console_errors.append({"type": msg.type, "text": text[:150]})

        page.on("response", lambda r: asyncio.create_task(log_response(r)))
        page.on("console", lambda m: log_console(m))

        print("="*60)
        print("开始测试模块1：用户认证")
        print("="*60)

        # ===== 测试1.1: 游客登录流程 =====
        print("\n[测试1.1] 游客登录流程")
        try:
            await page.goto("http://localhost:50112/todo-for-ai/pages")
            await page.wait_for_timeout(2000)

            # 检查是否在登录页
            if await page.locator('text=Guest Mode Login').count() > 0:
                print("  ✓ 未登录状态，显示登录页面")

                # 点击游客登录
                await page.click('text=Guest Mode Login')
                await page.wait_for_timeout(3000)

                # 验证跳转
                current_url = page.url
                if '/todo-for-ai/pages' in current_url and 'login' not in current_url:
                    print("  ✓ 游客登录成功，已跳转到主页")
                    test_results.append({"test": "游客登录", "result": "PASS"})
                else:
                    print(f"  ✗ 登录后未正确跳转，当前URL: {current_url}")
                    test_results.append({"test": "游客登录", "result": "FAIL", "error": f"URL: {current_url}"})
            else:
                print("  ? 可能已登录或页面结构变化")
                test_results.append({"test": "游客登录", "result": "UNKNOWN"})
        except Exception as e:
            print(f"  ✗ 测试失败: {e}")
            test_results.append({"test": "游客登录", "result": "ERROR", "error": str(e)})

        # 截图
        await page.screenshot(path='/Users/cc11001100/github/todo-for-ai/todo-for-ai/test-results/auth-01-guest-login.png')

        # ===== 测试1.2: Token刷新机制 =====
        print("\n[测试1.2] Token刷新机制")
        try:
            # 等待token刷新服务启动
            await page.wait_for_timeout(2000)
            # 检查localStorage中的token
            token = await page.evaluate('() => localStorage.getItem("access_token")')
            if token:
                print(f"  ✓ Token存在于localStorage")
                test_results.append({"test": "Token存在", "result": "PASS"})
            else:
                print("  ✗ Token不存在于localStorage")
                test_results.append({"test": "Token存在", "result": "FAIL"})
        except Exception as e:
            print(f"  ✗ 测试失败: {e}
            test_results.append({"test": "Token机制", "result": "ERROR", "error": str(e)})

        # ===== 测试1.3: 登出功能 =====
        print("\n[测试1.3] 登出功能")
        try:
            # 点击用户菜单
            await page.click('[data-testid="user-menu"]')
            await page.wait_for_timeout(500)

            # 点击登出
            if await page.locator('text=Logout').count() > 0:
                await page.click('text=Logout')
                await page.wait_for_timeout(2000)

                # 验证返回登录页
                if 'login' in page.url or await page.locator('text=Login').count() > 0:
                    print("  ✓ 登出成功，返回登录页面")
                    test_results.append({"test": "登出功能", "result": "PASS"})
                else:
                    print(f"  ✗ 登出后未返回登录页，当前URL: {page.url}")
                    test_results.append({"test": "登出功能", "result": "FAIL"})
            else:
                print("  ? 未找到登出按钮")
                test_results.append({"test": "登出功能", "result": "UNKNOWN"})
        except Exception as e:
            print(f"  ✗ 测试失败: {e}")
            test_results.append({"test": "登出功能", "result": "ERROR", "error": str(e)})

        # 截图
        await page.screenshot(path='/Users/cc11001100/github/todo-for-ai/todo-for-ai/test-results/auth-02-logout.png')

        # ===== 测试1.4: 未认证访问保护 =====
        print("\n[测试1.4] 未认证访问保护")
        try:
            # 清除token
            await page.evaluate('() => localStorage.clear()')
            await page.goto("http://localhost:50112/todo-for-ai/pages/projects")
            await page.wait_for_timeout(2000)

            # 验证是否重定向到登录页
            if 'login' in page.url or await page.locator('text=Login').count() > 0 or await page.locator('text=Guest Mode Login').count() > 0:
                print("  ✓ 未认证访问被正确重定向到登录页")
                test_results.append({"test": "未认证保护", "result": "PASS"})
            else:
                print(f"  ✗ 未认证访问未被保护，当前URL: {page.url}")
                test_results.append({"test": "未认证保护", "result": "FAIL"})
        except Exception as e:
            print(f"  ✗ 测试失败: {e}")
            test_results.append({"test": "未认证保护", "result": "ERROR", "error": str(e)})

        await browser.close()

        return test_results, network_errors, console_errors

if __name__ == "__main__":
    results, net_errors, cons_errors = asyncio.run(test_auth_module())

    print("\n" + "="*60)
    print("测试完成 - 用户认证模块")
    print("="*60)

    passed = sum(1 for r in results if r.get("result") == "PASS")
    failed = sum(1 for r in results if r.get("result") == "FAIL")
    errors = sum(1 for r in results if r.get("result") == "ERROR")

    print(f"\n总计: {len(results)} 个测试")
    print(f"  ✓ 通过: {passed}")
    print(f"  ✗ 失败: {failed}")
    print(f"  ⚠ 错误: {errors}")

    print("\n详细结果:")
    for r in results:
        status = r.get("result", "UNKNOWN")
        symbol = "✓" if status == "PASS" else "✗" if status == "FAIL" else "⚠"
        print(f"  [{symbol}] {r['test']}: {status}")
        if "error" in r:
            print(f"      详情: {r['error']}")

    # 保存结果
    with open("/Users/cc11001100/github/todo-for-ai/todo-for-ai/test-results/auth-module-results.json", "w") as f:
        json.dump({
            "module": "用户认证",
            "results": results,
            "network_errors": net_errors,
            "console_errors": cons_errors,
            "summary": {"total": len(results), "passed": passed, "failed": failed, "errors": errors}
        }, f, indent=2, ensure_ascii=False)

    print("\n结果已保存到 test-results/auth-module-results.json")
