const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 收集所有网络请求和响应
  const networkLogs = [];
  const errorLogs = [];

  page.on('response', async response => {
    const url = response.url();
    const status = response.status();
    if (status >= 400 || url.includes('api')) {
      networkLogs.push({
        url: url,
        status: status,
        statusText: response.statusText()
      });
    }
  });

  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error') {
      errorLogs.push({
        type: type,
        text: msg.text()
      });
    }
  });

  page.on('pageerror', error => {
    errorLogs.push({
      type: 'pageerror',
      text: error.message
    });
  });

  // 访问前端页面
  await page.goto('http://localhost:50112/todo-for-ai/pages');

  // 等待页面加载
  await page.waitForTimeout(3000);

  // 打印收集到的错误
  console.log('=== Network Errors (4xx/5xx) ===');
  networkLogs.forEach(log => {
    console.log(`${log.status} ${log.url}`);
  });

  console.log('\n=== Console Errors ===');
  errorLogs.forEach(log => {
    console.log(`[${log.type}] ${log.text}`);
  });

  await browser.close();
})();
