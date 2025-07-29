import FooterFigure from "@shared/assets/backgrounds/footer-figure.svg?react";
import { AuthFooter } from "@shared/components/auth/AuthFooter";
import { AuthHeader } from "@shared/components/auth/AuthHeader";
import { AuthButton } from "@shared/components/auth/AuthButton";
import { FormInput } from "@shared/components/auth/FormInput";
import { PasswordStrength } from "@shared/components/auth/PasswordStrength";
import { Spinner } from "@shared/components/auth/Spinner";
import AuthLayout from "@shared/layouts/AuthLayout";
import { resetPasswordSchema, type ResetPasswordFormData } from "@shared/utils/authSchemas";
import { sanitizeErrorMessage, secureErrorMessages, logSecurityEvent } from "@shared/utils/securityUtils";
import { Button } from "@ui/components/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Key, Lock, AlertCircle } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [generalError, setGeneralError] = useState("");
  
  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
    watch,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      passwordConfirm: "",
    },
  });

  const watchPassword = watch("password");

  const onSubmit = async (data: ResetPasswordFormData) => {
    setGeneralError("");

    setIsLoading(true);

    try {
      // TODO: Implement actual password reset with token from URL
      const token = searchParams.get("token");
      if (!token) {
        throw new Error("Invalid reset link");
      }
      
      // Log the attempt
      logSecurityEvent({
        type: 'password_reset',
        details: { token: token.substring(0, 8) + '...' },
      });
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Show success message and redirect
      navigate("/sign-in?reset=success");
    } catch (error) {
      const errorMessage = sanitizeErrorMessage(error);
      setGeneralError(errorMessage);
      
      const form = document.getElementById("reset-form");
      form?.classList.add("animate-shake");
      setTimeout(() => form?.classList.remove("animate-shake"), 500);
    } finally {
      setIsLoading(false);
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
        <AuthHeader rightContent={
          <div className="flex items-center gap-4">
            <span className="hidden text-gray-600 sm:block">Return to</span>
            <AuthButton to="/sign-in">
              Login page
            </AuthButton>
          </div>
        } />

        {/* Content */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-8 pt-8 sm:px-8">
          <div className="w-full max-w-md animate-scaleIn">
            <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 border border-gray-100">
            {/* Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 shadow-sm mb-6">
              <Key className="w-8 h-8 text-purple-600" />
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
              <form id="reset-form" onSubmit={handleSubmit(onSubmit)} className="mt-8">
                <div className="space-y-4">
                  <div>
                    <FormInput
                      label="New password"
                      type={showPassword ? "text" : "password"}
                      {...register("password")}
                      error={errors.password?.message}
                      touched={touchedFields.password}
                      autoComplete="new-password"
                      icon={<Lock className="w-4 h-4" />}
                      showPasswordToggle
                      onPasswordToggleChange={setShowPassword}
                      aria-label="New password"
                    />
                    {watchPassword && <PasswordStrength password={watchPassword} className="mt-2" />}
                  </div>

                  <FormInput
                    label="Confirm new password"
                    type={showPasswordConfirm ? "text" : "password"}
                    {...register("passwordConfirm")}
                    error={errors.passwordConfirm?.message}
                    touched={touchedFields.passwordConfirm}
                    autoComplete="new-password"
                    icon={<Lock className="w-4 h-4" />}
                    showPasswordToggle
                    onPasswordToggleChange={setShowPasswordConfirm}
                    aria-label="Confirm new password"
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