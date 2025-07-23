import FooterFigure from "@shared/assets/backgrounds/footer-figure.svg?react";
import { AuthFooter } from "@shared/components/auth/AuthFooter";
import { AuthHeader } from "@shared/components/auth/AuthHeader";
import { FormInput } from "@shared/components/auth/FormInput";
import { PasswordStrength } from "@shared/components/auth/PasswordStrength";
import { Spinner } from "@shared/components/auth/Spinner";
import AuthLayout from "@shared/layouts/AuthLayout";
import { Button } from "@ui/components/button";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    passwordConfirm: "",
  });
  const [errors, setErrors] = useState({
    password: "",
    passwordConfirm: "",
    general: "",
  });
  const [touched, setTouched] = useState({
    password: false,
    passwordConfirm: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({ password: "", passwordConfirm: "", general: "" });
    setTouched({ password: true, passwordConfirm: true });

    // Validation
    if (!formData.password || formData.password.length < 8) {
      setErrors((prev) => ({ ...prev, password: "Password must be at least 8 characters" }));
      return;
    }
    if (!formData.passwordConfirm) {
      setErrors((prev) => ({ ...prev, passwordConfirm: "Please confirm your password" }));
      return;
    }
    if (formData.password !== formData.passwordConfirm) {
      setErrors((prev) => ({ ...prev, passwordConfirm: "Passwords do not match" }));
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement actual password reset with token from URL
      const token = searchParams.get("token");
      if (!token) {
        throw new Error("Invalid reset link");
      }
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Show success message and redirect
      navigate("/sign-in?reset=success");
    } catch (error) {
      setErrors({ ...errors, general: "Something went wrong, please try again." });
      const form = document.getElementById("reset-form");
      form?.classList.add("animate-shake");
      setTimeout(() => form?.classList.remove("animate-shake"), 500);
    } finally {
      setIsLoading(false);
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
            <span className="hidden text-gray-600 sm:block">Return to</span>
            <Link to="/sign-in">
              <Button className="landing-raised-button landing-raised-button-pink">
                Login page
              </Button>
            </Link>
          </div>
        } />

        {/* Content */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-8 pt-8 sm:px-8">
          <div className="w-full max-w-md animate-scaleIn">
            <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10">
            {/* Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 shadow-sm mb-6">
              <i className="pi pi-key text-2xl text-purple-600" />
            </div>

            {/* Title */}
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Reset your password
              </h1>
              <p className="mt-2 text-base text-gray-600">
                Create a new password for your account
              </p>
            </div>

              {/* Form */}
              <form id="reset-form" onSubmit={handleSubmit} className="mt-8">
                <div className="space-y-4">
                  <div>
                    <FormInput
                      label="New password"
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
                      aria-label="New password"
                    />
                    {formData.password && <PasswordStrength password={formData.password} className="mt-2" />}
                  </div>

                  <FormInput
                    label="Confirm new password"
                    type={showPasswordConfirm ? "text" : "password"}
                    value={formData.passwordConfirm}
                    onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                    onBlur={() => setTouched({ ...touched, passwordConfirm: true })}
                    error={errors.passwordConfirm}
                    touched={touched.passwordConfirm}
                    autoComplete="new-password"
                    icon={<i className="pi pi-lock" />}
                    showPasswordToggle
                    onPasswordToggleChange={setShowPasswordConfirm}
                    aria-label="Confirm new password"
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

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="mt-6 w-full landing-raised-button landing-raised-button-primary relative"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Spinner className="mr-2" />
                      Resetting...
                    </div>
                  ) : (
                    "Reset your password"
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