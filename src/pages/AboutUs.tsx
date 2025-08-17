import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  Shield, 
  Users, 
  Award, 
  Target,
  CheckCircle,
  Stethoscope,
  MapPin,
  Calendar,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const AboutUs = () => {
  const navigate = useNavigate();

  const team = [
    {
      name: "Justin Black",
      role: "Founder & Developer",
      expertise: "Nurse Practitioner, Telehealth, SaaS Development",
      description: "Nurse Practitioner in General Practice, Business owner of Downscale Weight Loss Clinic (Telehealth Company), and SaaS developer at JB SaaS"
    }
  ];

  const values = [
    {
      icon: Shield,
      title: "Patient Safety First",
      description: "Every feature designed with patient care and safety as the primary consideration"
    },
    {
      icon: CheckCircle,
      title: "Regulatory Excellence",
      description: "Maintaining the highest standards of MBS compliance and professional accountability"
    },
    {
      icon: Zap,
      title: "Innovation in Healthcare",
      description: "Leveraging technology to solve real problems faced by Australian healthcare providers"
    },
    {
      icon: Users,
      title: "Supporting Practitioners",
      description: "Empowering healthcare professionals with tools that enhance rather than complicate their work"
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
        <div className="space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-bold">About TeleCheck</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              We're Australian healthcare professionals who built TeleCheck to solve a critical gap in disaster 
              response: ensuring patients in declared disaster zones can access telehealth services without barriers.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Badge variant="secondary" className="px-3 py-1">
                <MapPin className="h-3 w-3 mr-1" />
                Australian Founded
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                <Calendar className="h-3 w-3 mr-1" />
                Established 2024
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                <Users className="h-3 w-3 mr-1" />
                Healthcare-Led
              </Badge>
            </div>
          </div>

          {/* Mission Statement */}
          <Card className="shadow-medical bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-center">
                <Target className="h-6 w-6 text-primary" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg text-center leading-relaxed">
                To ensure no Australian patient is denied essential healthcare due to natural disasters by providing 
                healthcare practitioners with instant, reliable verification of disaster telehealth exemptions that 
                meet Medicare Benefits Schedule requirements.
              </p>
            </CardContent>
          </Card>

          {/* The Problem We Solve */}
          <Card className="shadow-medical">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-destructive" />
                The Problem We Solve
              </CardTitle>
              <CardDescription>
                Why TeleCheck exists and the critical gap it fills in Australian healthcare
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                During natural disasters, patients often cannot travel to see their regular GP due to road closures, 
                evacuations, or destroyed infrastructure. However, Medicare's standard telehealth rules require a 
                12-month established relationship before telehealth consultations are permitted.
              </p>
              <p className="text-muted-foreground">
                While disaster exemptions exist, verifying eligibility requires checking multiple government websites, 
                understanding complex declaration boundaries, and ensuring proper documentation. This process can take 
                30+ minutes per patient, creating delays when urgent care is needed most.
              </p>
              <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <h4 className="font-semibold mb-2 text-accent-foreground">TeleCheck's Solution</h4>
                <p className="text-sm">
                  We reduce disaster telehealth verification from 30+ minutes to under 30 seconds, while automatically 
                  generating MBS-compliant documentation. Healthcare providers can focus on patient care, not paperwork.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Our Values */}
          <Card className="shadow-medical">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Our Values
              </CardTitle>
              <CardDescription>
                The principles that guide everything we do
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {values.map((value, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                        <value.icon className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{value.title}</h3>
                      <p className="text-sm text-muted-foreground">{value.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Leadership Team */}
          <Card className="shadow-medical">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Leadership Team
              </CardTitle>
              <CardDescription>
                Healthcare professionals and technology experts committed to improving Australian healthcare delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {team.map((member, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <Stethoscope className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{member.name}</h3>
                        <p className="font-medium text-primary mb-1">{member.role}</p>
                        <p className="text-sm text-muted-foreground mb-2">{member.expertise}</p>
                        <p className="text-sm">{member.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Australian Healthcare Commitment */}
          <Card className="shadow-medical bg-accent/5 border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-accent" />
                Committed to Australian Healthcare
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                TeleCheck is proudly Australian-owned and operated. We understand the unique challenges of healthcare 
                delivery across our vast continent, from bustling capital cities to remote outback communities.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Australian data sovereignty</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Local support team</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Australian Privacy Act compliance</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Integration with Australian systems</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center pt-6">
            <Button onClick={() => navigate("/contact")} className="bg-gradient-primary">
              Get in Touch
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;