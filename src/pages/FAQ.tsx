import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  HelpCircle, 
  Shield, 
  Clock, 
  FileText, 
  Users, 
  CheckCircle,
  AlertTriangle,
  Stethoscope,
  Phone,
  Mail
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const FAQ = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      category: "Disaster Verification",
      icon: Shield,
      questions: [
        {
          q: "How do I verify if my patient is in a declared disaster zone?",
          a: "Simply enter the patient's postcode into our verification tool. The system checks real-time government disaster declarations and provides instant MBS-compliant verification. You'll receive a detailed report showing active declarations, exemption eligibility, and suggested documentation."
        },
        {
          q: "How frequently is disaster data updated?",
          a: "Our system updates disaster declarations every 15 minutes from official Australian Government sources including DisasterAssist.gov.au and state emergency services. You're always working with the most current information available."
        },
        {
          q: "What if a disaster declaration changes during my consultation?",
          a: "Your verification remains valid for the consultation if it was accurate at the time of verification. We recommend re-checking for ongoing treatment plans. Our system timestamps all verifications for audit purposes."
        }
      ]
    },
    {
      category: "MBS Compliance",
      icon: FileText,
      questions: [
        {
          q: "What documentation do I need for disaster telehealth exemptions?",
          a: "Document the patient's postcode, active disaster declaration reference, verification timestamp, and clinical rationale for telehealth delivery. Our system automatically generates MBS-compliant notes that include all required elements."
        },
        {
          q: "How long do disaster exemptions last?",
          a: "Exemptions remain valid for the entire duration of the official disaster declaration. Some declarations last weeks or months. Our system tracks expiry dates and will alert you when exemptions are approaching their end date."
        },
        {
          q: "Can I use disaster exemptions for any telehealth item number?",
          a: "Yes, disaster exemptions apply to all MBS telehealth item numbers where the service is clinically appropriate. The exemption removes the 12-month established relationship requirement but doesn't change other clinical appropriateness criteria."
        }
      ]
    },
    {
      category: "Technical Support",
      icon: HelpCircle,
      questions: [
        {
          q: "What browsers does TeleCheck support?",
          a: "TeleCheck works on all modern browsers including Chrome, Firefox, Safari, and Edge. We recommend keeping your browser updated for the best experience and security."
        },
        {
          q: "Is my patient data secure?",
          a: "Absolutely. We only process postcodes for verification - no personal health information is stored. All data transmission uses bank-grade encryption (TLS 1.3) and our systems comply with Australian Privacy Act requirements."
        },
        {
          q: "Can I integrate TeleCheck with my practice management system?",
          a: "Yes, we offer APIs for integration with major practice management systems including Medical Director, Best Practice, and Cliniko. Contact our team for implementation assistance."
        }
      ]
    },
    {
      category: "Billing & Subscription",
      icon: Users,
      questions: [
        {
          q: "What's included in the free tier?",
          a: "Free users can perform up to 100 postcode verifications per month. Perfect for occasional use or small practices. Upgrade to Professional for unlimited verifications and advanced features."
        },
        {
          q: "How does billing work for the Professional tier?",
          a: "Professional subscriptions are $149/month with 500 verifications included. Additional verifications are $0.30 each. Billing is monthly with detailed usage reports available in your dashboard."
        },
        {
          q: "Can I cancel my subscription anytime?",
          a: "Yes, you can cancel anytime from your account settings. Your subscription remains active until the end of your billing period, and you can continue using included verifications until then."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-xl shadow-medical">
                <Stethoscope className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary cursor-pointer" onClick={() => navigate("/")}>
                  TeleCheck
                </h1>
                <p className="text-sm text-muted-foreground">Australian Telehealth Disaster Verification</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Frequently Asked Questions</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Everything you need to know about using TeleCheck for MBS-compliant disaster telehealth verification
            </p>
          </div>

          {faqs.map((section, sectionIndex) => (
            <Card key={sectionIndex} className="shadow-medical">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <section.icon className="h-5 w-5 text-primary" />
                  {section.category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {section.questions.map((faq, faqIndex) => (
                    <div key={faqIndex} className="space-y-3">
                      <h3 className="font-semibold text-lg">{faq.q}</h3>
                      <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                      {faqIndex < section.questions.length - 1 && (
                        <div className="border-b border-border my-4"></div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Quick Help */}
          <Card className="shadow-medical bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Need More Help?
              </CardTitle>
              <CardDescription>
                Can't find what you're looking for? Our support team is here to help.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 p-4 border rounded-lg bg-background">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="font-medium">Email Support</h4>
                    <p className="text-sm text-muted-foreground">support@telecheck.com.au</p>
                    <p className="text-xs text-muted-foreground">Response within 24 hours</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 border rounded-lg bg-background">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="font-medium">Phone Support</h4>
                    <p className="text-sm text-muted-foreground">1800 TELECHECK</p>
                    <p className="text-xs text-muted-foreground">Mon-Fri 9am-5pm AEST</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center pt-6">
            <Button onClick={() => navigate("/contact")} className="bg-gradient-primary">
              Still Have Questions? Contact Us
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQ;