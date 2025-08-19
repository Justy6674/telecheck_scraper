import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Search, 
  Shield, 
  FileText, 
  CheckCircle,
  ArrowRight,
  Stethoscope,
  Clock,
  Users,
  Target
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const HowToUse = () => {
  const navigate = useNavigate();

  const steps = [
    {
      number: 1,
      title: "Enter Patient Postcode",
      description: "Simply type your patient's postcode into the verification tool",
      icon: Search,
      details: [
        "All Australian postcodes supported",
        "Real-time validation",
        "Instant results in under 3 seconds"
      ]
    },
    {
      number: 2,
      title: "Review Disaster Status",
      description: "Get instant verification of active disaster declarations",
      icon: Shield,
      details: [
        "Current active disasters shown",
        "Declaration dates and authorities",
        "MBS exemption eligibility confirmed"
      ]
    },
    {
      number: 3,
      title: "Generate Compliance Notes",
      description: "Automatically create MBS-compliant documentation",
      icon: FileText,
      details: [
        "Professional notes generated",
        "All required elements included",
        "Copy directly to patient records"
      ]
    },
    {
      number: 4,
      title: "Conduct Telehealth Consultation",
      description: "Proceed with confidence knowing you're fully compliant",
      icon: CheckCircle,
      details: [
        "12-month rule exemption applied",
        "Full audit trail maintained",
        "Professional standards met"
      ]
    }
  ];

  const features = [
    {
      title: "Instant Verification",
      description: "Results in under 3 seconds",
      icon: Clock
    },
    {
      title: "MBS Compliant",
      description: "Meets all Medicare requirements",
      icon: Shield
    },
    {
      title: "Professional Documentation",
      description: "Auto-generated clinical notes",
      icon: FileText
    },
    {
      title: "Multi-Provider Support",
      description: "GPs, specialists, nurse practitioners",
      icon: Users
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

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">How to Use TeleCheck</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Verify disaster telehealth eligibility in 4 simple steps. From postcode to compliance documentation in under 30 seconds.
            </p>
          </div>

          {/* Quick Overview */}
          <Card className="shadow-medical bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Quick Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                {features.map((feature, index) => (
                  <div key={index} className="text-center p-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg mx-auto mb-2">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Step by Step Guide */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">Step-by-Step Guide</h2>
            
            {steps.map((step, index) => (
              <Card key={index} className="shadow-medical">
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-12 h-12 bg-primary rounded-xl text-primary-foreground font-bold text-lg">
                        {step.number}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <step.icon className="h-6 w-6 text-primary" />
                        <h3 className="text-xl font-semibold">{step.title}</h3>
                      </div>
                      <p className="text-muted-foreground mb-4">{step.description}</p>
                      <div className="grid gap-2">
                        {step.details.map((detail, detailIndex) => (
                          <div key={detailIndex} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="text-sm">{detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex justify-center mt-6">
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Example Workflow */}
          <Card className="shadow-medical">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                Example Workflow
              </CardTitle>
              <CardDescription>
                See how TeleCheck works in a real scenario
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <h4 className="font-semibold mb-2">Scenario: Patient in Flood-Affected Area</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  A patient in Ballina (2478) needs a telehealth consultation but has never seen you before. 
                  Here's how TeleCheck helps:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5">1</Badge>
                    <div>
                      <p className="text-sm"><strong>Enter postcode:</strong> Type "2478" into TeleCheck</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5">2</Badge>
                    <div>
                      <p className="text-sm"><strong>Instant result:</strong> "Active disaster declaration - Flood (AGRN 1212)"</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5">3</Badge>
                    <div>
                      <p className="text-sm"><strong>Documentation:</strong> Copy auto-generated MBS-compliant note to patient record</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5">4</Badge>
                    <div>
                      <p className="text-sm"><strong>Consultation:</strong> Proceed with telehealth consultation, fully compliant</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips for Best Practice */}
          <Card className="shadow-medical">
            <CardHeader>
              <CardTitle>Best Practice Tips</CardTitle>
              <CardDescription>
                Maximise the benefits of TeleCheck for your practice
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="font-semibold">Before Consultation</h4>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Verify postcode at booking time</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Check declaration is still active</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Prepare compliance documentation</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold">During Consultation</h4>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Confirm patient's current location</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Add clinical notes as usual</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Include disaster verification reference</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center pt-6 space-y-4">
            <p className="text-muted-foreground">Ready to streamline your disaster telehealth compliance?</p>
            <div className="flex items-center justify-center gap-4">
              <Button onClick={() => navigate("/")} className="bg-gradient-primary">
                Try TeleCheck Now
              </Button>
              <Button variant="outline" onClick={() => navigate("/faq")}>
                View FAQ
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowToUse;