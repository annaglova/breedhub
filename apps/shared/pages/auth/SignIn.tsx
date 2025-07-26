import FooterFigure from "@shared/assets/backgrounds/footer-figure.svg?react";
import { AuthFooter } from "@shared/components/auth/AuthFooter";
import { AuthHeader } from "@shared/components/auth/AuthHeader";
import { FormInput } from "@shared/components/auth/FormInput";
import { SocialLoginButtons } from "@shared/components/auth/SocialLoginButtons";
import { Spinner } from "@shared/components/auth/Spinner";
import { useRateLimiter } from "@shared/hooks/useRateLimiter";
import AuthLayout from "@shared/layouts/AuthLayout";
import { sanitizeErrorMessage, secureErrorMessages, logSecurityEvent, hashForLogging } from "@shared/utils/securityUtils";
import { signInSchema, type SignInFormData } from "@shared/utils/authSchemas";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

export default function SignIn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generalError, setGeneralError] = useState("");
  
  const { checkRateLimit, recordAttempt, clearAttempts, remainingAttempts } = useRateLimiter('login');
  
  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
    watch,
    setValue,
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const watchEmail = watch("email");

  const onSubmit = async (data: SignInFormData) => {
    setGeneralError("");

    // Check rate limit first
    const rateLimitCheck = checkRateLimit(data.email);
    if (!rateLimitCheck.allowed) {
      setGeneralError(rateLimitCheck.message || secureErrorMessages.tooManyAttempts);
      logSecurityEvent({
        type: 'rate_limit',
        email: hashForLogging(data.email),
      });
      return;
    }

    setIsLoading(true);

    try {
      // Record the attempt
      recordAttempt(data.email);
      
      // Log the attempt
      logSecurityEvent({
        type: 'login_attempt',
        email: hashForLogging(data.email),
      });

      // TODO: Implement actual authentication
      // For now, simulate a login
      await new Promise((resolve, reject) => setTimeout(() => {
        // Simulate random success/failure for demo
        if (Math.random() > 0.5) {
          resolve(true);
        } else {
          reject(new Error("Invalid credentials"));
        }
      }, 1000));

      // Clear attempts on successful login
      clearAttempts(data.email);
      
      // Log successful login
      logSecurityEvent({
        type: 'login_success',
        email: hashForLogging(data.email),
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
        type: 'login_failure',
        email: hashForLogging(data.email),
        details: { remainingAttempts },
      });
      
      // Add shake animation to form
      const form = document.getElementById("signin-form");
      form?.classList.add("animate-shake");
      setTimeout(() => form?.classList.remove("animate-shake"), 500);
      
      // Show remaining attempts if getting low
      if (remainingAttempts > 0 && remainingAttempts <= 2) {
        setGeneralError(`${errorMessage} (${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining)`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "facebook" | "google" | "apple") => {
    try {
      // TODO: Implement social login
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const redirectURL = searchParams.get("redirectURL") || "/app";
      navigate(redirectURL);
    } catch (error) {
      setGeneralError(`${provider} login failed`);
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
        <AuthHeader />

        {/* Content */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-4 sm:px-6 pb-4 sm:pb-8 pt-4 sm:pt-8">
          <div className="w-full max-w-md animate-scaleIn">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 border border-gray-100">
              {/* Icon */}
              <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-primary-100 shadow-sm mb-4 sm:mb-6">
                <i className="pi pi-user text-xl sm:text-2xl text-primary-600" />
              </div>

              {/* Title */}
              <div className="text-center">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                  Welcome back!
                </h1>
                <p className="mt-2 text-sm sm:text-base text-gray-600">
                  Sign in to your account to continue
                </p>
              </div>

              {/* Social Login */}
              <div className="mt-6 sm:mt-8">
                <SocialLoginButtons
                  onFacebookLogin={() => handleSocialLogin("facebook")}
                  onGoogleLogin={() => handleSocialLogin("google")}
                  onAppleLogin={() => handleSocialLogin("apple")}
                />

              </div>

              {/* Divider */}
              <div className="relative mt-6 sm:mt-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm sm:text-base">
                  <span className="bg-white px-2 text-gray-500">
                    Or continue with email
                  </span>
                </div>
              </div>

              {/* Sign In Form */}
              <form id="signin-form" onSubmit={handleSubmit(onSubmit)} className="mt-6">
                <div className="space-y-4">
                  <FormInput
                    label="Email address"
                    type="email"
                    {...register("email")}
                    error={errors.email?.message}
                    touched={touchedFields.email}
                    autoComplete="email"
                    icon={<i className="pi pi-envelope text-base" />}
                    aria-label="Email address"
                  />

                  <FormInput
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    error={errors.password?.message}
                    touched={touchedFields.password}
                    autoComplete="current-password"
                    icon={<i className="pi pi-lock text-base" />}
                    showPasswordToggle
                    onPasswordToggleChange={setShowPassword}
                    aria-label="Password"
                  />
                </div>

                {generalError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md animate-slideDown">
                    <p className="text-sm text-red-600 flex items-center">
                      <i className="pi pi-exclamation-circle mr-2" />
                      {generalError}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <Checkbox
                      id="remember"
                      {...register("rememberMe")}
                      className="h-4 w-4"
                    />
                    <label
                      htmlFor="remember"
                      className="ml-2 text-sm text-gray-600 cursor-pointer"
                    >
                      Remember me
                    </label>
                  </div>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary-600 hover:text-primary-500 transition-colors"
                  >
                    Forgot your password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="mt-6 w-full landing-raised-button landing-raised-button-primary relative"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Spinner className="mr-2" />
                      Signing in...
                    </div>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>

              {/* Sign up link */}
              <p className="mt-6 text-center text-sm sm:text-base text-gray-600">
                Don't have an account?{" "}
                <Link
                  to="/sign-up"
                  className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
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
  );
}
