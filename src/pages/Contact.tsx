import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Send,
  Stethoscope,
  MessageCircle,
  HeadphonesIcon,
  Users,
  Shield,
  CheckCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

const Contact = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organisation: '',
    phone: '',
    subject: '',
    message: '',
    enquiryType: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enquiryTypes = [
    { value: 'general', label: 'General Enquiry' },
    { value: 'technical', label: 'Technical Support' },
    { value: 'billing', label: 'Billing Question' },
    { value: 'integration', label: 'API Integration' },
    { value: 'partnership', label: 'Partnership Opportunity' }
  ];

  const contactMethods = [
    {
      icon: Mail,
      title: 'Email Support',
      description: 'Get help via email',
      contact: 'support@telecheck.com.au',
      hours: 'Response within 24 hours',
      primary: true
    },
    {
      icon: Phone,
      title: 'Phone Support',
      description: 'Speak directly with our team',
      contact: '1800 TELECHECK',
      hours: 'Mon-Fri 9am-5pm AEST',
      primary: false
    },
    {
      icon: MessageCircle,
      title: 'Live Chat',
      description: 'Instant help during business hours',
      contact: 'Available in-app',
      hours: 'Mon-Fri 9am-5pm AEST',
      primary: false
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    setTimeout(() => {
      toast({
        title: "Message Sent",
        description: "We'll get back to you within 24 hours.",
      });
      setFormData({
        name: '',
        email: '',
        organisation: '',
        phone: '',
        subject: '',
        message: '',
        enquiryType: 'general'
      });
      setIsSubmitting(false);
    }, 2000);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-xl shadow-medical">
                <img src="/lovable-uploads/abc23214-492e-40a7-b0d3-c02a00a72b7d.png" alt="TeleCheck logo" className="h-6 w-6 object-contain" />
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

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Get in Touch</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Have questions about TeleCheck? Need technical support? Want to discuss a partnership? 
              We're here to help Australian healthcare providers succeed.
            </p>
          </div>

          {/* Contact Methods */}
          <div className="grid gap-6 md:grid-cols-3">
            {contactMethods.map((method, index) => (
              <Card key={index} className={`shadow-medical ${method.primary ? 'border-primary/50' : ''}`}>
                <CardHeader className="text-center pb-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl mx-auto mb-4">
                    <method.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{method.title}</CardTitle>
                  <CardDescription>{method.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-2">
                  <p className="font-medium">{method.contact}</p>
                  <p className="text-sm text-muted-foreground">{method.hours}</p>
                  {method.primary && (
                    <Badge className="mt-2">Fastest Response</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Contact Form */}
            <Card className="shadow-medical">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  Send us a Message
                </CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as possible
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        required
                        placeholder="Your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        required
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="organisation">Organisation</Label>
                      <Input
                        id="organisation"
                        value={formData.organisation}
                        onChange={(e) => handleChange('organisation', e.target.value)}
                        placeholder="Practice or organisation name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        placeholder="Your phone number"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="enquiryType">Enquiry Type</Label>
                    <select
                      id="enquiryType"
                      value={formData.enquiryType}
                      onChange={(e) => handleChange('enquiryType', e.target.value)}
                      className="w-full p-2 border border-input rounded-md bg-background"
                    >
                      {enquiryTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => handleChange('subject', e.target.value)}
                      required
                      placeholder="Brief description of your enquiry"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => handleChange('message', e.target.value)}
                      required
                      placeholder="Tell us how we can help you..."
                      rows={5}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>Sending...</>
                    ) : (
                      <>
                        Send Message
                        <Send className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Company Info & FAQ */}
            <div className="space-y-6">
              {/* Company Details */}
              <Card className="shadow-medical">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    TeleCheck Australia
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Head Office</p>
                        <p className="text-sm text-muted-foreground">
                          Level 12, 123 Collins Street<br />
                          Melbourne VIC 3000<br />
                          Australia
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Business Hours</p>
                        <p className="text-sm text-muted-foreground">
                          Monday - Friday: 9:00 AM - 5:00 PM AEST<br />
                          Emergency support available 24/7
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Help */}
              <Card className="shadow-medical">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HeadphonesIcon className="h-5 w-5 text-primary" />
                    Quick Help
                  </CardTitle>
                  <CardDescription>
                    Common questions and quick solutions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium text-sm mb-1">Need immediate verification help?</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        Check our How-to-Use guide for step-by-step instructions
                      </p>
                      <Button variant="outline" size="sm" onClick={() => navigate("/how-to-use")}>
                        View Guide
                      </Button>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium text-sm mb-1">Technical issues?</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        Our FAQ covers the most common technical questions
                      </p>
                      <Button variant="outline" size="sm" onClick={() => navigate("/faq")}>
                        View FAQ
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security Notice */}
              <Card className="shadow-medical bg-accent/5 border-accent/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-sm mb-1">Your Privacy is Protected</h4>
                      <p className="text-xs text-muted-foreground">
                        All communications are encrypted and comply with Australian Privacy Act requirements. 
                        We never share your information with third parties.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;