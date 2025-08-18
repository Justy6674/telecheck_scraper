import puppeteer from 'puppeteer';

console.log('🧪 TEST: Click into a disaster and extract ALL data');

async function testDisasterClick() {
  const browser = await puppeteer.launch({
    headless: false, // Show browser for testing
    defaultViewport: null
  });

  try {
    const page = await browser.newPage();
    
    console.log('📄 Loading DisasterAssist...');
    await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Wait for table
    await page.waitForSelector('table tbody tr', { timeout: 30000 });
    
    // Get first disaster from table
    const firstDisaster = await page.evaluate(() => {
      const row = document.querySelector('table tbody tr');
      const cells = row.querySelectorAll('td');
      
      return {
        startDate: cells[0]?.textContent?.trim(),
        endDate: cells[1]?.textContent?.trim(),
        state: cells[2]?.textContent?.trim(),
        type: cells[3]?.textContent?.trim(),
        eventName: cells[4]?.textContent?.trim(),
        agrn: cells[5]?.textContent?.trim(),
        detailLink: cells[5]?.querySelector('a')?.href || cells[4]?.querySelector('a')?.href
      };
    });
    
    console.log('📊 First disaster from table:', firstDisaster);
    
    if (firstDisaster.detailLink) {
      console.log('🔗 Clicking into disaster detail page...');
      await page.goto(firstDisaster.detailLink, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      
      // Extract ALL data from detail page
      const detailData = await page.evaluate(() => {
        const data = {
          title: document.querySelector('h1')?.textContent?.trim(),
          affectedAreas: [],
          dates: {},
          description: '',
          metadata: {}
        };
        
        // Try to find affected areas/LGAs
        const areaSelectors = [
          '.affected-areas li',
          '.lga-list li',
          '.areas li',
          '[class*="area"] li',
          '[class*="lga"] li'
        ];
        
        for (const selector of areaSelectors) {
          const areas = document.querySelectorAll(selector);
          if (areas.length > 0) {
            data.affectedAreas = Array.from(areas).map(el => el.textContent.trim());
            break;
          }
        }
        
        // Look for any lists that might contain LGAs
        if (data.affectedAreas.length === 0) {
          const allLists = document.querySelectorAll('ul li, ol li');
          allLists.forEach(li => {
            const text = li.textContent.trim();
            // Check if it looks like an LGA name
            if (text.includes('Council') || text.includes('Shire') || 
                text.includes('City') || text.includes('Region')) {
              data.affectedAreas.push(text);
            }
          });
        }
        
        // Get any date information
        const datePatterns = document.body.innerText.match(/\d{1,2}\/\d{1,2}\/\d{4}/g);
        if (datePatterns) {
          data.dates.found = datePatterns;
        }
        
        // Get description/details
        const descSelectors = [
          '.description',
          '.details',
          '.content',
          'main p'
        ];
        
        for (const selector of descSelectors) {
          const desc = document.querySelector(selector);
          if (desc) {
            data.description = desc.textContent.trim();
            break;
          }
        }
        
        // Get any other metadata
        document.querySelectorAll('dt, dd').forEach((el, i, arr) => {
          if (el.tagName === 'DT' && arr[i+1]?.tagName === 'DD') {
            data.metadata[el.textContent.trim()] = arr[i+1].textContent.trim();
          }
        });
        
        return data;
      });
      
      console.log('✅ EXTRACTED DETAIL DATA:');
      console.log('Title:', detailData.title);
      console.log('Affected Areas/LGAs:', detailData.affectedAreas);
      console.log('Dates found:', detailData.dates);
      console.log('Description:', detailData.description?.substring(0, 200));
      console.log('Metadata:', detailData.metadata);
      
      // Take screenshot as proof
      await page.screenshot({ path: 'disaster-detail-page.png', fullPage: true });
      console.log('📸 Screenshot saved: disaster-detail-page.png');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

testDisasterClick();