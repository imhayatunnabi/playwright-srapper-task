import { test, expect, BrowserContextOptions } from '@playwright/test';
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

test.setTimeout(120000);

test('LinkedIn Login and Save Session', async ({ browser }) => {
  const cookiesPath = path.join(__dirname, 'linkedIn-session', 'cookies.json');
  const storageStatePath = path.join(__dirname, 'linkedIn-session', 'storage-state.json');

  let sessionValid = false;
  let contextOptions: BrowserContextOptions = {};

  if (fs.existsSync(storageStatePath)) {
    contextOptions.storageState = storageStatePath;
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  try {
    // Check if session is still valid
    await page.goto('https://www.linkedin.com/feed/');
    await page.waitForSelector('a[href="https://www.linkedin.com/messaging/?"]', { timeout: 10000 });
    sessionValid = true;
  } catch (error) {
    console.log('Stored session is not valid, logging in again.');
  }

  if (!sessionValid) {
    await page.goto('https://www.linkedin.com');
    await page.click('[data-test-id="home-hero-sign-in-cta"]');
    await expect(page).toHaveURL('https://www.linkedin.com/login');

    await page.fill('#username', process.env.LINKEDIN_EMAIL || '');
    await page.fill('#password', process.env.LINKEDIN_PASSWORD || '');
    await page.click('button[type="submit"]');

    await page.waitForURL('https://www.linkedin.com/feed/');

    // Save new session data
    const storageState = await context.storageState();

    const sessionPath = path.join(__dirname, 'linkedIn-session');

    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath);
    }

    fs.writeFileSync(
      path.join(sessionPath, 'storage-state.json'),
      JSON.stringify(storageState, null, 2)
    );

    console.log('New session data saved successfully!');
  }

  await page.click('a[href="https://www.linkedin.com/messaging/?"]', { timeout: 60000 });

  const conversationSelector = 'li.msg-conversation-listitem';
  await page.waitForSelector(conversationSelector);
  const conversationListSelector = '.msg-conversations-container__conversations-list';
  await page.waitForSelector(conversationListSelector);

  const allConversations: Conversation[] = [];
  let hasMoreConversations = true;
  let batchNumber = 0;
  let previousLength = 0;
  let retryCount = 0;
  const MAX_RETRIES = 3;

  const totalConversationsCount = await page.evaluate(() => {
    return document.querySelectorAll('li.msg-conversation-listitem').length;
  });
  console.log(`Found ${totalConversationsCount} total conversations`);

  while (hasMoreConversations) {
    try {
      const conversations = await page.$$(conversationSelector);
      const startIndex = batchNumber * 5;
      const endIndex = Math.min(startIndex + 5, conversations.length);

      console.log(`Processing batch ${batchNumber + 1}, conversations ${startIndex + 1} to ${endIndex}`);

      for (let i = startIndex; i < endIndex; i++) {
        try {
          const conversation = conversations[i];

          let scrollSuccess = false;
          for (let scrollAttempt = 0; scrollAttempt < 3 && !scrollSuccess; scrollAttempt++) {
            try {
              await page.evaluate((element) => {
                element.scrollIntoView({ behavior: 'auto', block: 'center' });
              }, conversation);
              scrollSuccess = true;
            } catch (error) {
              console.log(`Scroll attempt ${scrollAttempt + 1} failed, retrying...`);
              await page.waitForTimeout(1000);
            }
          }

          if (!scrollSuccess) {
            console.log(`Skipping conversation ${i} due to scroll failure`);
            continue;
          }

          await page.waitForTimeout(1000);

          let clickSuccess = false;
          for (let clickAttempt = 0; clickAttempt < 3 && !clickSuccess; clickAttempt++) {
            try {
              await conversation.click({ timeout: 5000 });
              clickSuccess = true;
            } catch (error) {
              console.log(`Click attempt ${clickAttempt + 1} failed, retrying...`);
              await page.waitForTimeout(1000);
            }
          }

          if (!clickSuccess) {
            console.log(`Skipping conversation ${i} due to click failure`);
            continue;
          }

          const personNameElement = await conversation.$('.msg-conversation-listitem__participant-names');
          const personName = await personNameElement?.textContent() || 'Unknown';

          try {
            const messagesContainer = await page.waitForSelector('.msg-s-message-list', { timeout: 5000 });
            if (messagesContainer) {
              let lastHeight = 0;
              let scrollAttempts = 0;
              const MAX_SCROLL_ATTEMPTS = 5;

              while (scrollAttempts < MAX_SCROLL_ATTEMPTS) {
                try {
                  const currentHeight = await page.evaluate(() => {
                    const container = document.querySelector('.msg-s-message-list');
                    if (container) {
                      container.scrollTop = 0;
                      return container.scrollHeight;
                    }
                    return 0;
                  });

                  if (currentHeight === lastHeight) {
                    break;
                  }

                  lastHeight = currentHeight;
                  await page.waitForTimeout(1000);
                  scrollAttempts++;
                } catch (error) {
                  console.log('Scrolling messages failed:', error);
                  break;
                }
              }
            }
          } catch (error) {
            console.log('Messages container not found, skipping conversation');
            continue;
          }

          try {
            await page.waitForSelector('li.msg-s-message-list__event', { timeout: 5000 });
            const messageElements = await page.$$('li.msg-s-message-list__event');
            const messages: Message[] = [];

            for (const messageElement of messageElements) {
              try {
                const [sender, text, timestamp] = await Promise.all([
                  messageElement.$eval('.msg-s-message-group__name', el => el.textContent?.trim() || 'Unknown')
                    .catch(() => 'Unknown'),
                  messageElement.$eval('.msg-s-event-listitem__body', el => el.textContent?.trim() || '')
                    .catch(() => ''),
                  messageElement.$eval('.msg-s-message-group__timestamp', el => el.textContent?.trim() || '')
                    .catch(() => '')
                ]);

                if (text) {
                  messages.push({ sender, text, timestamp });
                }
              } catch (error) {
                console.log('Error processing individual message:', error);
                continue;
              }
            }

            if (messages.length > 0) {
              allConversations.push({
                personName: personName.trim(),
                messages: messages
              });
            }
          } catch (error) {
            console.log('Error processing messages for conversation:', error);
            continue;
          }
        } catch (error) {
          console.log(`Error processing conversation ${i}:`, error);
          retryCount++;
          if (retryCount > MAX_RETRIES) {
            console.log(`Skipping conversation ${i} due to max retries reached`);
            continue;
          }
        }
      }

      const beforeScrollHeight = await page.evaluate(selector => {
        const container = document.querySelector(selector);
        return container?.scrollHeight || 0;
      }, conversationListSelector);

      for (let scrollAttempt = 0; scrollAttempt < 3; scrollAttempt++) {
        await page.evaluate(selector => {
          const container = document.querySelector(selector);
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        }, conversationListSelector);
        await page.waitForTimeout(2000);
      }

      const afterScrollHeight = await page.evaluate(selector => {
        const container = document.querySelector(selector);
        return container?.scrollHeight || 0;
      }, conversationListSelector);

      const currentConversations = await page.$$(conversationSelector);

      if (afterScrollHeight <= beforeScrollHeight && currentConversations.length === previousLength) {
        console.log('No new conversations loaded, reached the end');
        hasMoreConversations = false;
      }

      previousLength = currentConversations.length;
      batchNumber++;
      console.log(`Total conversations found: ${currentConversations.length}`);
    } catch (error) {
      console.log(`Error processing batch:`, error);
      retryCount++;
      if (retryCount > MAX_RETRIES) {
        console.log(`Skipping batch due to max retries reached`);
        hasMoreConversations = false;
      }
    }
  }

  const conversationsPath = path.join(__dirname, 'linkedIn-session', 'conversations.json');
  fs.writeFileSync(
    conversationsPath,
    JSON.stringify(allConversations, null, 2)
  );

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

  console.log('Session data and conversations saved successfully!');
});