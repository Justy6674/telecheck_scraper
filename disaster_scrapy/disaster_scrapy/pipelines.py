# Define your item pipelines here
import os
import json
from datetime import datetime
from supabase import create_client, Client

class ValidationPipeline:
    """Validate data before saving"""
    
    def process_item(self, item, spider):
        # Validate required fields
        required = ['agrn_reference', 'event_name', 'state_code']
        for field in required:
            if not item.get(field):
                spider.logger.error(f"Missing required field: {field}")
                raise DropItem(f"Missing {field}")
        
        # Validate AGRN format
        if not item['agrn_reference'].startswith('AGRN-'):
            spider.logger.error(f"Invalid AGRN format: {item['agrn_reference']}")
            raise DropItem("Invalid AGRN format")
        
        return item


class SupabasePipeline:
    """Save disasters to Supabase database"""
    
    def __init__(self):
        # Get Supabase credentials from environment
        url = os.environ.get('SUPABASE_URL', 'https://sfbohkqmykagkdmggcxw.supabase.co')
        key = os.environ.get('SUPABASE_SERVICE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm9oa3FteWthZ2tkbWdnY3h3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTMwMjE2OSwiZXhwIjoyMDcwODc4MTY5fQ.ovWfX_c4BHmK0Nn6xb3kSGYh9xxc3gFr5igow_hHK8Y')
        
        self.supabase: Client = create_client(url, key)
        self.saved_count = 0
        self.error_count = 0
        self.errors = []
    
    def process_item(self, item, spider):
        try:
            # Look up primary LGA code
            lga_code = self.get_lga_code(item['state_code'], item.get('all_lgas', []))
            
            # Build database record
            record = {
                'agrn_reference': item['agrn_reference'],
                'event_name': item['event_name'],
                'disaster_type': item.get('disaster_type', 'other'),
                'state_code': item['state_code'],
                'declaration_date': item.get('declaration_date'),
                'expiry_date': item.get('expiry_date'),
                'declaration_status': 'expired' if item.get('expiry_date') else 'active',
                'declaration_authority': 'Australian Government',
                'severity_level': 3,
                'lga_code': lga_code,
                'affected_areas': {
                    'all_lgas': item.get('all_lgas', []),
                    'lga_count': item.get('lga_count', 0),
                    'assistance_details': item.get('assistance_details', {}),
                    'quick_info': item.get('quick_info', {}),
                    'checksum': item.get('checksum'),
                    'extracted_at': item.get('scraped_at')
                },
                'description': item.get('description'),
                'source_url': item.get('source_url'),
                'verification_url': item.get('source_url'),
                'data_source': 'disasterassist.gov.au',
                'source_system': 'Scrapy Primary v1',
                'last_sync_timestamp': datetime.now().isoformat()
            }
            
            # Upsert to database
            result = self.supabase.table('disaster_declarations').upsert(
                record,
                on_conflict='agrn_reference'
            ).execute()
            
            self.saved_count += 1
            
            # Determine telehealth eligibility
            eligibility = "ELIGIBLE FOR TELEHEALTH" if not item.get('expiry_date') else "NOT ELIGIBLE"
            spider.logger.info(
                f"✅ Saved {item['agrn_reference']} with {item.get('lga_count', 0)} LGAs - {eligibility}"
            )
            
        except Exception as e:
            self.error_count += 1
            error_msg = f"Error saving {item.get('agrn_reference', 'unknown')}: {str(e)}"
            self.errors.append(error_msg)
            spider.logger.error(f"❌ {error_msg}")
            
            # Log to audit table
            self.log_error(item, str(e))
        
        return item
    
    def get_lga_code(self, state_code, lgas):
        """Look up LGA code from registry"""
        if not lgas:
            # Return state capital as default
            capitals = {
                'NSW': '17200', 'VIC': '24600', 'QLD': '31000',
                'SA': '40070', 'WA': '57080', 'TAS': '62810',
                'NT': '71000', 'ACT': '89000'
            }
            return capitals.get(state_code, '17200')
        
        try:
            # Try to find first LGA in registry
            result = self.supabase.table('lga_registry').select('lga_code').ilike(
                'lga_name', f'%{lgas[0]}%'
            ).eq('state_code', state_code).limit(1).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]['lga_code']
        except:
            pass
        
        # Return state capital as fallback
        capitals = {
            'NSW': '17200', 'VIC': '24600', 'QLD': '31000',
            'SA': '40070', 'WA': '57080', 'TAS': '62810',
            'NT': '71000', 'ACT': '89000'
        }
        return capitals.get(state_code, '17200')
    
    def log_error(self, item, error):
        """Log errors to audit table for Medicare compliance"""
        try:
            self.supabase.table('scraper_errors').insert({
                'agrn_reference': item.get('agrn_reference'),
                'error_message': error,
                'item_data': json.dumps(dict(item)),
                'occurred_at': datetime.now().isoformat()
            }).execute()
        except:
            pass
    
    def close_spider(self, spider):
        """Called when spider closes"""
        spider.logger.info("="*80)
        spider.logger.info(f"SUPABASE PIPELINE SUMMARY:")
        spider.logger.info(f"Successfully saved: {self.saved_count}")
        spider.logger.info(f"Errors: {self.error_count}")
        
        if self.errors:
            spider.logger.info("ERROR DETAILS:")
            for error in self.errors[:10]:  # Show first 10 errors
                spider.logger.info(f"  - {error}")
        
        # Save audit summary
        try:
            self.supabase.table('scraper_audit').insert({
                'scraper': 'Scrapy Primary v1',
                'disasters_found': self.saved_count,
                'errors': self.error_count,
                'error_details': self.errors[:10] if self.errors else [],
                'completed_at': datetime.now().isoformat()
            }).execute()
        except:
            pass
        
        spider.logger.info("="*80)


class AuditPipeline:
    """Create audit trail for Medicare compliance"""
    
    def __init__(self):
        self.audit_data = []
    
    def process_item(self, item, spider):
        # Record every item for audit
        self.audit_data.append({
            'agrn': item.get('agrn_reference'),
            'name': item.get('event_name'),
            'lgas': item.get('lga_count', 0),
            'has_end_date': bool(item.get('expiry_date')),
            'checksum': item.get('checksum')
        })
        return item
    
    def close_spider(self, spider):
        """Save audit log"""
        audit_file = f"audit_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(audit_file, 'w') as f:
            json.dump({
                'spider': spider.name,
                'started': spider.crawler.stats.get_value('start_time').isoformat(),
                'finished': datetime.now().isoformat(),
                'total_disasters': len(self.audit_data),
                'eligible_for_telehealth': len([d for d in self.audit_data if not d['has_end_date']]),
                'not_eligible': len([d for d in self.audit_data if d['has_end_date']]),
                'disasters': self.audit_data
            }, f, indent=2)
        
        spider.logger.info(f"Audit log saved to: {audit_file}")


# Exception for dropping items
class DropItem(Exception):
    pass
