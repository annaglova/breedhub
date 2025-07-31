import FooterFigure from "@shared/assets/backgrounds/footer-figure.svg?react";
import { AuthFooter } from "@shared/components/auth/AuthFooter";
import { AuthHeader } from "@shared/components/auth/AuthHeader";
import { AuthButton } from "@shared/components/auth/AuthButton";
import AuthLayout from "@shared/layouts/AuthLayout";
import { Button } from "@ui/components/button";
import { useToast } from "@ui/hooks/use-toast";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Spinner } from "@shared/components/auth/Spinner";

export default function ConfirmationRequired() {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const { toast } = useToast();

  const handleResendEmail = async () => {
    setIsResending(true);
    setResendSuccess(false);

    try {
      // TODO: Implement actual resend logic
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setResendSuccess(true);
      
      toast({
        variant: "success",
        title: "Email resent!",
        description: "Check your inbox for the confirmation email.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to resend",
        description: "Unable to resend confirmation email. Please try again later.",
      });
      console.error("Failed to resend email", error);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout>
      <div className="relative flex min-h-screen w-full flex-col">
        {/* Background SVG */}
        <div className="absolute bottom-0 w-full pointer-events-none z-0">
          <FooterFigure className="w-full h-auto" />
        </div>

        {/* Header */}
        <AuthHeader
          rightContent={
            <div className="flex items-center gap-4">
              <span className="hidden text-gray-700 sm:block">Return to</span>
              <AuthButton to="/sign-in">
                Login page
              </AuthButton>
            </div>
          }
        />

        {/* Content */}
        <div className="relative z-10 flex flex-1 items-start sm:items-center justify-center px-0 sm:px-6 pb-4 sm:pb-8 pt-2 sm:pt-4">
          <div className="w-full sm:max-w-md animate-scaleIn">
            <div className="bg-transparent sm:bg-white rounded-none sm:rounded-xl sm:shadow-xl p-4 sm:p-6 lg:p-8 sm:border sm:border-gray-100">
              {/* Icon */}
              <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-purple-100 shadow-sm">
                <svg
                  className="h-5 w-5 sm:w-6 sm:h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
                  />
                </svg>
              </div>

              {/* Title */}
              <div className="mt-3 sm:mt-4 text-center mb-4 sm:mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                  Confirmation required
                </h1>
                <p className="mt-2 sm:mt-3 text-sm sm:text-base text-gray-700">
                  A confirmation mail with instructions has been sent to your
                  email address. Follow those instructions to confirm your email
                  address and activate your account.
                </p>
              </div>

              {/* Tips */}
              <div className="mt-4 sm:mt-6 rounded-lg bg-gray-50 p-3 sm:p-4">
                <h3 className="text-sm sm:text-base font-medium text-gray-900">
                  Didn't receive an email?
                </h3>
                <ul className="mt-2 space-y-1 text-xs sm:text-sm text-gray-700">
                  <li>• Check your spam or junk folder</li>
                  <li>• Verify that you entered the correct email address</li>
                  <li>• Wait a few minutes for the email to arrive</li>
                </ul>
              </div>

              {/* Resend button */}
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={isResending || resendSuccess}
                className="mt-4 sm:mt-6 w-full text-center text-sm sm:text-base text-primary-600 hover:text-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
              >
                {isResending ? (
                  <>
                    <Spinner className="mr-2" />
                    Sending...
                  </>
                ) : resendSuccess ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    Email sent successfully!
                  </>
                ) : (
                  "Resend confirmation email"
                )}
              </button>

              {resendSuccess && (
                <p className="mt-2 text-center text-sm text-green-600 animate-slideDown">
                  Check your inbox for the new confirmation email
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <AuthFooter />
      </div>
    </AuthLayout>
  );
}
