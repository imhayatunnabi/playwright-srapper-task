import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const {
  GITHUB_USERNAME,
  GITHUB_PASSWORD,
  GITHUB_OTP,
  OUTPUT_FILENAME = 'github-repository.json'
} = process.env;

// Validate required environment variables
if (!GITHUB_USERNAME || !GITHUB_PASSWORD) {
  throw new Error('GITHUB_USERNAME and GITHUB_PASSWORD are required in .env file');
}

interface RepoData {
    name: string;
    url: string;
    updatedAt: string;
}

interface ScrapedData {
  timestamp: string;
  repositories: RepoData[];
}
test('GitHub Sign In and Repository Scraping', async ({ page }) => {
  // Login process
  await page.goto('https://github.com/login');
  await page.fill('input[name="login"]', GITHUB_USERNAME);
  await page.fill('input[name="password"]', GITHUB_PASSWORD);
  await page.click('input[type="submit"]');

  // Handle 2FA if enabled
  if (await page.url().includes('two-factor')) {
    if (!GITHUB_OTP) {
      console.log('2FA is enabled. Please provide OTP via GITHUB_OTP environment variable');
      await page.pause(); // Pause for manual OTP input if not provided
    } else {
      await page.waitForSelector('#app_totp');
      await page.fill('#app_totp', GITHUB_OTP);
    }
  }

  // Wait for successful login
  await page.waitForURL('https://github.com/');

  // Navigate to profile
  await page.click('.AppHeader-user');
  await page.waitForSelector(`a[href="/${GITHUB_USERNAME}"]`);
  await page.click(`a[href="/${GITHUB_USERNAME}"]`);

  // Verify profile and navigate to repositories
  await page.waitForURL(`https://github.com/${GITHUB_USERNAME}`);
  const profileName = await page.locator('.p-nickname.vcard-username').first()
    .evaluate(el => el.textContent?.split('·')[0].trim());
  
//   expect(profileName?.toLowerCase()).toBe(GITHUB_USERNAME.toLowerCase());

  // Scrape repositories
  await page.goto(`https://github.com/${GITHUB_USERNAME}?tab=repositories`);
  const repositories: RepoData[] = [];

  while (true) {
    await page.waitForSelector('a[itemprop="name codeRepository"]');
    const repoElements = await page.locator('a[itemprop="name codeRepository"]').all();
    
    for (const repo of repoElements) {
        console.log(`Scraping repository: ${await repo.allTextContents()}`);
      const name = await repo.textContent();
      const link = await repo.getAttribute('href');
      
      // Find the corresponding time element for this repository
      const timeElement = await repo.evaluate((el: HTMLElement) => {
        const row = el.closest('li');
        const timeEl = row?.querySelector('.no-wrap');
        return timeEl?.getAttribute('title') || '';
      });

      if (name && link) {
        repositories.push({
          name: name.trim(),
          url: `https://github.com${link}`,
          updatedAt: timeElement
        });
        // console.log(`Scraped: ${name.trim()}`);
      }
    }

    // Check if next page button exists and is disabled
    const nextButton = await page.locator('a.next_page');
    const isDisabled = await page.locator('span.next_page.disabled').count() > 0;
    
    if (isDisabled) {
      console.log('Reached last page, ending pagination');
      break;
    }

    const beforeUrl = await page.url();
    console.log('Moving to next page...');
    
    try {
      // Click and wait for navigation
      await Promise.all([
        page.waitForURL('**/*tab=repositories*'),
        nextButton.click()
      ]);
      
      // Wait for repository elements to be visible on the new page
      await page.waitForSelector('a[itemprop="name codeRepository"]', { timeout: 10000 });
      
      // Short delay to ensure content is stable
      await page.waitForTimeout(2000);
      
    } catch (error) {
      console.log('Navigation error:', error.message);
      break;
    }
    
    // Verify page change
    const afterUrl = await page.url();
    if (beforeUrl === afterUrl) {
      console.log('Page URL did not change, ending pagination');
      break;
    }
  }

  const dataToSave: ScrapedData = {
    timestamp: new Date().toISOString(),
    repositories
  };

  // Save data to file
  const filePath = path.join(process.cwd(), OUTPUT_FILENAME);
  let existingData: ScrapedData[] = [];
  
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      if (fileContent.trim()) {
        existingData = JSON.parse(fileContent);
      }
    } catch (error) {
      console.log('Error reading existing file, starting fresh:', error);
    }
  }

  existingData.push(dataToSave);
  fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
  console.log(`Repository data saved to ${OUTPUT_FILENAME}`);
});