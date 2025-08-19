import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Calendar, 
  FileText, 
  Users, 
  CheckCircle,
  AlertTriangle,
  Clock,
  Stethoscope
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const TelehealthRules = () => {
  const navigate = useNavigate();

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
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Australian Telehealth MBS Rules</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Understanding Medicare Benefits Schedule requirements for telehealth services during natural disasters
            </p>
          </div>

          {/* Emergency Exemption Rules */}
          <Card className="shadow-medical">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-destructive" />
                Disaster Zone Exemptions
              </CardTitle>
              <CardDescription>
                Special telehealth provisions for patients in declared disaster areas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                <h3 className="font-semibold mb-2 text-destructive">Emergency Telehealth Access</h3>
                <p className="text-sm mb-3">
                  Patients located in government-declared natural disaster zones are exempt from the standard 
                  12-month established relationship requirement for telehealth consultations.
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">No prior face-to-face consultation required</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Valid for entire duration of disaster declaration</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Applies to all MBS telehealth item numbers</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Standard Requirements */}
          <Card className="shadow-medical">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Standard Telehealth Requirements
              </CardTitle>
              <CardDescription>
                Normal MBS requirements when disaster exemptions don't apply
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Established Relationship</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Patient must have seen the practitioner (or practice) face-to-face within the last 12 months
                  </p>
                  <Badge variant="outline">12 Month Rule</Badge>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Clinical Appropriateness</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Telehealth must be clinically appropriate for the consultation type
                  </p>
                  <Badge variant="outline">Professional Judgement</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documentation Requirements */}
          <Card className="shadow-medical">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Documentation Requirements
              </CardTitle>
              <CardDescription>
                Essential record-keeping for MBS compliance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-semibold">Required Documentation for Disaster Exemptions:</h3>
                <div className="grid gap-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm">Patient's postcode at time of consultation</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm">Active disaster declaration reference</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm">Date and time of verification</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm">Clinical reason for telehealth delivery</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Provider Types */}
          <Card className="shadow-medical">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Eligible Providers
              </CardTitle>
              <CardDescription>
                Healthcare professionals authorised to use disaster exemptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  'General Practitioners',
                  'Specialists',
                  'Nurse Practitioners',
                  'Practice Nurses',
                  'Aboriginal Health Workers',
                  'Mental Health Professionals',
                  'Allied Health Providers',
                  'Consultant Physicians',
                  'Rural Generalists'
                ].map((provider, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{provider}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Important Notes */}
          <Card className="shadow-medical">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Important Considerations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-amber-800">Professional Services Review</h4>
                    <p className="text-sm text-amber-700">
                      All telehealth services remain subject to standard PSR compliance requirements
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-800">Time Limitations</h4>
                    <p className="text-sm text-blue-700">
                      Disaster exemptions expire when official declarations are lifted
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center pt-6">
            <p className="text-sm text-muted-foreground">
              For the most current MBS guidelines, refer to the Department of Health's official documentation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelehealthRules;