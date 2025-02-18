import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface RepoData {
    name: string;
    url: string;
    updatedAt: string;
}

interface ScrapedData {
  timestamp: string;
  repositories: RepoData[];
}

// Add test timeout at the top of the file
test.setTimeout(120000); // 2 minutes timeout

test('Scrape GitHub Repositories', async ({ page }) => {
  await page.goto('https://github.com/imhayatunnabi?tab=repositories');
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

  // Ensure directories exist
  const dirPath = path.join(process.cwd());
  fs.mkdirSync(dirPath, { recursive: true });

  const filePath = path.join(dirPath, 'imhayatunnabi-repository.json');
  let existingData: ScrapedData[] = [];
  
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      if (fileContent.trim()) {
        existingData = JSON.parse(fileContent);
      }
    } catch (error) {
      console.log('Error reading existing file, starting fresh:', error.message);
      existingData = [];
    }
  }

  existingData.push(dataToSave);
  fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
  console.log('Repository data saved to imhayatunnabi-repository.json');
});