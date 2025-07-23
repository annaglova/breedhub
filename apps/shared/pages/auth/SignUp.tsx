import FooterFigure from "@shared/assets/backgrounds/footer-figure.svg?react";
import { AuthFooter } from "@shared/components/auth/AuthFooter";
import { AuthHeader } from "@shared/components/auth/AuthHeader";
import { FormInput } from "@shared/components/auth/FormInput";
import { PasswordStrength } from "@shared/components/auth/PasswordStrength";
import { SocialLoginButtons } from "@shared/components/auth/SocialLoginButtons";
import { Spinner } from "@shared/components/auth/Spinner";
import { useEmailValidation } from "@shared/hooks/useEmailValidation";
import AuthLayout from "@shared/layouts/AuthLayout";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function SignUp() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({ name: "", email: "", password: "", agreements: "", general: "" });
    setTouched({ name: true, email: true, password: true, kennel: true });

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
    
    if (!formData.password || formData.password.length < 8) {
      setErrors((prev) => ({ ...prev, password: "Password must be at least 8 characters" }));
      return;
    }
    
    if (!formData.agreements) {
      setErrors((prev) => ({ ...prev, agreements: "You must agree to the terms" }));
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement actual registration
      await new Promise((resolve) => setTimeout(resolve, 1000));
      navigate("/confirmation-required");
    } catch (error) {
      setErrors({ ...errors, general: "Something went wrong, please try again." });
      const form = document.getElementById("signup-form");
      form?.classList.add("animate-shake");
      setTimeout(() => form?.classList.remove("animate-shake"), 500);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignUp = async (provider: "facebook" | "google" | "apple") => {
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
      <div className="relative flex min-h-screen w-full flex-col bg-white animate-fadeIn">
        {/* Background SVG */}
        <div className="absolute bottom-0 w-full pointer-events-none z-0">
          <FooterFigure className="w-full h-auto" />
        </div>

        {/* Header */}
        <AuthHeader rightContent={
          <div className="flex items-center gap-4">
            <span className="hidden text-gray-600 sm:block">
              Already have an account?
            </span>
            <Link to="/sign-in">
              <Button className="landing-raised-button landing-raised-button-pink">
                Sign in
              </Button>
            </Link>
          </div>
        } />

        {/* Content */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-8 pt-8 sm:px-8">
          <div className="w-full max-w-md animate-scaleIn">
            <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10">
            {/* Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 shadow-sm mb-6">
              <i className="pi pi-user-plus text-2xl text-primary-600" />
            </div>

            {/* Title */}
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Let's get started!
              </h1>
              <p className="mt-2 text-base text-gray-600">
                Create your account to begin
              </p>
            </div>

              {/* Social Sign Up */}
              <div className="mt-8">
                <SocialLoginButtons
                  onFacebookLogin={() => handleSocialSignUp("facebook")}
                  onGoogleLogin={() => handleSocialSignUp("google")}
                  onAppleLogin={() => handleSocialSignUp("apple")}
                  signUpMode
                />
              </div>

            {/* Divider */}
            <div className="relative mt-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-base">
                <span className="bg-white px-2 text-gray-500">Or sign up with email</span>
              </div>
            </div>

              {/* Sign Up Form */}
              <form id="signup-form" onSubmit={handleSubmit} className="mt-6">
                <div className="space-y-4">
                  <FormInput
                    label="Full name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    onBlur={() => setTouched({ ...touched, name: true })}
                    error={errors.name}
                    touched={touched.name}
                    autoComplete="name"
                    icon={<i className="pi pi-user" />}
                    aria-label="Full name"
                  />

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

                  <div>
                    <FormInput
                      label="Password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      onBlur={() => setTouched({ ...touched, password: true })}
                      error={errors.password}
                      touched={touched.password}
                      autoComplete="new-password"
                      icon={<i className="pi pi-lock" />}
                      showPasswordToggle
                      onPasswordToggleChange={setShowPassword}
                      aria-label="Password"
                    />
                    {formData.password && <PasswordStrength password={formData.password} className="mt-2" />}
                  </div>

                  <FormInput
                    label="Kennel (optional)"
                    type="text"
                    value={formData.kennel}
                    onChange={(e) => setFormData({ ...formData, kennel: e.target.value })}
                    onBlur={() => setTouched({ ...touched, kennel: true })}
                    touched={touched.kennel}
                    icon={<i className="pi pi-building" />}
                    aria-label="Kennel name"
                  />

                <div className="flex items-start">
                  <Checkbox
                    id="agreements"
                    checked={formData.agreements}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, agreements: checked as boolean })
                    }
                    className={errors.agreements ? "border-red-500" : ""}
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
                  <p className="mt-1 text-sm text-red-600">{errors.agreements}</p>
                )}
              </div>

                {errors.general && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md animate-slideDown">
                    <p className="text-sm text-red-600 flex items-center">
                      <i className="pi pi-exclamation-circle mr-2" />
                      {errors.general}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="mt-6 w-full landing-raised-button landing-raised-button-primary relative"
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
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <AuthFooter />
      </div>
    </AuthLayout>
  );
}