import FooterFigure from "@shared/assets/backgrounds/footer-figure.svg?react";
import { AuthFooter } from "@shared/components/auth/AuthFooter";
import { AuthHeader } from "@shared/components/auth/AuthHeader";
import { FormInput } from "@shared/components/auth/FormInput";
import { SocialLoginButtons } from "@shared/components/auth/SocialLoginButtons";
import { Spinner } from "@shared/components/auth/Spinner";
import { useRateLimiter } from "@shared/hooks/useRateLimiter";
import { useTranslations } from "@shared/i18n";
import AuthLayout from "@shared/layouts/AuthLayout";
import { sanitizeErrorMessage, logSecurityEvent, hashForLogging } from "@shared/utils/securityUtils";
import { signInSchema, type SignInFormData } from "@shared/utils/authSchemas";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { User, Mail, Lock, AlertCircle } from "lucide-react";

export default function SignInWithI18n() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const t = useTranslations();
  
  const { checkRateLimit, recordAttempt, clearAttempts, remainingAttempts } = useRateLimiter('login');
  
  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
    watch,
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: SignInFormData) => {
    setGeneralError("");

    // Check rate limit first
    const rateLimitCheck = checkRateLimit(data.email);
    if (!rateLimitCheck.allowed) {
      setGeneralError(rateLimitCheck.message || t.auth.errors.tooManyAttempts);
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
      await new Promise((resolve, reject) => setTimeout(() => {
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
        const attemptText = remainingAttempts === 1 
          ? t.auth.errors.attemptsRemaining 
          : t.auth.errors.attemptsRemainingPlural;
        setGeneralError(`${errorMessage} (${remainingAttempts} ${attemptText})`);
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
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-8 md:p-10">
              {/* Icon */}
              <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-purple-100 shadow-sm mb-4 sm:mb-6">
                <User className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
              </div>

              {/* Title */}
              <div className="text-center">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                  {t.auth.signIn.title}
                </h1>
                <p className="mt-2 text-sm sm:text-base text-gray-600">
                  {t.auth.signIn.subtitle}
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
                    {t.auth.signIn.orContinueWith}
                  </span>
                </div>
              </div>

              {/* Sign In Form */}
              <form id="signin-form" onSubmit={handleSubmit(onSubmit)} className="mt-6">
                <div className="space-y-4">
                  <FormInput
                    label={t.auth.signIn.emailLabel}
                    type="email"
                    {...register("email")}
                    error={errors.email?.message}
                    touched={touchedFields.email}
                    autoComplete="email"
                    icon={<Mail className="w-4 h-4" />}
                    aria-label={t.auth.signIn.emailLabel}
                  />

                  <FormInput
                    label={t.auth.signIn.passwordLabel}
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    error={errors.password?.message}
                    touched={touchedFields.password}
                    autoComplete="current-password"
                    icon={<Lock className="w-4 h-4" />}
                    showPasswordToggle
                    onPasswordToggleChange={setShowPassword}
                    aria-label={t.auth.signIn.passwordLabel}
                  />
                </div>

                {generalError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md animate-slideDown">
                    <p className="text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
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
                      {t.auth.signIn.rememberMe}
                    </label>
                  </div>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary-600 hover:text-primary-500 transition-colors"
                  >
                    {t.auth.signIn.forgotPassword}
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
                      {t.auth.signIn.signInButton}...
                    </div>
                  ) : (
                    t.auth.signIn.signInButton
                  )}
                </Button>
              </form>

              {/* Sign up link */}
              <p className="mt-6 text-center text-sm sm:text-base text-gray-600">
                {t.auth.signIn.noAccount}{" "}
                <Link
                  to="/sign-up"
                  className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
                >
                  {t.auth.signIn.signUpLink}
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