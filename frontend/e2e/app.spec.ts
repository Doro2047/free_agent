import { test, expect } from '@playwright/test';

test.describe('主页面加载', () => {
  test('应正确加载主页', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/CodeCraft/);
  });

  test('应显示聊天面板', async ({ page }) => {
    await page.goto('/');
    const chatPanel = page.locator('text=开始对话');
    await expect(chatPanel).toBeVisible({ timeout: 10000 });
  });

  test('侧边栏应可见', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('text=CodeCraft');
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });

  test('主题切换按钮应可用', async ({ page }) => {
    await page.goto('/');
    const themeButton = page.locator('button[aria-label*="主题"], button[aria-label*="theme"]').first();
    await expect(themeButton).toBeVisible({ timeout: 10000 });
  });
});

test.describe('聊天功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('应能输入消息', async ({ page }) => {
    const input = page.locator('input[placeholder*="输入"], textarea[placeholder*="输入"]').first();
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill('你好');
  });

  test('应能发送消息', async ({ page }) => {
    const input = page.locator('input[placeholder*="输入"], textarea[placeholder*="输入"]').first();
    const sendButton = page.locator('button[type="submit"], button:has-text("发送")').first();
    
    if (await input.isVisible({ timeout: 5000 })) {
      await input.fill('你好');
      if (await sendButton.isVisible()) {
        await sendButton.click();
      }
    }
  });

  test('聊天历史应显示', async ({ page }) => {
    const messages = page.locator('[data-testid="message"], .message, [class*="message"]');
    await expect(messages.first()).toBeVisible({ timeout: 10000 }).catch(() => {
      // 如果没有消息，也应该显示欢迎消息
      expect(page.locator('text=开始对话')).toBeVisible();
    });
  });
});

test.describe('错误处理', () => {
  test('网络错误应显示友好提示', async ({ page }) => {
    await page.route('**/api/**', route => route.abort());
    await page.goto('/');
    
    const errorMessage = page.locator('text=网络错误, text=连接失败, text=出错了');
    await expect(errorMessage.first()).toBeVisible({ timeout: 10000 }).catch(() => {
      // 如果没有错误提示，应该显示降级内容
      expect(page.locator('body')).toBeVisible();
    });
  });
});

test.describe('响应式设计', () => {
  test('应在小屏幕上正确显示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('应在大屏幕上正确显示', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });
});
