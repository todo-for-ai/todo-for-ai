import asyncio
import json
from playwright.async_api import async_playwright

async def test_with_detailed_logging():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        # 收集所有网络请求和响应
        all_requests = []
        all_responses = []
        network_errors = []
        console_errors = []

        def handle_request(request):
            url = request.url
            if 'localhost:50110' in url or 'todo-for-ai/api' in url:
                # 获取请求头
                headers = request.headers
                auth_header = headers.get('authorization', 'NOT_PRESENT')
                all_requests.append({
                    "url": url,
                    "method": request.method,
                    "auth_header": auth_header[:50] + "..." if auth_header != 'NOT_PRESENT' else 'NOT_PRESENT'
                })

        async def handle_response(response):
            url = response.url
            status = response.status

            if 'localhost:50110' in url or 'todo-for-ai/api' in url:
                all_responses.append({
                    "url": url,
                    "status": status,
                    "statusText": response.status_text
                })

                if status >= 400:
                    network_errors.append({
                        "url": url,
                        "status": status,
                        "statusText": response.status_text
                    })
                    print(f"  ⚠ API Error: [{status}] {url}")

        def handle_console(msg):
            msg_type = msg.type
            text = msg.text
            if msg_type == "error":
                # 过滤掉GitHub相关的错误
                if 'github' not in text.lower():
                    console_errors.append({
                        "type": msg_type,
                        "text": text[:200]
                    })

        page.on("request", handle_request)
        page.on("response", lambda response: asyncio.create_task(handle_response(response)))
        page.on("console", handle_console)

        print("="*60)
        print("开始详细测试 - Todo for AI Frontend")
        print("="*60)

        # 1. 访问登录页面
        print("\n[1] 访问登录页面...")
        await page.goto("http://localhost:50112/todo-for-ai/pages")
        await page.wait_for_timeout(3000)

        # 2. 点击游客登录
        print("\n[2] 点击游客登录...")
        try:
            await page.click('text=Guest Mode Login')
            print("  ✓ 已点击游客登录按钮")
        except Exception as e:
            print(f"  ✗ 点击失败: {e}")

        # 等待登录完成和token存储 - 延长等待时间
        print("  等待登录完成...")
        await page.wait_for_timeout(8000)

        # 3. 截图查看当前状态
        await page.screenshot(path='/Users/cc11001100/github/todo-for-ai/todo-for-ai/test-results/01-after-guest-login.png')
        print("  ✓ 截图已保存: 01-after-guest-login.png")

        # 检查localStorage中的token
        print("\n[3] 检查localStorage中的token...")
        try:
            token = await page.evaluate("() => localStorage.getItem('auth_token')")
            refresh_token = await page.evaluate("() => localStorage.getItem('refresh_token')")
            print(f"  auth_token: {'存在' if token else '不存在'} ({len(token) if token else 0} 字符)")
            print(f"  refresh_token: {'存在' if refresh_token else '不存在'} ({len(refresh_token) if refresh_token else 0} 字符)")
        except Exception as e:
            print(f"  无法读取localStorage: {e}")

        # 4. 等待Dashboard API调用
        print("\n[4] 等待Dashboard API调用...")
        await page.wait_for_timeout(5000)

        # 5. 导航到Agent管理页面
        print("\n[5] 导航到Agent管理页面...")
        await page.goto("http://localhost:50112/todo-for-ai/pages/agents")
        await page.wait_for_timeout(5000)
        await page.screenshot(path='/Users/cc11001100/github/todo-for-ai/todo-for-ai/test-results/02-agents-page.png')
        print("  ✓ 截图已保存: 02-agents-page.png")

        # 6. 导航到项目管理页面
        print("\n[6] 导航到项目管理页面...")
        await page.goto("http://localhost:50112/todo-for-ai/pages/projects")
        await page.wait_for_timeout(5000)
        await page.screenshot(path='/Users/cc11001100/github/todo-for-ai/todo-for-ai/test-results/03-projects-page.png')
        print("  ✓ 截图已保存: 03-projects-page.png")

        # 7. 导航到任务管理页面
        print("\n[7] 导航到任务管理页面...")
        await page.goto("http://localhost:50112/todo-for-ai/pages/tasks")
        await page.wait_for_timeout(5000)
        await page.screenshot(path='/Users/cc11001100/github/todo-for-ai/todo-for-ai/test-results/04-tasks-page.png')
        print("  ✓ 截图已保存: 04-tasks-page.png")

        # 8. 导航到组织管理页面
        print("\n[8] 导航到组织管理页面...")
        await page.goto("http://localhost:50112/todo-for-ai/pages/organizations")
        await page.wait_for_timeout(5000)
        await page.screenshot(path='/Users/cc11001100/github/todo-for-ai/todo-for-ai/test-results/05-organizations-page.png')
        print("  ✓ 截图已保存: 05-organizations-page.png")

        await browser.close()

        return all_requests, all_responses, network_errors, console_errors

if __name__ == "__main__":
    all_requests, all_responses, network_errors, console_errors = asyncio.run(test_with_detailed_logging())

    print("\n" + "="*60)
    print("测试结果汇总")
    print("="*60)

    # 统计API调用
    status_counts = {}
    for resp in all_responses:
        status = resp['status']
        status_counts[status] = status_counts.get(status, 0) + 1

    print(f"\n总共发出 {len(all_requests)} 个API请求")
    print(f"收到 {len(all_responses)} 个API响应")

    # 显示哪些请求没有收到响应
    req_urls = {r['url'] for r in all_requests}
    resp_urls = {r['url'] for r in all_responses}
    missing_urls = req_urls - resp_urls
    if missing_urls:
        print(f"\n⚠ 缺少响应的请求 ({len(missing_urls)} 个):")
        for url in sorted(missing_urls):
            print(f"  - {url}")

    print("\n响应状态统计:")
    for status in sorted(status_counts.keys()):
        count = status_counts[status]
        symbol = "✓" if status < 400 else "✗"
        print(f"  {symbol} {status}: {count} 个")

    # 显示Authorization头状态
    print("\n请求Authorization头状态:")
    auth_present = sum(1 for r in all_requests if r.get('auth_header') != 'NOT_PRESENT')
    auth_missing = len(all_requests) - auth_present
    print(f"  ✓ 有Authorization头: {auth_present} 个")
    print(f"  ✗ 无Authorization头: {auth_missing} 个")

    if network_errors:
        print(f"\n⚠ 发现 {len(network_errors)} 个网络错误:")
        for err in network_errors:
            print(f"  [{err['status']}] {err['url']}")
    else:
        print("\n✓ 没有发现网络错误 (4xx/5xx)")

    if console_errors:
        print(f"\n⚠ 发现 {len(console_errors)} 个控制台错误 (非GitHub)")
    else:
        print("\n✓ 没有发现控制台错误")

    # 保存详细结果
    with open("/Users/cc11001100/github/todo-for-ai/todo-for-ai/test-results/detailed-test-results.json", "w") as f:
        json.dump({
            "all_requests": all_requests,
            "all_responses": all_responses,
            "network_errors": network_errors,
            "console_errors": console_errors,
            "summary": {
                "total_requests": len(all_requests),
                "total_responses": len(all_responses),
                "error_count": len(network_errors),
                "status_breakdown": status_counts
            }
        }, f, indent=2, ensure_ascii=False)

    print("\n详细结果已保存到: test-results/detailed-test-results.json")
