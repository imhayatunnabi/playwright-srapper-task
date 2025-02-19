import { test, expect } from '@playwright/test';

test('GitHub Sign In', async ({ page }) => {
  await page.goto('https://github.com/login');
  await page.fill('input[name="login"]', 'imhayatunnabi');
  await page.fill('input[name="password"]', process.env.GITHUB_PASSWORD || 'NabilSSH54#@!');
  await page.click('input[type="submit"]');

  await page.waitForURL('https://github.com/sessions/two-factor/app');
  
  await page.waitForSelector('#app_totp');
  const otpCode = process.env.GITHUB_OTP || '753427';
  await page.fill('#app_totp', otpCode);

  await Promise.race([
    page.waitForURL('https://github.com/'),
  ]);

  await page.click('.AppHeader-user');
  await page.waitForSelector('a[href="/imhayatunnabi"]');
  await page.click('a[href="/imhayatunnabi"]');

  await page.waitForURL('https://github.com/imhayatunnabi');

  const profileNameElement = await page.locator('.p-nickname.vcard-username').first();
  const profileName = await profileNameElement.evaluate(el => {
    return el.textContent?.split('·')[0].trim();
  });
  console.log('Profile Name:', profileName);

  expect(profileName?.toLowerCase()).toBe('imhayatunnabi');
});