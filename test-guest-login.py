import asyncio
import json
from playwright.async_api import async_playwright

async def test_guest_login():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        # 收集所有网络请求和响应
        network_errors = []
        console_errors = []
        api_calls = []

        async def handle_response(response):
            url = response.url
            status = response.status
            # 记录所有API调用
            if 'localhost:50110/todo-for-ai/api' in url:
                api_calls.append({
                    "url": url,
                    "status": status
                })
            # 只记录4xx/5xx错误
            if status >= 400 and 'localhost:50110' in url:
                network_errors.append({
                    "url": url,
                    "status": status,
                    "statusText": response.status_text
                })

        def handle_console(msg):
            msg_type = msg.type
            text = msg.text
            # 过滤掉GitHub相关的错误
            if msg_type == "error" and 'github' not in text.lower() and 'rate limit' not in text.lower():
                console_errors.append({
                    "type": msg_type,
                    "text": text[:200]
                })

        page.on("response", lambda response: asyncio.create_task(handle_response(response)))
        page.on("console", lambda msg: handle_console(msg))
        page.on("pageerror", lambda error: console_errors.append({
            "type": "pageerror",
            "text": str(error)[:200]
        }))

        print("=== Testing Guest Login Flow ===\n")

        # 1. 访问首页
        print("1. Opening homepage...")
        await page.goto("http://localhost:50111/todo-for-ai/pages")
        await page.wait_for_timeout(2000)

        # 2. 点击游客登录
        print("2. Clicking Guest Mode Login...")
        try:
            # 根据截图，按钮文字是 "Guest Mode Login"
            await page.click('text=Guest Mode Login')
            print("   Clicked Guest Mode Login button")
        except Exception as e:
            print(f"   Error clicking: {e}")
            # 尝试其他选择器
            try:
                await page.click('button:has-text("Guest")')
                print("   Clicked button with 'Guest' text")
            except:
                pass

        # 等待回调和跳转
        await page.wait_for_timeout(5000)

        # 3. 截图登录后状态
        await page.screenshot(path='/Users/cc11001100/github/todo-for-ai/todo-for-ai/frontend-test-after-login.png')
        print("3. Screenshot saved to frontend-test-after-login.png")

        # 4. 检查当前URL
        current_url = page.url
        print(f"4. Current URL: {current_url}")

        # 5. 如果登录成功，测试其他页面
        if 'login' not in current_url.lower():
            print("\n5. Testing authenticated pages...")

            pages_to_test = [
                ("Dashboard", "/todo-for-ai/pages"),
                ("Projects", "/todo-for-ai/pages/projects"),
                ("Organizations", "/todo-for-ai/pages/organizations"),
            ]

            for name, url_path in pages_to_test:
                try:
                    full_url = f"http://localhost:50111{url_path}"
                    print(f"   - Navigating to {name}...")
                    await page.goto(full_url)
                    await page.wait_for_timeout(3000)
                except Exception as e:
                    print(f"     Error: {e}")

        # 等待一段时间收集所有请求
        await page.wait_for_timeout(2000)

        await browser.close()

        return network_errors, console_errors, api_calls, current_url

if __name__ == "__main__":
    network_errors, console_errors, api_calls, final_url = asyncio.run(test_guest_login())

    # 保存结果到文件
    with open("/Users/cc11001100/github/todo-for-ai/todo-for-ai/frontend-test-guest-login.json", "w") as f:
        json.dump({
            "network_errors": network_errors,
            "console_errors": console_errors,
            "api_calls": api_calls,
            "final_url": final_url
        }, f, indent=2)

    print("\n" + "="*60)
    print("=== Guest Login Test Results ===")
    print("="*60)

    print(f"\nFinal URL: {final_url}")

    print(f"\nAPI Calls Made: {len(api_calls)}")
    for api in api_calls[-10:]:  # 显示最后10个
        print(f"  [{api['status']}] {api['url'][:70]}...")

    print(f"\nNetwork Errors (4xx/5xx): {len(network_errors)}")
    for log in network_errors:
        print(f"  [{log['status']}] {log['url']}")

    print(f"\nConsole Errors (non-GitHub): {len(console_errors)}")
    for log in console_errors:
        print(f"  [{log['type']}] {log['text'][:100]}...")

    print("\n" + "="*60)
    print("Results saved to frontend-test-guest-login.json")
