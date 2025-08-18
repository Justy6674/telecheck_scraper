# TeleCheck - Production Architecture

## Platform Overview

**TeleCheck** (telecheck.com.au) is a production-ready SaaS platform providing real-time verification of Australian natural disaster zones for telehealth MBS exemptions. Healthcare practitioners can instantly verify if patients are located in government-declared disaster areas, removing the standard "established clinical relationship" requirement for telehealth services.

### Business Model
- **Free Tier**: Public postcode searches (100 requests/hour)
- **Professional Tier**: $149/month - 500 verifications, dashboard access, compliance notes
- **Enterprise Tier**: $399/month - High-volume APIs, practice management integration

### Current Implementation Status

#### ✅ **Completed Components**
- **Supabase Database**: Full PostgreSQL schema with RLS policies, real-time subscriptions
- **Authentication System**: Practice-focused registration with JWT tokens
- **Core Verification Engine**: Real-time postcode disaster lookup with MBS-compliant documentation
- **Medical UI/UX**: Healthcare-grade design system with accessibility compliance
- **Dashboard**: Real-time disaster monitoring, compliance tracking, usage analytics

#### 🚧 **In Development**
- **Government Data Integration**: Automated scraping from DisasterAssist.gov.au (760+ disasters)
- **Railway Scraper Service**: Daily Puppeteer scraping of all disaster pages
- **Complete LGA Extraction**: All affected areas with assistance program details
- **Practice Management APIs**: Integration with Medical Director, Best Practice, Cliniko
- **AI Compliance Assistant**: Advanced note generation and policy guidance
- **Interactive Disaster Map**: Real-time visualization of declarations

## Technical Architecture

### Frontend Stack (Lovable.dev)
```typescript
// Component Architecture
- React 18 with TypeScript
- Tailwind CSS with medical design system
- Shadcn/ui components with healthcare variants
- React Query for server state management
- Supabase real-time subscriptions
```

### Backend Infrastructure (Supabase)
```sql
-- Core Database Schema
disaster_declarations (
  id UUID PRIMARY KEY,
  agrn_reference VARCHAR UNIQUE,  -- e.g., "AGRN-1216"
  event_name TEXT,                -- Full disaster name
  lga_code VARCHAR,               -- Primary LGA
  disaster_type, severity_level,
  declaration_status, 
  declaration_date, expiry_date,
  
  -- COMPREHENSIVE DATA STORAGE
  affected_areas JSONB,           -- Contains:
    -- all_lgas: ["Brisbane", "Bundaberg", ...]
    -- all_lga_codes: ["31000", "31450", ...]
    -- assistance_programs: {agdrp, dra, loans}
    -- payment_amounts: {adult: 1000, child: 400}
    -- contact_info: {hotline: "180 22 66"}
    -- related_links: [{text, url}]
    -- full_page_text: "Complete content for audit"
  
  source_url TEXT,                -- DisasterAssist page URL
  verification_url TEXT,          -- For practitioner verification
  description TEXT,               -- Full description for copy/paste
  declaration_authority VARCHAR
)

practice_registration (
  id, practice_name, subscription_plan,
  provider_types[], user_id
)

verification_logs (
  id, patient_postcode, provider_type,
  verification_result, compliance_note,
  disaster_declarations
)
```

### API Architecture
```typescript
// RESTful Endpoints
GET  /api/disasters/postcode/{postcode}  // Public verification
POST /api/verifications/batch            // Practitioner bulk check
GET  /api/compliance/templates           // MBS note templates
POST /api/practice/register              // Practice onboarding
```

## Data Sources & Integration

### Government APIs
- **Federal**: disasterassist.gov.au (primary aggregator)
- **NSW**: nsw.gov.au/disaster-recovery (structured HTML tables)
- **QLD**: Queensland Reconstruction Authority
- **VIC**: Emergency Recovery Victoria
- **WA/SA/TAS/NT/ACT**: State emergency management portals

### Data Collection Strategy
- **Morning Sync**: 6 AM AEST - overnight declarations
- **Afternoon Sync**: 2 PM AEST - business hours updates  
- **Evening Sync**: 8 PM AEST - end-of-day declarations
- **Emergency Triggers**: Real-time monitoring for urgent updates

## Compliance Framework

### MBS Telehealth Requirements
- **Disaster Exemption**: Patients in declared areas can access telehealth without 12-month relationship
- **November 2025 NP Rules**: Enhanced compliance for Nurse Practitioners
- **Documentation Standards**: Automated generation of MBS-compliant notes

### Privacy & Security
- **Australian Privacy Act 1988** compliance
- **AES-256 encryption** for health data at rest
- **TLS 1.3** for data in transit
- **7-year retention** for clinical records
- **OAIC notification** procedures for data breaches

## Deployment Architecture

### Current Setup (Lovable + Supabase)
```yaml
Frontend: Lovable.dev managed hosting
Database: Supabase PostgreSQL (Sydney region)
Auth: Supabase Auth with RLS policies
Real-time: Supabase subscriptions
CDN: Global edge distribution
```

### Production Migration Plan (Vercel + Supabase)
```yaml
Frontend: Vercel (Sydney/Melbourne edges)
API: Vercel serverless functions
Database: Supabase Pro (Australian hosting)
Monitoring: Vercel Analytics + Sentry
Payments: Stripe with Australian tax compliance
```

## Monitoring & Performance

### Key Metrics
- **API Response Time**: <200ms P95 for disaster lookups
- **System Uptime**: 99.9% SLA target
- **Data Freshness**: <5 minutes from government declaration
- **Verification Accuracy**: >99.5% success rate

### Business Metrics
- **Monthly Verifications**: Tracking usage growth
- **Practitioner Adoption**: Registration and retention rates
- **Revenue per Customer**: Subscription tier optimization
- **Support Ticket Volume**: Platform usability metrics

## Risk Management

### Technical Risks
- **Government Website Changes**: Multi-source validation, manual override capabilities
- **Traffic Spikes**: Auto-scaling infrastructure, CDN caching
- **Data Quality**: Continuous validation, real-time monitoring

### Business Risks
- **Regulatory Changes**: Legal counsel review, policy monitoring
- **Competition**: Feature differentiation, market positioning
- **Customer Churn**: Usage analytics, proactive support

## Roadmap & Scaling

### Phase 1: Foundation (Current)
- ✅ Core verification engine
- ✅ Basic practitioner dashboard
- ✅ MBS compliance documentation
- 🚧 Government data integration

### Phase 2: Growth (Q2 2025)
- Practice management system APIs
- Advanced analytics dashboard
- Mobile app for field practitioners
- Bulk verification capabilities

### Phase 3: Scale (Q3 2025)
- AI-powered compliance assistant
- Predictive disaster modeling
- White-label partner solutions
- International expansion (NZ, UK)

### Infrastructure Scaling Targets
- **1M+ monthly verifications** by end 2025
- **5,000+ registered practices** across Australia
- **Sub-100ms response times** globally
- **99.99% uptime** for enterprise customers

## Resource Requirements

### Development Team
- **Lead Developer**: Full-stack architecture and API design
- **Frontend Developer**: React/TypeScript UI components
- **Backend Developer**: Database optimization and integrations
- **DevOps Engineer**: Infrastructure and monitoring

### Monthly Operational Costs
- **Infrastructure**: $5K-15K (Vercel + Supabase)
- **Third-party Services**: $2K-5K (Stripe, monitoring, SMS)
- **Data Sources**: $1K-3K (Premium API access)
- **Support**: $3K-8K (Customer success, legal compliance)

**Total**: $11K-31K monthly, scaling with usage volume

## Disaster Data Scraping System

### Railway Scraper Service (Puppeteer)
**Purpose**: Extract complete disaster data from DisasterAssist.gov.au

#### Data Extraction Process:
1. **Navigate** to disasters list (38+ pages)
2. **Click** into each disaster detail page (760+ disasters)
3. **Extract** comprehensive data:
   - All affected LGAs (not just one)
   - Assistance programs with varying coverage
   - Payment amounts and deadlines
   - Contact information
   - Full page content for audit

#### Extracted Data Structure:
```javascript
{
  agrn_reference: "AGRN-1216",
  event_name: "NSW Severe Weather Event",
  affected_areas: {
    all_lgas: ["Armidale", "Dungog", "Gunnedah", ...],
    all_lga_codes: ["11350", "12700", "13550", ...],
    assistance_programs: {
      agdrp: { lgas: [...], payment: {adult: 1000, child: 400} },
      dra: { lgas: [...], deadline: "2025-09-18" },
      loans: { primary_producer: 75000, small_business: 25000 }
    },
    full_page_text: "[Complete content for legal audit]"
  },
  source_url: "https://disasterassist.gov.au/...",
  verification_url: "https://disasterassist.gov.au/..."
}
```

### Practitioner Interface Output

**Input**: Patient Postcode (e.g., 2337)

**Output for ELIGIBLE**:
```
✅ ELIGIBLE FOR TELEHEALTH
NSW Severe Weather Event (AGRN-1216)
Period: 31 July 2025 onwards
Affected LGA: Armidale

📋 Copy for Medicare:
"Patient in postcode 2337 (Armidale LGA) eligible for 
telehealth under disaster declaration AGRN-1216.
Verify: https://disasterassist.gov.au/..."

[Copy Text] [View Details] [Verify on DisasterAssist]
```

**Output for POSSIBLY ELIGIBLE**:
```
⚠️ POSSIBLY ELIGIBLE (Practitioner Discretion)
Some areas of this LGA are affected.
Please verify specific address eligibility.
```

### Audit & Compliance
Every search stores:
- Practitioner ID
- Postcode searched
- Disasters returned
- Eligibility determined
- Verification URLs provided
- Timestamp and IP address
- Full disaster data snapshot

### Critical Requirements
1. **Accuracy**: Must extract ALL affected LGAs, not just primary
2. **Completeness**: Store entire page content for legal audit
3. **Verification**: Always provide direct DisasterAssist URL
4. **Currency**: Update daily via Railway scraper
5. **Compliance**: 7-year audit trail retention

---

*Last Updated: January 2025*
*Platform Status: MVP Complete, Production Migration In Progress*
*Scraper Status: Tested, Ready for Full 760+ Import*