import FooterFigure from "@shared/assets/backgrounds/footer-figure.svg?react";
import { AuthButton } from "@shared/components/auth/AuthButton";
import { AuthFooter } from "@shared/components/auth/AuthFooter";
import { AuthHeader } from "@shared/components/auth/AuthHeader";
import { EnhancedSocialLoginButtons } from "@shared/components/auth/EnhancedSocialLoginButtons";
import { FormInput } from "@shared/components/auth/FormInput";
import { PasswordStrength } from "@shared/components/auth/PasswordStrength";
import { Spinner } from "@shared/components/auth/Spinner";
import { useEmailValidation } from "@shared/hooks/useEmailValidation";
import { useRateLimiter } from "@shared/hooks/useRateLimiter";
import AuthLayout from "@shared/layouts/AuthLayout";
import {
  hashForLogging,
  logSecurityEvent,
  sanitizeErrorMessage,
  secureErrorMessages,
  validatePasswordStrength,
} from "@shared/utils/securityUtils";
import { AuthFormWrapper } from "@ui/components/auth-forms";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { cn } from "@ui/lib/utils";
import {
  AlertCircle,
  Building,
  Lock,
  Mail,
  User,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function SignUp() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<"social" | "email">("social");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    kennel: "",
    agreements: false,
  });
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    agreements: "",
    general: "",
  });
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    kennel: false,
  });

  const { validateEmail, error: emailError } = useEmailValidation();
  const { checkRateLimit, recordAttempt } = useRateLimiter("registration");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({
      name: "",
      email: "",
      password: "",
      agreements: "",
      general: "",
    });
    setTouched({ name: true, email: true, password: true, kennel: true });

    // Check rate limit first
    const rateLimitCheck = checkRateLimit(formData.email);
    if (!rateLimitCheck.allowed) {
      setErrors((prev) => ({
        ...prev,
        general: rateLimitCheck.message || secureErrorMessages.tooManyAttempts,
      }));
      logSecurityEvent({
        type: "rate_limit",
        email: hashForLogging(formData.email),
      });
      return;
    }

    // Validation
    if (!formData.name || formData.name.trim().length < 2) {
      setErrors((prev) => ({ ...prev, name: "Please enter your full name" }));
      return;
    }

    const isEmailValid = await validateEmail(formData.email);
    if (!isEmailValid) {
      setErrors((prev) => ({ ...prev, email: emailError }));
      return;
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(formData.password);
    if (!passwordValidation.isValid) {
      setErrors((prev) => ({
        ...prev,
        password: passwordValidation.errors[0],
      }));
      return;
    }

    if (!formData.agreements) {
      setErrors((prev) => ({
        ...prev,
        agreements: secureErrorMessages.termsRequired,
      }));
      return;
    }

    setIsLoading(true);

    try {
      // Record the attempt
      recordAttempt(formData.email);

      // Log the attempt
      logSecurityEvent({
        type: "registration",
        email: hashForLogging(formData.email),
      });

      // TODO: Implement actual registration
      await new Promise((resolve, reject) =>
        setTimeout(() => {
          // Simulate success for demo
          resolve(true);
        }, 1000)
      );

      navigate("/confirmation-required");
    } catch (error) {
      // Use secure error message
      const errorMessage = sanitizeErrorMessage(error);
      setErrors({ ...errors, general: errorMessage });

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
      navigate("/confirmation-required");
    } catch (error) {
      setErrors({ ...errors, general: `${provider} sign up failed` });
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
              <span className="hidden text-gray-600 sm:block">
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
                <p className="mt-1 text-sm text-gray-600">
                  Create your account to begin
                </p>
              </div>

              {/* Tab Navigation */}
              <div className="flex rounded-lg bg-gray-100 p-[2px] mb-6 sm:mb-7">
                <button
                  onClick={() => setAuthMode("social")}
                  className={cn(
                    "flex-1 py-2.5 px-4 text-base font-medium rounded-md transition-all",
                    authMode === "social"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-400 hover:text-gray-700"
                  )}
                >
                  Quick Sign Up
                </button>
                <button
                  onClick={() => setAuthMode("email")}
                  className={cn(
                    "flex-1 py-2 px-4 text-base font-medium rounded-md transition-all",
                    authMode === "email"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-400 hover:text-gray-700"
                  )}
                >
                  Email
                </button>
              </div>

              {/* Animated Content */}
              <div className="relative h-auto sm:h-[380px]">
                {/* Social Sign Up Tab */}
                <div
                  className={cn(
                    "sm:absolute sm:inset-0 transition-all duration-300 ease-in-out flex flex-col justify-center",
                    authMode === "social"
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 -translate-y-4 pointer-events-none sm:absolute hidden"
                  )}
                >
                  <div className="space-y-4">
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
                  className={cn(
                    "sm:absolute sm:inset-0 transition-all duration-300 ease-in-out flex flex-col justify-center",
                    authMode === "email"
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4 pointer-events-none sm:absolute hidden"
                  )}
                >
                  <div className="flex flex-col justify-center h-full">
                    <AuthFormWrapper
                      formId="signup-form"
                      onSubmit={handleSubmit}
                      isLoading={isLoading}
                      className="mt-0"
                    >
                      <div className="space-y-3">
                        <FormInput
                          label="Full name"
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          error={errors.name}
                          touched={touched.name}
                          autoComplete="name"
                          icon={<User className="w-4 h-4" />}
                          aria-label="Full name"
                        />

                        <FormInput
                          label="Email address"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          error={errors.email}
                          touched={touched.email}
                          autoComplete="email"
                          icon={<Mail className="w-4 h-4" />}
                          aria-label="Email address"
                        />

                        <div>
                          <FormInput
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                password: e.target.value,
                              })
                            }
                            error={errors.password}
                            touched={touched.password}
                            autoComplete="new-password"
                            icon={<Lock className="w-4 h-4" />}
                            showPasswordToggle
                            onPasswordToggleChange={setShowPassword}
                            aria-label="Password"
                          />
                          {formData.password && (
                            <PasswordStrength
                              password={formData.password}
                              className="mt-2"
                            />
                          )}
                        </div>

                        <FormInput
                          label="Kennel (optional)"
                          type="text"
                          value={formData.kennel}
                          onChange={(e) =>
                            setFormData({ ...formData, kennel: e.target.value })
                          }
                          error=""
                          touched={touched.kennel}
                          icon={<Building className="w-4 h-4" />}
                          aria-label="Kennel name"
                        />

                        <div className="space-y-1 py-1">
                          <div className="flex items-start">
                            <Checkbox
                              id="agreements"
                              checked={formData.agreements}
                              onCheckedChange={(checked) =>
                                setFormData({
                                  ...formData,
                                  agreements: !!checked,
                                })
                              }
                              className={
                                errors.agreements ? "border-red-500" : ""
                              }
                            />
                            <label
                              htmlFor="agreements"
                              className="ml-2 text-base text-gray-600"
                            >
                              I agree to the{" "}
                              <Link
                                to="/terms-and-conditions"
                                className="text-primary-600 hover:text-primary-500"
                              >
                                Terms of Service
                              </Link>{" "}
                              and{" "}
                              <Link
                                to="/privacy-policy"
                                className="text-primary-600 hover:text-primary-500"
                              >
                                Privacy Policy
                              </Link>
                            </label>
                          </div>
                          {errors.agreements && (
                            <p className="text-sm text-red-600 ml-6">
                              {errors.agreements}
                            </p>
                          )}
                        </div>
                      </div>

                      {errors.general && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md animate-slideDown">
                          <p className="text-sm text-red-600 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            {errors.general}
                          </p>
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="mt-4 w-full h-12 bg-primary-500 hover:bg-primary-600 text-white text-base font-medium rounded-xl transition-all transform hover:scale-[1.02] hover:shadow-lg"
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center">
                            <Spinner className="mr-2" />
                            Creating account...
                          </div>
                        ) : (
                          "Create your account"
                        )}
                      </Button>
                    </AuthFormWrapper>
                  </div>
                </div>
              </div>

              {/* Sign in link */}
              <p className="mt-6 text-center text-sm sm:text-base text-gray-600">
                Already have an account?{" "}
                <Link
                  to="/sign-in"
                  className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
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
  );
}
