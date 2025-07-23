import AuthLayout from "@/layouts/AuthLayout";
import FooterFigure from "@/assets/backgrounds/footer-figure.svg?react";
import LogoText from "@shared/icons/logo/logo-text.svg?react";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({ password: "", passwordConfirm: "", general: "" });

    // Validation
    if (!formData.password) {
      setErrors((prev) => ({ ...prev, password: "Password is required" }));
      return;
    }
    if (formData.password.length < 8) {
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="relative flex min-h-screen w-full flex-col bg-white">
      {/* Background SVG */}
      <div className="absolute bottom-0 w-full pointer-events-none z-0">
        <FooterFigure className="w-full h-auto" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex w-full items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center">
          <Link to="/" className="flex items-center cursor-pointer relative z-10">
            <LogoText className="h-10 w-auto cursor-pointer mt-0.5" />
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-gray-600 sm:block">Return to</span>
          <Link to="/sign-in">
            <Button className="landing-raised-button landing-raised-button-pink">
              Login page
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-8 pt-8 sm:px-8">
        <div className="w-full max-w-sm">
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
              <p className="mt-2 text-gray-600">
                Create a new password for your account
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-8">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <i className="pi pi-lock text-gray-400 text-sm" />
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className={`pl-10 pr-10 ${errors.password ? "border-red-500" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
                </div>

                <div>
                  <Label htmlFor="passwordConfirm">Confirm new password</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <i className="pi pi-lock text-gray-400 text-sm" />
                    </div>
                    <Input
                      id="passwordConfirm"
                      name="passwordConfirm"
                      type={showPasswordConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={formData.passwordConfirm}
                      onChange={(e) =>
                        setFormData({ ...formData, passwordConfirm: e.target.value })
                      }
                      className={`pl-10 pr-10 ${errors.passwordConfirm ? "border-red-500" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswordConfirm ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.passwordConfirm && (
                    <p className="mt-1 text-sm text-red-600">{errors.passwordConfirm}</p>
                  )}
                </div>
              </div>

              {errors.general && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{errors.general}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="mt-6 w-full landing-raised-button landing-raised-button-primary"
              >
                {isLoading ? "Resetting..." : "Reset your password"}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex h-20 w-full items-center px-6 sm:h-24 md:px-8">
        <span className="font-medium text-white">
          Breedhub &copy; {new Date().getFullYear()} | With ♥ from Ukraine
        </span>
      </div>
    </div>
    </AuthLayout>
  );
}