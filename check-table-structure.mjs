#!/usr/bin/env node

import puppeteer from 'puppeteer';

async function checkTable() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
    waitUntil: 'networkidle0'
  });
  
  await page.waitForSelector('table', { timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check first 5 rows
  const tableData = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr');
    const data = [];
    
    for (let i = 0; i < 5 && i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      const rowData = {
        cellCount: cells.length,
        cells: []
      };
      
      cells.forEach((cell, idx) => {
        rowData.cells.push({
          index: idx,
          text: cell.textContent?.trim(),
          hasLink: !!cell.querySelector('a')
        });
      });
      
      data.push(rowData);
    }
    
    return data;
  });
  
  console.log('TABLE STRUCTURE:');
  console.log(JSON.stringify(tableData, null, 2));
  
  await browser.close();
}

checkTable().catch(console.error);