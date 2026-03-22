"""
手动测试脚本 - 打开浏览器查看实际效果
"""
import asyncio
from playwright.async_api import async_playwright

async def manual_test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        print("打开登录页面...")
        await page.goto("http://localhost:50112/todo-for-ai/pages")
        await page.wait_for_timeout(2000)

        print("点击游客登录...")
        await page.click('text=Guest Mode Login')
        await page.wait_for_timeout(5000)

        print("登录完成，当前URL:", page.url)

        # 等待用户查看
        print("\n请查看浏览器中的效果。按 Ctrl+C 退出或等待 60 秒...")
        await asyncio.sleep(60)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(manual_test())
