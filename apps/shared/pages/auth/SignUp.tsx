import { zodResolver } from "@hookform/resolvers/zod";
import FooterFigure from "@shared/assets/backgrounds/footer-figure.svg?react";
import { AuthButton } from "@shared/components/auth/AuthButton";
import { AuthFooter } from "@shared/components/auth/AuthFooter";
import { AuthHeader } from "@shared/components/auth/AuthHeader";
import { EnhancedSocialLoginButtons } from "@shared/components/auth/EnhancedSocialLoginButtons";
import { PasswordStrength } from "@shared/components/auth/PasswordStrength";
import { LoadingButton } from "@shared/components/auth/LoadingButton";
import { AuthPageWrapper } from "@shared/components/auth/AuthPageWrapper";
import { TabNavigation } from "@shared/components/auth/TabNavigation";
import { useRateLimiter } from "@shared/hooks/useRateLimiter";
import { useSwipeGesture } from "@shared/hooks/useSwipeGesture";
import AuthLayout from "@shared/layouts/AuthLayout";
import { signUpSchema, type SignUpFormData } from "@shared/utils/authSchemas";
import {
  hashForLogging,
  logSecurityEvent,
  sanitizeErrorMessage,
  secureErrorMessages,
} from "@shared/utils/securityUtils";
import { AuthFormWrapper } from "@ui/components/auth-forms";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import {
  EmailInputWithValidation,
  PasswordInput,
  TextInput,
} from "@ui/components/form-inputs";
import { useToast } from "@ui/hooks/use-toast";
import { cn } from "@ui/lib/utils";
import { AlertCircle, Mail, User, UserPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

export default function SignUp() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"social" | "email">("social");
  const [generalError, setGeneralError] = useState("");
  const { toast } = useToast();

  const { checkRateLimit, recordAttempt } = useRateLimiter("registration");

  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
    watch,
    setValue,
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      agreements: false,
    },
  });

  const watchPassword = watch("password");

  // Swipe gesture handlers
  const swipeRef = useSwipeGesture<HTMLDivElement>({
    onSwipeLeft: () => {
      if (authMode === "social") {
        setAuthMode("email");
      }
    },
    onSwipeRight: () => {
      if (authMode === "email") {
        setAuthMode("social");
      }
    },
  });

  const onSubmit = async (data: SignUpFormData) => {
    setGeneralError("");

    // Check rate limit first
    const rateLimitCheck = checkRateLimit(data.email);
    if (!rateLimitCheck.allowed) {
      setGeneralError(
        rateLimitCheck.message || secureErrorMessages.tooManyAttempts
      );
      logSecurityEvent({
        type: "rate_limit",
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
        type: "registration",
        email: hashForLogging(data.email),
      });

      // TODO: Implement actual registration
      await new Promise((resolve) =>
        setTimeout(() => {
          // Simulate success for demo
          resolve(true);
        }, 1000)
      );

      toast({
        variant: "success",
        title: "Account created!",
        description: "Please check your email to confirm your account.",
      });

      navigate("/confirmation-required");
    } catch (error) {
      // Use secure error message
      const errorMessage = sanitizeErrorMessage(error);
      setGeneralError(errorMessage);

      // Shake animation handled by AuthFormWrapper
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignUp = async (
    provider: "facebook" | "google" | "apple"
  ) => {
    try {
      // TODO: Implement social sign up
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      toast({
        variant: "success",
        title: "Account created!",
        description: `Successfully signed up with ${provider}.`,
      });
      
      navigate("/confirmation-required");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: `Could not sign up with ${provider}. Please try again.`,
      });
      setGeneralError(`${provider} sign up failed`);
    }
  };

  return (
    <AuthPageWrapper>
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
              <span className="hidden text-gray-700 sm:block">
                Already have an account?
              </span>
              <AuthButton to="/sign-in">Sign in</AuthButton>
            </div>
          }
        />

        {/* Content */}
        <div className="relative z-10 flex flex-1 items-start sm:items-center justify-center px-0 sm:px-6 pb-4 sm:pb-8 pt-2 sm:pt-4">
          <div className="w-full sm:max-w-md animate-scaleIn">
            <div className="bg-transparent sm:bg-white rounded-none sm:rounded-xl sm:shadow-xl p-4 sm:p-6 lg:p-8 sm:border sm:border-gray-100">
              {/* Icon */}
              <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-purple-100 shadow-sm mb-3 sm:mb-4">
                <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>

              {/* Compact Header */}
              <div className="text-center mb-4 sm:mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                  Let's get started!
                </h1>
                <p className="mt-1 text-sm text-gray-700">
                  Create your account to begin
                </p>
              </div>

              {/* Tab Navigation */}
              <TabNavigation
                tabs={[
                  { id: "social", label: "Quick Sign Up" },
                  { id: "email", label: "Email" }
                ]}
                activeTab={authMode}
                onTabChange={(tabId) => setAuthMode(tabId as "social" | "email")}
                className="mb-6 sm:mb-4"
              />

              {/* Animated Content */}
              <div className="relative h-auto sm:h-[360px]" ref={swipeRef}>
                {/* Social Sign Up Tab */}
                <div
                  id="tabpanel-social"
                  role="tabpanel"
                  aria-labelledby="tab-social"
                  className={cn(
                    "sm:absolute sm:inset-0 transition-all duration-300 ease-in-out flex flex-col justify-center",
                    authMode === "social"
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 -translate-y-4 pointer-events-none sm:absolute hidden"
                  )}
                >
                  <div className="space-y-4 mt-2 sm:mt-0">
                    <EnhancedSocialLoginButtons
                      onFacebookLogin={() => handleSocialSignUp("facebook")}
                      onGoogleLogin={() => handleSocialSignUp("google")}
                      onAppleLogin={() => handleSocialSignUp("apple")}
                      signUpMode
                    />

                    <p className="text-center text-sm text-gray-500 mt-6">
                      Fast, secure account creation
                    </p>
                  </div>
                </div>

                {/* Email Sign Up Tab */}
                <div
                  id="tabpanel-email"
                  role="tabpanel"
                  aria-labelledby="tab-email"
                  className={cn(
                    "sm:absolute sm:inset-0 transition-all duration-300 ease-in-out flex flex-col justify-center",
                    authMode === "email"
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4 pointer-events-none sm:absolute hidden"
                  )}
                >
                  <div className="flex flex-col justify-start h-full pt-0">
                    <AuthFormWrapper
                      formId="signup-form"
                      onSubmit={handleSubmit(onSubmit)}
                      isLoading={isLoading}
                      className="mt-0"
                    >
                      <div className="space-y-1">
                        <TextInput
                          label="Full name"
                          {...register("name")}
                          error={errors.name?.message}
                          touched={touchedFields.name}
                          autoComplete="name"
                          icon={<User className="w-4 h-4" />}
                          aria-label="Full name"
                          placeholder="Enter your full name"
                        />

                        <EmailInputWithValidation
                          label="Email address"
                          {...register("email")}
                          error={errors.email?.message}
                          touched={touchedFields.email}
                          autoComplete="email"
                          icon={<Mail className="w-4 h-4" />}
                          aria-label="Email address"
                          placeholder="Enter your email"
                          showSuggestions={true}
                          validateAsync={true}
                        />

                        <div>
                          <PasswordInput
                            label="Password"
                            {...register("password")}
                            error={errors.password?.message}
                            touched={touchedFields.password}
                            autoComplete="new-password"
                            showIcon
                            aria-label="Password"
                            placeholder="Create a password"
                          />
                          <div className="h-12 mt-2">
                            {watchPassword && (
                              <PasswordStrength password={watchPassword} />
                            )}
                          </div>
                        </div>

                        <div className="space-y-1 pb-1">
                          <div className="flex items-start">
                            <Checkbox
                              id="agreements"
                              {...register("agreements")}
                              className={
                                errors.agreements ? "border-red-500" : ""
                              }
                            />
                            <label
                              htmlFor="agreements"
                              className="ml-2 text-base text-gray-700"
                            >
                              I agree to the{" "}
                              <Link
                                to="/terms-and-conditions"
                                className="text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 rounded"
                              >
                                Terms of Service
                              </Link>{" "}
                              and{" "}
                              <Link
                                to="/privacy-policy"
                                className="text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 rounded"
                              >
                                Privacy Policy
                              </Link>
                            </label>
                          </div>
                          <div className="h-5 ml-6">
                            {errors.agreements && (
                              <p className="text-sm text-red-600 animate-fadeIn">
                                {errors.agreements.message}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {generalError && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md animate-fadeIn">
                          <p className="text-sm text-red-600 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            {generalError}
                          </p>
                        </div>
                      )}

                      <LoadingButton
                        type="submit"
                        isLoading={isLoading}
                        loadingText="Creating account..."
                        className="mt-4 w-full h-12 bg-primary-500 hover:bg-primary-600 text-white text-base font-semibold rounded-xl transition-all transform hover:scale-[1.02] hover:shadow-lg"
                      >
                        Create your account
                      </LoadingButton>
                    </AuthFormWrapper>
                  </div>
                </div>
              </div>

              {/* Sign in link */}
              <p className="mt-6 text-center text-sm sm:text-base text-gray-700">
                Already have an account?{" "}
                <Link
                  to="/sign-in"
                  className="font-medium text-primary-600 hover:text-primary-500 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 rounded"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <AuthFooter />
      </div>
    </AuthLayout>
    </AuthPageWrapper>
  );
}
