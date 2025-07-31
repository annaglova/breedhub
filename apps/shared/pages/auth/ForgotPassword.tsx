import FooterFigure from "@shared/assets/backgrounds/footer-figure.svg?react";
import { AuthFooter } from "@shared/components/auth/AuthFooter";
import { AuthHeader } from "@shared/components/auth/AuthHeader";
import { AuthButton } from "@shared/components/auth/AuthButton";
import { EmailInput } from "@ui/components/form-inputs";
import { AuthFormWrapper } from "@ui/components/auth-forms";
import { useRateLimiter } from "@shared/hooks/useRateLimiter";
import AuthLayout from "@shared/layouts/AuthLayout";
import { secureErrorMessages, logSecurityEvent, hashForLogging } from "@shared/utils/securityUtils";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@shared/utils/authSchemas";
import { Button } from "@ui/components/button";
import { useToast } from "@ui/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { HelpCircle, Mail } from "lucide-react";
import { Spinner } from "@shared/components/auth/Spinner";

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const { toast } = useToast();
  
  const { checkRateLimit, recordAttempt } = useRateLimiter('passwordReset');
  
  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
    watch,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
    },
  });

  const watchEmail = watch("email");

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setGeneralError("");

    // Check rate limit first
    const rateLimitCheck = checkRateLimit(data.email);
    if (!rateLimitCheck.allowed) {
      setGeneralError(rateLimitCheck.message || secureErrorMessages.tooManyAttempts);
      logSecurityEvent({
        type: 'rate_limit',
        email: hashForLogging(data.email),
      });
      toast({
        variant: "destructive",
        title: "Too many attempts",
        description: rateLimitCheck.message || secureErrorMessages.tooManyAttempts,
      });
      return;
    }

    setIsLoading(true);

    try {
      // Record the attempt
      recordAttempt(data.email);
      
      // Log the attempt
      logSecurityEvent({
        type: 'password_reset',
        email: hashForLogging(data.email),
      });

      // TODO: Implement actual password reset
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsSuccess(true);
      
      toast({
        variant: "success",
        title: "Email sent!",
        description: "Check your inbox for password reset instructions.",
      });
    } catch (error) {
      // Always show the same message for security (no user enumeration)
      setGeneralError(secureErrorMessages.resetFailed);
    } finally {
      setIsLoading(false);
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
            {!isSuccess ? (
              <>
                {/* Icon */}
                <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-purple-100 shadow-sm mb-3 sm:mb-4">
                  <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>

                {/* Title */}
                <div className="text-center mb-4 sm:mb-6">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                    Forgot password?
                  </h1>
                  <p className="mt-1 text-sm text-gray-700">
                    Fill the form to reset your password
                  </p>
                </div>

                {/* Form */}
                <AuthFormWrapper 
                  formId="forgot-password-form" 
                  onSubmit={handleSubmit(onSubmit)} 
                  isLoading={isLoading}
                  className="mt-0"
                >
                  <EmailInput
                    label="Email address"
                    {...register("email")}
                    error={errors.email?.message || generalError}
                    touched={touchedFields.email}
                    autoComplete="email"
                    icon={<Mail className="w-4 h-4" />}
                    placeholder="Enter your email"
                    aria-label="Email address"
                  />

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="mt-6 w-full h-12 bg-primary-500 hover:bg-primary-600 text-white text-base font-semibold rounded-xl transition-all transform hover:scale-[1.02] hover:shadow-lg"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <Spinner className="mr-2" />
                        Sending...
                      </div>
                    ) : (
                      "Send reset link"
                    )}
                  </Button>
                </AuthFormWrapper>

                {/* Back to login link */}
                <p className="mt-6 text-center text-sm sm:text-base text-gray-700">
                  Remember your password?{" "}
                  <Link
                    to="/sign-in"
                    className="font-medium text-primary-600 hover:text-primary-500"
                  >
                    Sign in
                  </Link>
                </p>
              </>
            ) : (
              <>
                {/* Success Message */}
                <div className="text-center">
                  <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-green-100 shadow-sm">
                    <svg
                      className="h-5 w-5 sm:w-6 sm:h-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h2 className="mt-3 sm:mt-4 text-xl sm:text-2xl font-bold text-gray-900">
                    Check your email
                  </h2>
                  <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-700">
                    Password reset sent! You'll receive an email if you are registered on our system.
                  </p>
                  <p className="mt-1 text-sm sm:text-base text-gray-500">
                    Sent to: {watchEmail}
                  </p>
                </div>

                <Link to="/sign-in">
                  <Button className="mt-6 sm:mt-8 w-full h-12 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-base font-semibold rounded-xl transition-all">
                    Back to sign in
                  </Button>
                </Link>
              </>
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