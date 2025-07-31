import { zodResolver } from "@hookform/resolvers/zod";
import FooterFigure from "@shared/assets/backgrounds/footer-figure.svg?react";
import { AuthFooter } from "@shared/components/auth/AuthFooter";
import { AuthHeader } from "@shared/components/auth/AuthHeader";
import { EnhancedSocialLoginButtons } from "@shared/components/auth/EnhancedSocialLoginButtons";
import { TabNavigation } from "@shared/components/auth/TabNavigation";
import { useRateLimiter } from "@shared/hooks/useRateLimiter";
import { useSwipeGesture } from "@shared/hooks/useSwipeGesture";
import AuthLayout from "@shared/layouts/AuthLayout";
import { signInSchema, type SignInFormData } from "@shared/utils/authSchemas";
import {
  hashForLogging,
  logSecurityEvent,
  sanitizeErrorMessage,
  secureErrorMessages,
  errorHints,
} from "@shared/utils/securityUtils";
import { ErrorWithHints } from "@shared/components/auth/ErrorWithHints";
import { LoadingButton } from "@shared/components/auth/LoadingButton";
import { AuthPageWrapper } from "@shared/components/auth/AuthPageWrapper";
import { AuthFormWrapper } from "@ui/components/auth-forms";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { EmailInput, PasswordInput } from "@ui/components/form-inputs";
import { useToast } from "@ui/hooks/use-toast";
import { cn } from "@ui/lib/utils";
import { AlertCircle, Mail, User } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

export default function SignIn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [authMode, setAuthMode] = useState<"social" | "email">("social");
  const { toast } = useToast();

  const { checkRateLimit, recordAttempt, clearAttempts, remainingAttempts } =
    useRateLimiter("login");

  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
    watch,
    setValue,
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const watchEmail = watch("email");

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

  const getErrorHints = (error: string): string[] | undefined => {
    // Map error messages to hints
    if (error.includes("Invalid email or password")) {
      return errorHints.invalidCredentials.hints;
    }
    if (error.includes("locked")) {
      return errorHints.accountLocked.hints;
    }
    if (error.includes("too many attempts") || error.includes("Too many attempts")) {
      return errorHints.tooManyAttempts.hints;
    }
    if (error.includes("Network error")) {
      return errorHints.networkError.hints;
    }
    return undefined;
  };

  const onSubmit = async (data: SignInFormData) => {
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
        type: "login_attempt",
        email: hashForLogging(data.email),
      });

      // TODO: Implement actual authentication
      // For now, simulate a login
      await new Promise((resolve, reject) =>
        setTimeout(() => {
          // Simulate random success/failure for demo
          if (Math.random() > 0.5) {
            resolve(true);
          } else {
            reject(new Error("Invalid credentials"));
          }
        }, 1000)
      );

      // Clear attempts on successful login
      clearAttempts(data.email);

      // Log successful login
      logSecurityEvent({
        type: "login_success",
        email: hashForLogging(data.email),
      });

      // Show success toast
      toast({
        variant: "success",
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });

      // Get redirect URL from query params or default to /app
      const redirectURL = searchParams.get("redirectURL") || "/app";
      navigate(redirectURL);
    } catch (error) {
      // Use secure error message
      const errorMessage = sanitizeErrorMessage(error);
      setGeneralError(errorMessage);

      // Log failed attempt
      logSecurityEvent({
        type: "login_failure",
        email: hashForLogging(data.email),
        details: { remainingAttempts },
      });

      // Shake animation handled by AuthFormWrapper

      // Show remaining attempts if getting low
      if (remainingAttempts > 0 && remainingAttempts <= 2) {
        setGeneralError(
          `${errorMessage} (${remainingAttempts} attempt${
            remainingAttempts === 1 ? "" : "s"
          } remaining)`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (
    provider: "facebook" | "google" | "apple"
  ) => {
    try {
      // TODO: Implement social login
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      toast({
        variant: "success",
        title: "Welcome back!",
        description: `Successfully signed in with ${provider}.`,
      });
      
      const redirectURL = searchParams.get("redirectURL") || "/app";
      navigate(redirectURL);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: `Could not sign in with ${provider}. Please try again.`,
      });
      setGeneralError(`${provider} login failed`);
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
        <AuthHeader rightContent={<></>} />

        {/* Content */}
        <div className="relative z-10 flex flex-1 items-start sm:items-center justify-center px-0 sm:px-6 pb-4 sm:pb-8 pt-2 sm:pt-4">
          <div className="w-full sm:max-w-md animate-scaleIn">
            <div className="bg-transparent sm:bg-white rounded-none sm:rounded-xl sm:shadow-xl p-4 sm:p-6 lg:p-8 sm:border sm:border-gray-100">
              {/* Icon */}
              <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-purple-100 shadow-sm mb-3 sm:mb-4">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>

              {/* Compact Header */}
              <div className="text-center mb-4 sm:mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                  Welcome back!
                </h1>
                <p className="mt-1 text-sm text-gray-700">
                  Sign in to continue
                </p>
              </div>

              {/* Tab Navigation */}
              <TabNavigation
                tabs={[
                  { id: "social", label: "Quick Sign In" },
                  { id: "email", label: "Email" }
                ]}
                activeTab={authMode}
                onTabChange={(tabId) => setAuthMode(tabId as "social" | "email")}
                className="mb-6 sm:mb-4"
              />

              {/* Animated Content */}
              <div className="relative h-auto sm:h-[230px]" ref={swipeRef}>
                {/* Social Login Tab */}
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
                  <div className="space-y-1 mt-2 sm:mt-0">
                    <EnhancedSocialLoginButtons
                      onFacebookLogin={() => handleSocialLogin("facebook")}
                      onGoogleLogin={() => handleSocialLogin("google")}
                      onAppleLogin={() => handleSocialLogin("apple")}
                    />

                    <p className="text-center text-sm text-gray-500 mt-6">
                      Secure, one-click sign in
                    </p>
                  </div>
                </div>

                {/* Email Login Tab */}
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
                      formId="signin-form"
                      onSubmit={handleSubmit(onSubmit)}
                      isLoading={isLoading}
                      className="mt-0"
                    >
                      <div className="space-y-1">
                        <EmailInput
                          label="Email address"
                          {...register("email")}
                          error={errors.email?.message}
                          touched={touchedFields.email}
                          autoComplete="email"
                          icon={<Mail className="w-4 h-4" />}
                          aria-label="Email address"
                          placeholder="Enter your email"
                        />

                        <PasswordInput
                          label="Password"
                          {...register("password")}
                          error={errors.password?.message}
                          touched={touchedFields.password}
                          autoComplete="current-password"
                          showIcon
                          aria-label="Password"
                          placeholder="Enter your password"
                        />

                        {generalError && (
                          <ErrorWithHints 
                            error={generalError}
                            hints={getErrorHints(generalError)}
                          />
                        )}

                        <div className="py-1 flex items-center justify-between ">
                          <div className="flex items-center">
                            <Checkbox
                              id="remember"
                              {...register("rememberMe")}
                              className="h-4 w-4"
                            />
                            <label
                              htmlFor="remember"
                              className="ml-2 text-sm text-gray-700 cursor-pointer"
                            >
                              Remember me
                            </label>
                          </div>
                          <Link
                            to="/forgot-password"
                            className="text-sm text-primary-600 hover:text-primary-500 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 rounded"
                          >
                            Forgot your password?
                          </Link>
                        </div>
                      </div>

                      <LoadingButton
                        type="submit"
                        isLoading={isLoading}
                        loadingText="Signing in..."
                        className="mt-6 w-full h-12 bg-primary-500 hover:bg-primary-600 text-white text-base font-semibold rounded-xl transition-all transform hover:scale-[1.02] hover:shadow-lg"
                      >
                        Sign in
                      </LoadingButton>
                    </AuthFormWrapper>
                  </div>
                </div>
              </div>

              {/* Sign up link */}
              <p className="mt-6 text-center text-sm sm:text-base text-gray-700">
                Don't have an account?{" "}
                <Link
                  to="/sign-up"
                  className="font-medium text-primary-600 hover:text-primary-500 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 rounded"
                >
                  Sign up
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
