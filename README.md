# DisasterCheck AU 🇦🇺

## Australian Telehealth Disaster Verification Service

A comprehensive SaaS platform providing real-time disaster declaration verification, automated MBS compliance documentation, and practice management integration for Australian healthcare providers.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/react-18.3.1-blue.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)
![Supabase](https://img.shields.io/badge/supabase-enabled-green.svg)

---

## 🎯 Problem Statement

Australia's $21.8B telehealth market lacks automated compliance verification for disaster-area eligibility, creating audit risk and administrative burden for 7,000+ GP practices and 2,100+ Nurse Practitioners managing 100+ active natural disaster declarations across multiple states.

**Critical Need**: New November 2025 MBS regulations require stricter telehealth compliance, making automated disaster verification essential for both GPs and Nurse Practitioners.

## 🚀 Key Features

### Core Platform Capabilities

- **🔍 Real-Time Disaster Verification**: Live monitoring across all Australian jurisdictions with sub-500ms response times
- **📋 Automated MBS Compliance**: Provider-specific note generation for GP and NP telehealth consultations
- **👥 Multi-Provider Support**: Seamless handling of mixed GP/NP practices with different rule sets
- **🔄 Practice Management Integration**: Native APIs for Best Practice, MedicalDirector, and Genie
- **🤖 AI-Powered Intelligence**: Natural language queries and compliance risk assessment
- **📊 Comprehensive Audit Trail**: Complete verification history and exemption tracking

### Provider-Specific Features

#### For General Practitioners (GPs)
- Standard MBS telehealth compliance documentation
- Disaster exemption verification for remote consultations
- Mental health telehealth support

#### For Nurse Practitioners (NPs)
- **November 2025 compliance-ready** for stricter clinical relationship rules
- NP-specific disaster exemption templates
- Enhanced documentation for 12-month relationship requirements

## 🏗️ Technology Stack

### Frontend
- **React 18.3.1** with TypeScript
- **Tailwind CSS** for responsive design
- **shadcn/ui** component library
- **Vite** for fast development and building

### Backend & Infrastructure
- **Supabase** - PostgreSQL database with real-time features
- **Row Level Security (RLS)** for data protection
- **Edge Functions** for serverless processing
- **Real-time subscriptions** for live disaster updates

### AI & Data Processing
- **OpenAI GPT-4** integration for intelligent compliance assistance
- **Vector search** with pgvector for semantic queries
- **Automated web scraping** for government disaster declarations

## 🗄️ Database Schema

### Core Tables

#### Disaster Declarations
```sql
CREATE TABLE disaster_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction TEXT NOT NULL, -- 'NSW', 'QLD', 'Federal'
  declaration_type TEXT NOT NULL, -- 'Natural Disaster', 'Emergency'
  lga_codes TEXT[] NOT NULL, -- Affected LGA codes
  postcodes TEXT[] NOT NULL, -- Affected postcodes
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL, -- 'Active', 'Expired', 'Revoked'
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Practice Registration
```sql
CREATE TABLE practice_registration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_name TEXT NOT NULL,
  abn TEXT,
  email TEXT UNIQUE NOT NULL,
  subscription_plan TEXT NOT NULL,
  provider_types TEXT[] NOT NULL, -- 'GP', 'NP', 'Mixed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

#### Verification Logs
```sql
CREATE TABLE verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID REFERENCES practice_registration(id),
  patient_postcode TEXT NOT NULL,
  provider_type TEXT NOT NULL, -- 'GP' or 'NP'
  verification_result BOOLEAN NOT NULL,
  compliance_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  declaration_ids UUID[]
);
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- OpenAI API key (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd disastercheck-au
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure your environment variables:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Database Setup**
   ```bash
   # Run Supabase migrations
   npx supabase db reset
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

### Production Deployment

Deploy to Vercel with Supabase backend:

```bash
npm run build
# Deploy to your preferred platform
```

## 📋 API Documentation

### Core Endpoints

#### Disaster Verification
```typescript
POST /api/verify-disaster
{
  "postcode": "4000",
  "provider_type": "GP" | "NP",
  "practice_id": "uuid"
}

Response:
{
  "eligible": boolean,
  "declarations": DisasterDeclaration[],
  "compliance_note": string,
  "exemption_type": string
}
```

#### Practice Management
```typescript
GET /api/practice/{id}/dashboard
POST /api/practice/register
PUT /api/practice/{id}/settings
```

## 🎯 Target Market

### Primary Customers
- **Nurse Practitioner Clinics**: 1,200+ practices (high-priority due to stricter rules)
- **Mixed GP/NP Practices**: 2,800+ practices with both provider types
- **Small-Medium GP Practices**: 6,300+ practices (1-10 providers)
- **Large Healthcare Networks**: 745+ multi-location practices

### Subscription Plans

| Plan | Price/Month | Target Customers | Key Features |
|------|-------------|------------------|--------------|
| **Starter** | $99 | Small GP practices (≤3 providers) | 500 verifications, basic templates |
| **NP Specialist** | $199 | NP clinics & mixed practices | Unlimited verifications, NP-specific compliance |
| **Professional** | $299 | Medium practices (≤10 providers) | Full feature access, integrations |
| **Enterprise** | $999 | Large practices (unlimited) | Custom workflows, dedicated support |

## 🔐 Security & Compliance

### Healthcare Data Protection
- **SOC 2 Type II** compliance ready
- **HIPAA-equivalent** Australian privacy standards
- **End-to-end encryption** for sensitive data
- **Audit logging** for all system access
- **Role-based access control** (RBAC)

### MBS Compliance Features
- **Real-time regulation updates** tracking
- **Provider-specific rule validation**
- **Automated compliance scoring**
- **Audit-ready documentation**

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- Comprehensive test coverage required
- Security-first development practices

## 📊 Business Metrics

### Financial Projections
- **Year 1 Revenue**: $1.17M AUD
- **Year 3 Revenue**: $5.89M AUD
- **Break-even**: Month 6-8
- **Profit Margin**: 84.9%

### Technical KPIs
- **System Uptime**: >99.9%
- **Response Time**: <500ms
- **Data Accuracy**: >99.5%
- **Customer Churn**: <5% annually

## 📚 Documentation

- [API Reference](docs/api.md)
- [User Guide](docs/user-guide.md)
- [Admin Dashboard](docs/admin.md)
- [Integration Guide](docs/integrations.md)
- [Compliance Manual](docs/compliance.md)

## 📞 Support

### For Healthcare Providers
- **Email**: support@disastercheck.com.au
- **Phone**: 1800-DISASTER
- **Documentation**: docs.disastercheck.com.au

### For Developers
- **GitHub Issues**: Technical problems and feature requests
- **Developer Slack**: Real-time community support
- **API Documentation**: Comprehensive integration guides

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Australian Government**: Open data initiatives enabling real-time verification
- **RACGP & ACNP**: Professional guidance on compliance requirements
- **Healthcare IT Community**: Feedback and feature suggestions
- **Beta Testing Practices**: Early adoption and valuable insights

---

**Built with ❤️ for Australian Healthcare Providers**

*Ensuring telehealth compliance, reducing audit risk, and improving patient access across Australia.*