import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface TableData {
  timestamp: string;
  tables: string[][][];
}

test('Get Paged Data', async ({ page }) => {
  await page.goto('https://www.exakat.io/the-top-100-php-functions-in-2024/');

  const tables = await page.locator('table').all();
  const tablesData: string[][][] = [];

  for (const table of tables) {
    const rows = await table.locator('tr').all();
    const tableData: string[][] = [];

    for (const row of rows) {
      const cells = await row.locator('td, th').all();
      const rowData: string[] = [];
      
      for (const cell of cells) {
        const text = await cell.textContent() || '';
        rowData.push(text.trim());
      }
      
      if (rowData.length > 0) {
        tableData.push(rowData);
      }
    }
    
    tablesData.push(tableData);
  }

  const dataToSave: TableData = {
    timestamp: new Date().toISOString(),
    tables: tablesData
  };

  const filePath = path.join(process.cwd(), 'the-top-100-php-functions-in-2024.json');
  let existingData: TableData[] = [];
  
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
  console.log('Data saved to the-top-100-php-functions-in-2024.json');

  await page.waitForTimeout(10000);
});