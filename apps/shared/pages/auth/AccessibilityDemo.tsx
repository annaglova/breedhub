import { useState } from "react";
import { EmailInputWithValidation } from "@ui/components/form-inputs";
import { Button } from "@ui/components/button";
import { useToast } from "@ui/hooks/use-toast";
import { SkipLinks } from "@shared/components/auth/SkipLinks";
import { ScreenReaderAnnouncer, useScreenReaderAnnounce } from "@shared/components/auth/ScreenReaderAnnouncer";
import { ScreenReaderTestPanel } from "@shared/components/auth/ScreenReaderTestPanel";
import { Info, CheckCircle, Keyboard, Eye } from "lucide-react";

export default function AccessibilityDemo() {
  const [email, setEmail] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const { toast } = useToast();
  const { announcePolite, announceAssertive } = useScreenReaderAnnounce();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const message = `Form submitted with email: ${email}`;
    
    // Visual feedback
    toast({
      variant: "success",
      title: "Success!",
      description: message,
    });
    
    // Screen reader announcement
    announcePolite(message);
  };

  const testAutoFill = () => {
    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
    if (emailInput) {
      // Simulate browser autofill
      emailInput.value = "test@example.com";
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      emailInput.style.backgroundColor = "#e8f0fe";
      
      announceAssertive("Email field has been auto-filled");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Skip Links */}
      <SkipLinks 
        links={[
          { id: "skip-to-main", label: "Skip to main content", targetId: "main-content" },
          { id: "skip-to-form", label: "Skip to demo form", targetId: "demo-form" },
          { id: "skip-to-features", label: "Skip to features", targetId: "features-section" },
        ]}
      />

      {/* Screen Reader Test Panel */}
      <ScreenReaderTestPanel defaultOpen={false} />

      {/* Screen Reader Announcer */}
      <ScreenReaderAnnouncer message={announcement} priority="polite" />

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-slate-900">
            Accessibility Features Demo
          </h1>
          <p className="mt-2 text-slate-600">
            Testing auto-fill detection, skip links, and screen reader support
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="max-w-4xl mx-auto px-4 py-8">
        {/* Features Section */}
        <section id="features-section" className="mb-12">
          <h2 className="text-2xl font-semibold text-slate-900 mb-6">
            Implemented Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Auto-fill Detection */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Eye className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="ml-3 text-lg font-medium text-slate-900">
                  Auto-fill Detection
                </h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                  <span>Detects browser auto-fill</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                  <span>Custom styling for auto-filled inputs</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                  <span>Triggers validation on auto-fill</span>
                </li>
              </ul>
            </div>

            {/* Skip Links */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <div className="bg-purple-100 p-3 rounded-full">
                  <Keyboard className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="ml-3 text-lg font-medium text-slate-900">
                  Skip Links
                </h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                  <span>Hidden by default</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                  <span>Visible on focus (Tab key)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                  <span>Jump to main sections</span>
                </li>
              </ul>
            </div>

            {/* Screen Reader Support */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <Info className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="ml-3 text-lg font-medium text-slate-900">
                  Screen Reader
                </h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                  <span>ARIA live regions</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                  <span>Dynamic announcements</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                  <span>Test panel for development</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Demo Form */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-slate-900 mb-6">
            Try It Out
          </h2>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <form id="demo-form" onSubmit={handleSubmit} className="space-y-6">
              <div>
                <EmailInputWithValidation
                  label="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Try typing or use auto-fill"
                  helperText="This input detects browser auto-fill"
                  touched={true}
                  aria-describedby="email-help"
                />
                <p id="email-help" className="mt-2 text-sm text-slate-500">
                  Tab through the page to see skip links, or use the test panel to inspect ARIA attributes.
                </p>
              </div>

              <div className="flex space-x-4">
                <Button type="submit">
                  Submit Form
                </Button>
                <Button type="button" variant="outline" onClick={testAutoFill}>
                  Simulate Auto-fill
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    setAnnouncement("This is a test announcement for screen readers");
                    announcePolite("This is a test announcement for screen readers");
                  }}
                >
                  Test Announcement
                </Button>
              </div>
            </form>
          </div>
        </section>

        {/* Instructions */}
        <section className="bg-blue-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Testing Instructions
          </h2>
          <ol className="space-y-3 text-sm text-slate-700">
            <li>
              <strong>Skip Links:</strong> Press Tab when the page loads to reveal skip links
            </li>
            <li>
              <strong>Auto-fill:</strong> Use your browser's auto-fill or click "Simulate Auto-fill"
            </li>
            <li>
              <strong>Screen Reader:</strong> Click the eye icon in the bottom right to open the test panel
            </li>
            <li>
              <strong>Keyboard Navigation:</strong> Use Tab, Shift+Tab, and Enter to navigate
            </li>
            <li>
              <strong>ARIA Announcements:</strong> Submit the form or click "Test Announcement"
            </li>
          </ol>
        </section>
      </main>
    </div>
  );
}