import { zodResolver } from "@hookform/resolvers/zod";
import FooterFigure from "@shared/assets/backgrounds/footer-figure.svg?react";
import { AuthFooter } from "@shared/components/auth/AuthFooter";
import { AuthHeader } from "@shared/components/auth/AuthHeader";
import { PasswordRequirements } from "@shared/components/auth/PasswordRequirements";
import { Spinner } from "@shared/components/auth/Spinner";
import AuthLayout from "@shared/layouts/AuthLayout";
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from "@shared/utils/authSchemas";
import {
  logSecurityEvent,
  sanitizeErrorMessage,
} from "@shared/utils/securityUtils";
import { AuthFormWrapper } from "@ui/components/auth-forms";
import { Button } from "@ui/components/button";
import { PasswordInput } from "@ui/components/form-inputs";
import { useToast } from "@ui/hooks/use-toast";
import { AlertCircle, Key } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/core/supabase";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const { toast } = useToast();

  // Wait for Supabase to establish session from URL hash tokens
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
          setSessionReady(true);
        }
      }
    );

    // Check if session already exists (e.g. tokens already processed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

    if (!sessionReady) {
      setGeneralError("Your reset link has expired or is invalid. Please request a new one.");
      return;
    }

    setIsLoading(true);

    try {
      // Supabase handles session from reset link automatically via onAuthStateChange
      // We just need to update the password
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });
      if (error) {
        throw error;
      }

      logSecurityEvent({
        type: "password_reset",
        details: { status: "success" },
      });

      // Show success message
      toast({
        variant: "success",
        title: "Password reset!",
        description: "Your password has been successfully reset.",
      });

      // Redirect
      navigate("/sign-in?reset=success");
    } catch (error) {
      const errorMessage = sanitizeErrorMessage(error);
      setGeneralError(errorMessage);
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
        <AuthHeader />

        {/* Content */}
        <div className="relative z-10 flex flex-1 items-start sm:items-center justify-center px-0 sm:px-6 pb-4 sm:pb-8 pt-2 sm:pt-4">
          <div className="w-full sm:max-w-md animate-scaleIn">
            <div className="bg-transparent sm:bg-white rounded-none sm:rounded-xl sm:shadow-xl p-4 sm:p-6 lg:p-8 sm:border sm:border-slate-100">
              {/* Icon */}
              <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-purple-100 shadow-sm mb-3 sm:mb-4">
                <Key className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>

              {/* Title */}
              <div className="text-center mb-4 sm:mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  Reset your password
                </h1>
                <p className="mt-1 text-sm text-slate-700">
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
                      helperText="Password must comply with security requirements"
                    />
                    <div className="mt-3">
                      <PasswordRequirements
                        password={watchPassword}
                        showTitle={true}
                        compact={false}
                      />
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

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="mt-4 w-full h-12 bg-primary-500 hover:bg-primary-600 text-white text-base font-semibold rounded-xl transition-all transform hover:scale-[1.02] hover:shadow-lg focus-visible:outline-none focus-visible:ring-0"
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

                {generalError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md animate-fadeIn">
                    <p className="text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {generalError}
                    </p>
                  </div>
                )}
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
