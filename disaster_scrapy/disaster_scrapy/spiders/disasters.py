import scrapy
import hashlib
import os
from datetime import datetime
import json

class DisasterSpider(scrapy.Spider):
    name = 'disasters_medicare'
    allowed_domains = ['disasterassist.gov.au']
    start_urls = ['https://www.disasterassist.gov.au/find-a-disaster/australian-disasters']
    
    custom_settings = {
        'DOWNLOAD_DELAY': 2,
        'CONCURRENT_REQUESTS': 1,
        'RETRY_TIMES': 5,
        'DUPEFILTER_CLASS': 'scrapy.dupefilters.RFPDupeFilter',
        'LOG_LEVEL': 'INFO',
        'USER_AGENT': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'ITEM_PIPELINES': {
            'disaster_scrapy.pipelines.ValidationPipeline': 100,
            'disaster_scrapy.pipelines.SupabasePipeline': 200,
            'disaster_scrapy.pipelines.AuditPipeline': 300,
        }
    }
    
    def __init__(self, mode='full', *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.disasters_found = set()
        self.pages_crawled = 0
        self.mode = mode  # 'full' or 'rescrape' (only those without end dates)
        self.existing_with_end_dates = set()
        
        # If rescrape mode, load existing disasters with end dates to skip
        if self.mode == 'rescrape':
            self.load_existing_disasters()
    
    def load_existing_disasters(self):
        """Load existing disasters with end dates to skip during rescrape"""
        from supabase import create_client
        url = 'https://sfbohkqmykagkdmggcxw.supabase.co'
        key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y'
        
        supabase = create_client(url, key)
        
        # Get all disasters with end dates
        result = supabase.table('disaster_declarations').select('agrn_reference').not_.is_('expiry_date', 'null').execute()
        
        if result.data:
            for item in result.data:
                self.existing_with_end_dates.add(item['agrn_reference'])
            self.logger.info(f"Loaded {len(self.existing_with_end_dates)} disasters with end dates to skip")
    
    def parse(self, response):
        """Parse listing page and follow to detail pages"""
        self.pages_crawled += 1
        self.logger.info(f"="*80)
        self.logger.info(f"PARSING PAGE {self.pages_crawled}: {response.url}")
        self.logger.info(f"="*80)
        
        # Wait and check for table
        rows = response.css('table tbody tr')
        
        if not rows:
            self.logger.warning(f"No table rows found, trying alternative selectors...")
            rows = response.xpath('//table//tr[position()>1]')  # Skip header row
        
        disasters_on_page = 0
        new_disasters = 0
        
        for row in rows:
            # Get all cells - try both CSS and XPath
            cells = row.css('td::text').getall()
            if not cells:
                cells = row.xpath('.//td//text()').getall()
            
            # Clean cells
            cells = [c.strip() for c in cells if c.strip()]
            
            # Also get the link from the last cell
            detail_link = row.css('td:last-child a::attr(href)').get()
            if not detail_link:
                detail_link = row.xpath('.//td[last()]//a/@href').get()
            
            # Look for AGRN in the cells
            agrn = None
            for cell in cells:
                if 'AGRN' in cell:
                    agrn = cell
                    break
            
            # If we have valid data, process it
            if len(cells) >= 5 and detail_link and agrn:
                disasters_on_page += 1
                
                # Check if we've seen this AGRN before
                agrn_key = f"AGRN-{agrn.replace(',', '').replace('AGRN-', '')}"
                
                # Skip if we've already processed it in this run
                if agrn_key in self.disasters_found:
                    self.logger.info(f"  Skipping duplicate: {agrn_key}")
                    continue
                
                # In rescrape mode, skip if it has an end date
                if self.mode == 'rescrape' and agrn_key in self.existing_with_end_dates:
                    self.logger.info(f"  Skipping (has end date): {agrn_key}")
                    continue
                
                # Process this disaster
                self.disasters_found.add(agrn_key)
                new_disasters += 1
                
                # Extract to detail page
                yield response.follow(
                    detail_link, 
                    self.parse_disaster,
                    meta={
                        'start_date': cells[0] if len(cells) > 0 else None,
                        'end_date': cells[1] if len(cells) > 1 else None,
                        'state': cells[2] if len(cells) > 2 else None,
                        'type': cells[3] if len(cells) > 3 else None,
                        'name': cells[4] if len(cells) > 4 else None,
                        'agrn': agrn.replace('AGRN-', '').replace(',', '')
                    },
                    dont_filter=True  # Always follow even if seen before
                )
        
        self.logger.info(f"Found {disasters_on_page} disasters on page ({new_disasters} new)")
        self.logger.info(f"Total unique disasters so far: {len(self.disasters_found)}")
        
        # PAGINATION - Try ALL methods
        
        # Method 1: Look for pagination links
        pagination_links = response.css('.pagination a::attr(href)').getall()
        next_page_num = self.pages_crawled + 1
        
        # Method 2: Direct page parameter approach (most reliable)
        if self.pages_crawled < 50:  # Safety limit
            next_url = f"https://www.disasterassist.gov.au/find-a-disaster/australian-disasters?page={self.pages_crawled}"
            self.logger.info(f"📑 Going to next page: {next_url}")
            yield scrapy.Request(
                next_url,
                callback=self.parse,
                dont_filter=True,  # IMPORTANT: Allow revisiting URLs
                meta={'page_num': self.pages_crawled}
            )
        
        # Method 3: Also try following any "Next" links
        next_link = response.xpath('//a[contains(text(), "Next")]/@href').get()
        if not next_link:
            next_link = response.css('a.next::attr(href)').get()
        
        if next_link and self.pages_crawled < 50:
            self.logger.info(f"Also following Next link: {next_link}")
            yield response.follow(next_link, self.parse, dont_filter=True)
    
    def parse_disaster(self, response):
        """Extract complete disaster details"""
        self.logger.info(f"Parsing disaster: {response.meta.get('name', 'Unknown')}")
        
        # Extract ALL LGAs from lists
        all_lgas = []
        
        # Strategy 1: Look for UL lists
        for ul in response.css('ul'):
            items = ul.css('li::text').getall()
            for item in items:
                if self.is_likely_lga(item.strip()):
                    all_lgas.append(item.strip())
        
        # Strategy 2: Look for specific content areas
        content_areas = response.css('.content-area li::text').getall()
        for item in content_areas:
            if self.is_likely_lga(item.strip()):
                all_lgas.append(item.strip())
        
        # Extract assistance details
        assistance_details = {}
        paragraphs = response.css('p::text').getall()
        for para in paragraphs:
            if '$1000' in para and 'adult' in para.lower():
                assistance_details['agdrp_payment'] = {
                    'adult': 1000,
                    'child': 400
                }
            if '180 22 66' in para:
                assistance_details['hotline'] = '180 22 66'
        
        # Extract quick info
        quick_info = {}
        dt_elements = response.css('dt::text').getall()
        dd_elements = response.css('dd::text').getall()
        for i, dt in enumerate(dt_elements):
            if i < len(dd_elements):
                quick_info[dt.strip()] = dd_elements[i].strip()
        
        # Build disaster record
        unique_lgas = list(set(all_lgas))
        
        disaster = {
            'agrn_reference': f"AGRN-{response.meta['agrn'].replace(',', '')}",
            'event_name': response.meta.get('name') or response.css('h1::text').get(),
            'disaster_type': self.map_disaster_type(response.meta.get('type')),
            'state_code': self.map_state_code(response.meta.get('state')),
            'declaration_date': self.parse_date(response.meta.get('start_date')),
            'expiry_date': self.parse_date(response.meta.get('end_date')),
            'all_lgas': unique_lgas,
            'lga_count': len(unique_lgas),
            'assistance_details': assistance_details,
            'quick_info': quick_info,
            'source_url': response.url,
            'scraped_at': datetime.now().isoformat(),
            'checksum': hashlib.md5(response.text.encode()).hexdigest(),
            'page_title': response.css('title::text').get(),
            'description': '\n\n'.join(paragraphs[:3]) if paragraphs else None
        }
        
        self.logger.info(f"✅ Extracted {disaster['agrn_reference']} with {disaster['lga_count']} LGAs")
        
        yield disaster
    
    def is_likely_lga(self, text):
        """Check if text is likely an LGA name"""
        if not text or len(text) < 3 or len(text) > 50:
            return False
        
        exclude_list = [
            'Home', 'Contact', 'About', 'Help', 'Search', 'Menu',
            'Services Australia', 'Skip to', 'PORTFOLIO', 'BORDER',
            'Find a disaster', 'Getting help', 'How to help',
            'Disaster arrangements', 'Key contacts',
            'Web privacy', 'Accessibility', 'Freedom of information',
            'Copyright', 'Privacy', 'Lost or damaged',
            'National Emergency', 'Disaster Recovery Funding',
            'Bushfire', 'Storm', 'Flood', 'Cyclone', 'Drought',
            'Information publication scheme', 'Queensland Reconstruction Authority',
            'NSW Rural Assistance Authority', 'NSW Reconstruction Authority',
            'Emergency assistance grants', 'TasRecovery', 'VicEmergency',
            'Emergency Recovery Victoria', 'Service NSW', 'Recovering from emergencies',
            'Personal hardship', 'Personal and financial counselling',
            'Removal of debris', 'Counter disaster operations',
            'Restoration of essential public assets', 'Freight subsides',
            'Government of South Australia', 'Western Australia Department',
            'Department of Foreign Affairs'
        ]
        
        # Check exclusions
        for exclude in exclude_list:
            if exclude.lower() in text.lower():
                return False
        
        # Check for keywords that indicate not an LGA
        keywords = ['assistance', 'recovery', 'authority', 'department', 'government',
                   'scheme', 'grants', 'operations', 'counselling', 'restoration']
        for keyword in keywords:
            if keyword in text.lower():
                return False
        
        # Basic checks
        if not text[0].isupper():
            return False
        if 'http' in text or 'www' in text or '@' in text:
            return False
            
        return True
    
    def map_disaster_type(self, type_str):
        """Map disaster type to standard categories"""
        if not type_str:
            return 'other'
        
        type_lower = type_str.lower()
        if 'flood' in type_lower:
            return 'flood'
        elif 'fire' in type_lower or 'bushfire' in type_lower:
            return 'bushfire'
        elif 'cyclone' in type_lower:
            return 'cyclone'
        elif 'storm' in type_lower:
            return 'severe_storm'
        elif 'earthquake' in type_lower:
            return 'earthquake'
        elif 'drought' in type_lower:
            return 'drought'
        else:
            return 'other'
    
    def map_state_code(self, state):
        """Map state names to codes"""
        if not state:
            return 'NSW'
            
        state_map = {
            'New South Wales': 'NSW', 'NSW': 'NSW',
            'Victoria': 'VIC', 'VIC': 'VIC',
            'Queensland': 'QLD', 'QLD': 'QLD',
            'South Australia': 'SA', 'SA': 'SA',
            'Western Australia': 'WA', 'WA': 'WA',
            'Tasmania': 'TAS', 'TAS': 'TAS',
            'Northern Territory': 'NT', 'NT': 'NT',
            'Australian Capital Territory': 'ACT', 'ACT': 'ACT'
        }
        
        return state_map.get(state, 'NSW')
    
    def parse_date(self, date_str):
        """Parse date strings to ISO format"""
        if not date_str or date_str.strip() == '' or date_str == 'N/A' or date_str == '- -':
            return None
        
        try:
            from datetime import datetime
            
            # Try different date formats
            formats = [
                '%b %Y',  # Mar 2025
                '%B %Y',  # March 2025
                '%d %b %Y',  # 01 Mar 2025
                '%d %B %Y',  # 01 March 2025
            ]
            
            for fmt in formats:
                try:
                    dt = datetime.strptime(date_str.strip(), fmt)
                    return dt.strftime('%Y-%m-%d')
                except:
                    continue
                    
            # If no format works, return None
            return None
            
        except Exception as e:
            self.logger.warning(f"Could not parse date: {date_str} - {e}")
            return None
    
    def closed(self, reason):
        """Called when spider closes"""
        self.logger.info("="*80)
        self.logger.info(f"SPIDER COMPLETED: {reason}")
        self.logger.info(f"Pages crawled: {self.pages_crawled}")
        self.logger.info(f"Unique disasters found: {len(self.disasters_found)}")
        self.logger.info("="*80)