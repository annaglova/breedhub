import AuthLayout from "@/layouts/AuthLayout";
import FooterFigure from "@/assets/backgrounds/footer-figure.svg?react";
import LogoText from "@shared/icons/logo/logo-text.svg?react";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement actual password reset
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsSuccess(true);
    } catch (error) {
      setError("Email does not found! Are you sure you are already a member?");
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
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10">
            {!isSuccess ? (
              <>
                {/* Icon */}
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 shadow-sm mb-6">
                  <i className="pi pi-question-circle text-2xl text-blue-600" />
                </div>

                {/* Title */}
                <div className="text-center">
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                    Forgot password?
                  </h1>
                  <p className="mt-2 text-base text-gray-600">
                    Fill the form to reset your password
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="mt-8">
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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`pl-10 text-base ${error ? "border-red-500" : ""}`}
                        placeholder="Enter your email"
                      />
                    </div>
                    {error && (
                      <p className="mt-1 text-sm text-red-600">{error}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="mt-6 w-full landing-raised-button landing-raised-button-primary"
                  >
                    {isLoading ? "Sending..." : "Send reset link"}
                  </Button>
                </form>

                {/* Back to login link */}
                <p className="mt-6 text-center text-base text-gray-600">
                  Remember your password?{" "}
                  <Link
                    to="/sign-in"
                    className="font-medium text-primary-600 hover:text-primary-500"
                  >
                    Sign in
                  </Link>
                </p>
              </>
            ) : (
              <>
                {/* Success Message */}
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 shadow-sm">
                    <svg
                      className="h-8 w-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h2 className="mt-4 text-2xl font-bold text-gray-900">
                    Check your email
                  </h2>
                  <p className="mt-2 text-base text-gray-600">
                    Password reset sent! You'll receive an email if you are registered on our system.
                  </p>
                  <p className="mt-1 text-base text-gray-500">
                    Sent to: {email}
                  </p>
                </div>

                <Link to="/sign-in">
                  <Button className="mt-8 w-full landing-raised-button landing-raised-button-outline">
                    Back to sign in
                  </Button>
                </Link>
              </>
            )}
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