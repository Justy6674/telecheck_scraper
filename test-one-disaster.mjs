import puppeteer from 'puppeteer';

console.log('🎯 TEST ONE RANDOM DISASTER - Extract ALL data\n');

async function testOneDisaster() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
  });

  try {
    const page = await browser.newPage();
    
    console.log('Loading DisasterAssist...');
    await page.goto('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await page.waitForSelector('table tbody tr', { timeout: 30000 });
    
    // Get a random disaster from the table
    const randomDisaster = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      const randomIndex = Math.floor(Math.random() * Math.min(rows.length, 10));
      const row = rows[randomIndex];
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
    
    console.log('=' .repeat(80));
    console.log('📋 RANDOM DISASTER FROM TABLE:');
    console.log('=' .repeat(80));
    console.log('Event Name:', randomDisaster.eventName);
    console.log('AGRN:', randomDisaster.agrn);
    console.log('State:', randomDisaster.state);
    console.log('Type:', randomDisaster.type);
    console.log('Start Date:', randomDisaster.startDate);
    console.log('End Date:', randomDisaster.endDate);
    console.log('Detail URL:', randomDisaster.detailLink);
    
    if (randomDisaster.detailLink) {
      console.log('\n🔗 Clicking into detail page...\n');
      await page.goto(randomDisaster.detailLink, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      
      // Extract EVERYTHING from detail page
      const detailData = await page.evaluate(() => {
        const data = {
          title: document.querySelector('h1')?.textContent?.trim(),
          quickInfo: {},
          affectedLGAs: [],
          assistanceTypes: [],
          relatedLinks: [],
          fullTextSnippet: ''
        };
        
        // Get page title
        data.title = document.querySelector('h1, .page-title, [class*="title"]')?.textContent?.trim();
        
        // Extract Quick Info section (dt/dd pairs)
        const dtElements = document.querySelectorAll('dt');
        const ddElements = document.querySelectorAll('dd');
        for (let i = 0; i < dtElements.length; i++) {
          const key = dtElements[i]?.textContent?.trim();
          const value = ddElements[i]?.textContent?.trim();
          if (key && value) {
            data.quickInfo[key] = value;
          }
        }
        
        // Find LGAs - look for the specific marker text
        const bodyText = document.body.innerText;
        const lgaMarker = 'The above assistance may be available in the following local government area';
        const lgaIndex = bodyText.indexOf(lgaMarker);
        
        if (lgaIndex > -1) {
          // Get text after the marker
          const afterMarker = bodyText.substring(lgaIndex + lgaMarker.length + 10, lgaIndex + lgaMarker.length + 1000);
          
          // Split into lines and clean
          const lines = afterMarker.split(/[\n\r]+/);
          
          for (const line of lines) {
            const cleaned = line.trim();
            // Stop when we hit another section
            if (cleaned.includes('Related Links') || 
                cleaned.includes('assistance') || 
                cleaned.includes('information') ||
                cleaned.includes('●') ||
                cleaned.length === 0) {
              break;
            }
            // This is likely an LGA name
            if (cleaned && cleaned.length > 2 && cleaned.length < 50) {
              data.affectedLGAs.push(cleaned);
            }
          }
        }
        
        // Extract assistance types (bullet points)
        const bullets = document.querySelectorAll('li');
        bullets.forEach(bullet => {
          const text = bullet.textContent?.trim();
          if (text && text.includes('assistance')) {
            data.assistanceTypes.push(text);
          }
        });
        
        // Extract related links
        const links = document.querySelectorAll('a');
        links.forEach(link => {
          const text = link.textContent?.trim();
          const href = link.href;
          if (text && href && !href.includes('javascript') && text.length > 3) {
            data.relatedLinks.push({ text, href });
          }
        });
        
        // Get a text snippet around LGAs
        if (lgaIndex > -1) {
          data.fullTextSnippet = bodyText.substring(Math.max(0, lgaIndex - 100), lgaIndex + 500);
        }
        
        return data;
      });
      
      console.log('=' .repeat(80));
      console.log('📊 EXTRACTED DETAIL PAGE DATA:');
      console.log('=' .repeat(80));
      
      console.log('\n📌 Title:', detailData.title);
      
      console.log('\n📋 Quick Info:');
      Object.entries(detailData.quickInfo).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
      
      console.log('\n🏛️  AFFECTED LGAs (' + detailData.affectedLGAs.length + ' found):');
      if (detailData.affectedLGAs.length > 0) {
        detailData.affectedLGAs.forEach(lga => {
          console.log(`   • ${lga}`);
        });
      } else {
        console.log('   ⚠️ No LGAs found');
      }
      
      console.log('\n💰 Assistance Types:');
      detailData.assistanceTypes.slice(0, 5).forEach(type => {
        console.log(`   • ${type}`);
      });
      
      console.log('\n🔗 Related Links:');
      detailData.relatedLinks.slice(0, 5).forEach(link => {
        console.log(`   • ${link.text}`);
      });
      
      if (detailData.affectedLGAs.length === 0) {
        console.log('\n📄 Text snippet around LGA section:');
        console.log(detailData.fullTextSnippet);
      }
      
      // Take screenshot
      await page.screenshot({ path: 'one-disaster-detail.png', fullPage: true });
      console.log('\n📸 Screenshot saved: one-disaster-detail.png');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    console.log('\n✅ Test complete. Browser will close in 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
  }
}

testOneDisaster();