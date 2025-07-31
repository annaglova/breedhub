import FooterFigure from "@shared/assets/backgrounds/footer-figure.svg?react";
import { AuthFooter } from "@shared/components/auth/AuthFooter";
import { AuthHeader } from "@shared/components/auth/AuthHeader";
import { AuthButton } from "@shared/components/auth/AuthButton";
import { PasswordInput } from "@ui/components/form-inputs";
import { AuthFormWrapper } from "@ui/components/auth-forms";
import { PasswordStrength } from "@shared/components/auth/PasswordStrength";
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
  const [generalError, setGeneralError] = useState("");
  
  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
    watch,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange",
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
      
      // Shake animation handled by AuthFormWrapper
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
            <span className="hidden text-gray-700 sm:block">Return to</span>
            <AuthButton to="/sign-in">
              Login page
            </AuthButton>
          </div>
        } />

        {/* Content */}
        <div className="relative z-10 flex flex-1 items-start sm:items-center justify-center px-0 sm:px-6 pb-4 sm:pb-8 pt-2 sm:pt-4">
          <div className="w-full sm:max-w-md animate-scaleIn">
            <div className="bg-transparent sm:bg-white rounded-none sm:rounded-xl sm:shadow-xl p-4 sm:p-6 lg:p-8 sm:border sm:border-gray-100">
            {/* Icon */}
            <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-purple-100 shadow-sm mb-3 sm:mb-4">
              <Key className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>

            {/* Title */}
            <div className="text-center mb-4 sm:mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                Reset your password
              </h1>
              <p className="mt-1 text-sm text-gray-700">
                Create a new password for your account
              </p>
            </div>

              {/* Form */}
              <AuthFormWrapper 
                formId="reset-form" 
                onSubmit={handleSubmit(onSubmit)} 
                isLoading={isLoading}
                className="mt-0"
              >
                <div className="space-y-1">
                  <div>
                    <PasswordInput
                      label="New password"
                      {...register("password")}
                      error={errors.password?.message}
                      touched={touchedFields.password}
                      autoComplete="new-password"
                      showIcon
                      aria-label="New password"
                      placeholder="Enter new password"
                    />
                    <div className="h-12 mt-2">
                      {watchPassword && (
                        <PasswordStrength password={watchPassword} />
                      )}
                    </div>
                  </div>

                  <PasswordInput
                    label="Confirm new password"
                    {...register("passwordConfirm")}
                    error={errors.passwordConfirm?.message}
                    touched={touchedFields.passwordConfirm}
                    autoComplete="new-password"
                    showIcon
                    aria-label="Confirm new password"
                    placeholder="Confirm new password"
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
                  className="mt-6 w-full h-12 bg-primary-500 hover:bg-primary-600 text-white text-base font-semibold rounded-xl transition-all transform hover:scale-[1.02] hover:shadow-lg"
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
              </AuthFormWrapper>
            </div>
          </div>
        </div>

        {/* Footer */}
        <AuthFooter />
      </div>
    </AuthLayout>
  );
}