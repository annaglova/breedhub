import AuthLayout from "@/layouts/AuthLayout";
import FooterFigure from "@/assets/backgrounds/footer-figure.svg?react";
import LogoText from "@shared/icons/logo/logo-text.svg?react";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({ name: "", email: "", password: "", agreements: "", general: "" });

    // Validation
    if (!formData.name) {
      setErrors((prev) => ({ ...prev, name: "Full name is required" }));
      return;
    }
    if (!formData.email) {
      setErrors((prev) => ({ ...prev, email: "Email is required" }));
      return;
    }
    if (!formData.password) {
      setErrors((prev) => ({ ...prev, password: "Password is required" }));
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignUp = async (provider: "facebook") => {
    setIsLoading(true);
    try {
      // TODO: Implement social sign up
      await new Promise((resolve) => setTimeout(resolve, 1000));
      navigate("/confirmation-required");
    } catch (error) {
      setErrors({ ...errors, general: `${provider} sign up failed` });
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
          <span className="hidden text-gray-600 sm:block">
            Already have an account?
          </span>
          <Link to="/sign-in">
            <Button className="landing-raised-button landing-raised-button-pink">
              Sign in
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-8 pt-8 sm:px-8">
        <div className="w-full max-w-md">
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
              <Button
                onClick={() => handleSocialSignUp("facebook")}
                disabled={isLoading}
                className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white"
              >
                <div className="bg-white/20 rounded-full w-6 h-6 flex items-center justify-center mr-2 shadow-sm">
                  <i className="pi pi-facebook text-white" />
                </div>
                Start with Facebook
              </Button>
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
            <form onSubmit={handleSubmit} className="mt-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-base font-medium">Full name</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <i className="pi pi-user text-gray-400 text-base" />
                    </div>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className={`pl-10 text-base ${errors.name ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email" className="text-base font-medium">Email address</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <i className="pi pi-envelope text-gray-400 text-base" />
                    </div>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className={`pl-10 text-base ${errors.email ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password" className="text-base font-medium">Password</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <i className="pi pi-lock text-gray-400 text-base" />
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
                      className={`pl-10 pr-10 text-base ${errors.password ? "border-red-500" : ""}`}
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
                </div>

                <div>
                  <Label htmlFor="kennel" className="text-base font-medium">Kennel (optional)</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <i className="pi pi-building text-gray-400 text-base" />
                    </div>
                    <Input
                      id="kennel"
                      name="kennel"
                      type="text"
                      value={formData.kennel}
                      onChange={(e) =>
                        setFormData({ ...formData, kennel: e.target.value })
                      }
                      className="pl-10 text-base"
                    />
                  </div>
                </div>

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
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{errors.general}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="mt-6 w-full landing-raised-button landing-raised-button-primary"
              >
                {isLoading ? "Creating account..." : "Create your account"}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex h-20 w-full items-center px-6 sm:h-24 md:px-8">
        <span className="font-medium text-base text-white">
          Breedhub &copy; {new Date().getFullYear()} | With ♥ from Ukraine
        </span>
      </div>
    </div>
    </AuthLayout>
  );
}