import { test, expect } from '@playwright/test';

test('GitHub Sign In', async ({ page }) => {
  await page.goto('https://github.com/login');
  await page.fill('input[name="login"]', 'imhayatunnabi');
  await page.fill('input[name="password"]', process.env.GITHUB_PASSWORD || 'NabilSSH54#@!');
  await page.click('input[type="submit"]');

  // Wait for 2FA page and handle OTP input
  await page.waitForURL('https://github.com/sessions/two-factor/app');
  
  // Wait for OTP input field and fill it
  await page.waitForSelector('#app_totp');
  const otpCode = process.env.GITHUB_OTP || '753427'; // Get OTP from environment variable
  await page.fill('#app_totp', otpCode);

  // Wait for successful authentication
  await Promise.race([
    page.waitForURL('https://github.com/'),
  ]);

  await page.click('.AppHeader-user');
  // Wait for and click the "Your profile" menu item using a more reliable selector
  await page.waitForSelector('a[href="/imhayatunnabi"]');
  await page.click('a[href="/imhayatunnabi"]');

  await page.waitForURL('https://github.com/imhayatunnabi');

  // Update the selector to specifically target only the username text
  const profileNameElement = await page.locator('.p-nickname.vcard-username').first();
  const profileName = await profileNameElement.evaluate(el => {
    // Get only the text content before any special characters or pronouns
    return el.textContent?.split('·')[0].trim();
  });
  console.log('Profile Name:', profileName);

  expect(profileName?.toLowerCase()).toBe('imhayatunnabi');
});