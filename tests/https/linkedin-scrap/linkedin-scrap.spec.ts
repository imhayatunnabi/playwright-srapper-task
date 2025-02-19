import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

interface Message {
  sender: string;
  text: string;
  timestamp: string;
}

interface Conversation {
  personName: string;
  messages: Message[];
}

test('LinkedIn Login and Save Session', async ({ page, context }) => {
  await page.goto('https://www.linkedin.com');
  await page.click('[data-test-id="home-hero-sign-in-cta"]');
  await expect(page).toHaveURL('https://www.linkedin.com/login');

  await page.fill('#username', process.env.LINKEDIN_EMAIL || '');
  await page.fill('#password', process.env.LINKEDIN_PASSWORD || '');
  await page.click('button[type="submit"]');

  await page.waitForURL('https://www.linkedin.com/feed/');

  // Click on messaging button and wait for navigation
  await page.waitForSelector('a[href="https://www.linkedin.com/messaging/?"]');
  await page.click('a[href="https://www.linkedin.com/messaging/?"]', { timeout: 60000 });

  
  const conversationSelector = 'li.msg-conversation-listitem';
  await page.waitForSelector(conversationSelector);
  
  const conversations = await page.$$(conversationSelector);
  console.log(`Found ${conversations.length} conversations`);

  // Click through each conversation
  for (const conversation of conversations) {
    await conversation.click();
    await page.waitForTimeout(1000);
  }

  // Continue with session saving code...
  const cookies = await context.cookies();
  const storageState = await context.storageState();

  const sessionPath = path.join(__dirname, 'linkedIn-session');
  
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath);
  }

  fs.writeFileSync(
    path.join(sessionPath, 'cookies.json'),
    JSON.stringify(cookies, null, 2)
  );


  fs.writeFileSync(
    path.join(sessionPath, 'storage-state.json'),
    JSON.stringify(storageState, null, 2)
  );

  console.log('Session data saved successfully!');
});