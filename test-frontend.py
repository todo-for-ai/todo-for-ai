import asyncio
import json
from playwright.async_api import async_playwright

async def test_frontend():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        # 收集所有网络请求和响应
        network_errors = []
        console_errors = []

        page.on("response", lambda response: asyncio.create_task(
            handle_response(response, network_errors)
        ))

        page.on("console", lambda msg: handle_console(msg, console_errors))

        page.on("pageerror", lambda error: console_errors.append({
            "type": "pageerror",
            "text": str(error)
        }))

        # 访问前端页面
        await page.goto("http://localhost:50111/todo-for-ai/pages")

        # 等待页面加载
        await page.wait_for_timeout(5000)

        # 打印收集到的错误
        print("=== Network Errors (4xx/5xx) ===")
        for log in network_errors:
            print(f"{log['status']} {log['url']}")

        print("\n=== Console Errors ===")
        for log in console_errors:
            print(f"[{log['type']}] {log['text']}")

        # 保持浏览器打开一段时间查看
        await page.wait_for_timeout(3000)

        await browser.close()

        return network_errors, console_errors

async def handle_response(response, network_errors):
    url = response.url
    status = response.status
    if status >= 400 or "api" in url:
        network_errors.append({
            "url": url,
            "status": status,
            "statusText": response.status_text
        })

def handle_console(msg, console_errors):
    msg_type = msg.type
    if msg_type == "error":
        console_errors.append({
            "type": msg_type,
            "text": msg.text
        })

if __name__ == "__main__":
    network_errors, console_errors = asyncio.run(test_frontend())

    # Save results to file
    with open("/Users/cc11001100/github/todo-for-ai/todo-for-ai/frontend-test-results.json", "w") as f:
        json.dump({
            "network_errors": network_errors,
            "console_errors": console_errors
        }, f, indent=2)

    print("\n=== Summary ===")
    print(f"Network errors: {len(network_errors)}")
    print(f"Console errors: {len(console_errors)}")
