import HeaderFigure from "@/assets/backgrounds/header-figure.svg?react";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

export default function SignIn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    general: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({ email: "", password: "", general: "" });

    // Basic validation
    if (!formData.email) {
      setErrors((prev) => ({ ...prev, email: "Email is required" }));
      return;
    }
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "facebook" | "google") => {
    setIsLoading(true);
    try {
      // TODO: Implement social login
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const redirectURL = searchParams.get("redirectURL") || "/app";
      navigate(redirectURL);
    } catch (error) {
      setErrors({ ...errors, general: `${provider} login failed` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-gradient-to-br from-primary-50 via-white to-primary-50">
      {/* Background SVG */}
      <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-10">
        <HeaderFigure className="absolute bottom-[-50%] left-[-20%] w-[140%] h-auto" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex w-full p-8 sm:px-14">
        <Link to="/" className="flex items-center">
          <img
            className="h-10"
            src="/assets/images/logo/logo-text.svg"
            alt="BreedHub logo"
          />
        </Link>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-8 pt-8 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10">
            {/* Title */}
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Welcome back!
              </h1>
              <p className="mt-2 text-gray-600">
                Sign in to your account to continue
              </p>
            </div>

            {/* Social Login */}
            <div className="mt-8 space-y-3">
              <Button
                onClick={() => handleSocialLogin("facebook")}
                disabled={isLoading}
                className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white"
              >
                <i className="pi pi-facebook mr-2" />
                Continue with Facebook
              </Button>
              <Button
                onClick={() => handleSocialLogin("google")}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
            </div>

            {/* Divider */}
            <div className="relative mt-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">Or continue with email</span>
              </div>
            </div>

            {/* Sign In Form */}
            <form onSubmit={handleSubmit} className="mt-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email address</Label>
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
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className={errors.password ? "border-red-500" : ""}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>
              </div>

              {errors.general && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{errors.general}</p>
                </div>
              )}

              <div className="mt-4 flex items-center justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  Forgot your password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="mt-6 w-full landing-raised-button landing-raised-button-primary"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            {/* Sign up link */}
            <p className="mt-6 text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                to="/sign-up"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}