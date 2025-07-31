import { useState } from "react";
import { EmailInput, EmailInputWithValidation } from "@ui/components/form-inputs";
import { Button } from "@ui/components/button";
import { useToast } from "@ui/hooks/use-toast";
import { Info, CheckCircle, AlertCircle } from "lucide-react";

export default function EmailValidationDemo() {
  const [email1, setEmail1] = useState("");
  const [email2, setEmail2] = useState("");
  const [isValid, setIsValid] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    toast({
      variant: "success",
      title: "Form submitted!",
      description: `Email: ${email2}`,
    });
  };

  const handleValidationChange = (valid: boolean, error?: string) => {
    setIsValid(valid);
    console.log("Validation changed:", { valid, error });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Email Validation Demo
        </h1>

        {/* Feature list */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Info className="w-5 h-5 text-blue-500 mr-2" />
            Features
          </h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
              <span>Debounced validation (400ms delay)</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
              <span>Real-time format validation</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
              <span>Domain typo suggestions (e.g., gmial.com → gmail.com)</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
              <span>Disposable email detection</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
              <span>Loading state during validation</span>
            </li>
          </ul>
        </div>

        {/* Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Standard EmailInput */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Standard EmailInput
            </h3>
            <EmailInput
              label="Email address"
              value={email1}
              onChange={(e) => setEmail1(e.target.value)}
              placeholder="Enter your email"
              helperText="Basic email input without real-time validation"
            />
          </div>

          {/* Enhanced EmailInput */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Enhanced EmailInput
            </h3>
            <EmailInputWithValidation
              label="Email address"
              value={email2}
              onChange={(e) => setEmail2(e.target.value)}
              onValidationChange={handleValidationChange}
              placeholder="Enter your email"
              helperText="With debounced validation and suggestions"
              touched={true}
            />
          </div>
        </div>

        {/* Test scenarios */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Test Scenarios
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => setEmail2("test@gmial.com")}
              className="block w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
            >
              <strong>Typo:</strong> test@gmial.com → Suggests gmail.com
            </button>
            <button
              onClick={() => setEmail2("user@tempmail.com")}
              className="block w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
            >
              <strong>Disposable:</strong> user@tempmail.com → Warning shown
            </button>
            <button
              onClick={() => setEmail2("invalid.email")}
              className="block w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
            >
              <strong>Invalid:</strong> invalid.email → Shows error
            </button>
            <button
              onClick={() => setEmail2("valid@example.com")}
              className="block w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
            >
              <strong>Valid:</strong> valid@example.com → Shows success
            </button>
          </div>
        </div>

        {/* Form submission */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Form Example
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <EmailInputWithValidation
              label="Your email"
              value={email2}
              onChange={(e) => setEmail2(e.target.value)}
              onValidationChange={handleValidationChange}
              placeholder="Enter your email to continue"
              required
              touched={true}
            />
            
            <Button 
              type="submit" 
              disabled={!isValid || !email2}
              className="w-full"
            >
              Submit
            </Button>
          </form>
          
          {isValid && email2 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Email is valid and ready to submit
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}