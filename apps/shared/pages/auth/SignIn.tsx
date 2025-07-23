import FooterFigure from "@shared/assets/backgrounds/footer-figure.svg?react";
import { AuthFooter } from "@shared/components/auth/AuthFooter";
import { AuthHeader } from "@shared/components/auth/AuthHeader";
import { FormInput } from "@shared/components/auth/FormInput";
import { SocialLoginButtons } from "@shared/components/auth/SocialLoginButtons";
import { Spinner } from "@shared/components/auth/Spinner";
import { useEmailValidation } from "@shared/hooks/useEmailValidation";
import AuthLayout from "@shared/layouts/AuthLayout";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

export default function SignIn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    general: "",
  });
  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  const { validateEmail, error: emailError } = useEmailValidation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({ email: "", password: "", general: "" });
    setTouched({ email: true, password: true });

    // Validate email
    const isEmailValid = await validateEmail(formData.email);
    if (!isEmailValid) {
      setErrors((prev) => ({ ...prev, email: emailError }));
      return;
    }

    // Basic validation
    if (!formData.password) {
      setErrors((prev) => ({ ...prev, password: "Password is required" }));
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement actual authentication
      // For now, simulate a login
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get redirect URL from query params or default to /app
      const redirectURL = searchParams.get("redirectURL") || "/app";
      navigate(redirectURL);
    } catch (error) {
      setErrors({ ...errors, general: "Invalid email or password" });
      // Add shake animation to form
      const form = document.getElementById("signin-form");
      form?.classList.add("animate-shake");
      setTimeout(() => form?.classList.remove("animate-shake"), 500);
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
      setErrors({ ...errors, general: `${provider} login failed` });
    }
  };

  return (
    <AuthLayout>
      <div className="relative flex min-h-screen w-full flex-col bg-white animate-fadeIn">
        {/* Background SVG */}
        <div className="absolute bottom-0 w-full pointer-events-none z-0">
          <FooterFigure className="w-full h-auto" />
        </div>

        {/* Header */}
        <AuthHeader />

        {/* Content */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-8 pt-8 sm:px-8">
          <div className="w-full max-w-md animate-scaleIn">
            <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10">
              {/* Icon */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 shadow-sm mb-6">
                <i className="pi pi-user text-2xl text-primary-600" />
              </div>

              {/* Title */}
              <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                  Welcome back!
                </h1>
                <p className="mt-2 text-base text-gray-600">
                  Sign in to your account to continue
                </p>
              </div>

              {/* Social Login */}
              <div className="mt-8">
                <SocialLoginButtons
                  onFacebookLogin={() => handleSocialLogin("facebook")}
                  onGoogleLogin={() => handleSocialLogin("google")}
                  onAppleLogin={() => handleSocialLogin("apple")}
                />

              </div>

              {/* Divider */}
              <div className="relative mt-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-base">
                  <span className="bg-white px-2 text-gray-500">
                    Or continue with email
                  </span>
                </div>
              </div>

              {/* Sign In Form */}
              <form id="signin-form" onSubmit={handleSubmit} className="mt-6">
                <div className="space-y-4">
                  <FormInput
                    label="Email address"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    onBlur={() => setTouched({ ...touched, email: true })}
                    error={errors.email || (touched.email && emailError)}
                    touched={touched.email}
                    autoComplete="email"
                    icon={<i className="pi pi-envelope" />}
                    aria-label="Email address"
                  />

                  <FormInput
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    onBlur={() => setTouched({ ...touched, password: true })}
                    error={errors.password}
                    touched={touched.password}
                    autoComplete="current-password"
                    icon={<i className="pi pi-lock" />}
                    showPasswordToggle
                    onPasswordToggleChange={setShowPassword}
                    aria-label="Password"
                  />
                </div>

                {errors.general && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md animate-slideDown">
                    <p className="text-sm text-red-600 flex items-center">
                      <i className="pi pi-exclamation-circle mr-2" />
                      {errors.general}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
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
              <p className="mt-6 text-center text-base text-gray-600">
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
