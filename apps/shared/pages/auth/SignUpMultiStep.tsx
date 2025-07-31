import { zodResolver } from "@hookform/resolvers/zod";
import FooterFigure from "@shared/assets/backgrounds/footer-figure.svg?react";
import { AuthButton } from "@shared/components/auth/AuthButton";
import { AuthFooter } from "@shared/components/auth/AuthFooter";
import { AuthHeader } from "@shared/components/auth/AuthHeader";
import { LoadingButton } from "@shared/components/auth/LoadingButton";
import { AuthPageWrapper } from "@shared/components/auth/AuthPageWrapper";
import { ProgressIndicator, ProgressStep } from "@shared/components/auth/ProgressIndicator";
import { BackButton } from "@shared/components/auth/BackButton";
import AuthLayout from "@shared/layouts/AuthLayout";
import { signUpSchema, type SignUpFormData } from "@shared/utils/authSchemas";
import { AuthFormWrapper } from "@ui/components/auth-forms";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import {
  EmailInput,
  PasswordInput,
  TextInput,
} from "@ui/components/form-inputs";
import { useToast } from "@ui/hooks/use-toast";
import { cn } from "@ui/lib/utils";
import { AlertCircle, Mail, User, UserPlus, Building } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

interface StepFormData {
  // Step 1
  name: string;
  email: string;
  // Step 2
  password: string;
  // Step 3
  kennelName?: string;
  agreements: boolean;
}

export default function SignUpMultiStep() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<StepFormData>>({});
  const { toast } = useToast();

  const steps: ProgressStep[] = [
    {
      id: "account",
      label: "Account Info",
      description: "Basic information",
      status: currentStep === 0 ? "current" : currentStep > 0 ? "completed" : "upcoming"
    },
    {
      id: "security",
      label: "Security",
      description: "Create password",
      status: currentStep === 1 ? "current" : currentStep > 1 ? "completed" : "upcoming"
    },
    {
      id: "profile",
      label: "Profile",
      description: "Complete setup",
      status: currentStep === 2 ? "current" : currentStep > 2 ? "completed" : "upcoming"
    }
  ];

  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
    watch,
    trigger,
  } = useForm<StepFormData>({
    resolver: zodResolver(signUpSchema),
    mode: "onChange",
    defaultValues: formData,
  });

  const handleNext = async () => {
    let fieldsToValidate: (keyof StepFormData)[] = [];
    
    switch (currentStep) {
      case 0:
        fieldsToValidate = ["name", "email"];
        break;
      case 1:
        fieldsToValidate = ["password"];
        break;
      case 2:
        fieldsToValidate = ["agreements"];
        break;
    }

    const isValid = await trigger(fieldsToValidate);
    
    if (isValid) {
      const currentData = watch();
      setFormData({ ...formData, ...currentData });
      
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // Submit form
        await onSubmit(currentData);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: StepFormData) => {
    setIsLoading(true);
    
    try {
      // TODO: Implement actual registration
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      toast({
        variant: "success",
        title: "Account created!",
        description: "Please check your email to confirm your account.",
      });
      
      navigate("/confirmation-required");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthPageWrapper>
      <AuthLayout>
        <div className="relative flex min-h-screen w-full flex-col">
          {/* Background SVG */}
          <div className="absolute bottom-0 w-full pointer-events-none z-0">
            <FooterFigure className="w-full h-auto" />
          </div>

          {/* Header */}
          <AuthHeader
            breadcrumbs={[
              { label: "Sign Up", current: true }
            ]}
            rightContent={
              <div className="flex items-center gap-4">
                <span className="hidden text-gray-700 sm:block">
                  Already have an account?
                </span>
                <AuthButton to="/sign-in">Sign in</AuthButton>
              </div>
            }
          />

          {/* Content */}
          <div className="relative z-10 flex flex-1 items-start sm:items-center justify-center px-0 sm:px-6 pb-4 sm:pb-8 pt-2 sm:pt-4">
            <div className="w-full sm:max-w-md animate-scaleIn">
              <div className="bg-transparent sm:bg-white rounded-none sm:rounded-xl sm:shadow-xl p-4 sm:p-6 lg:p-8 sm:border sm:border-gray-100">
                {/* Icon */}
                <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-purple-100 shadow-sm mb-3 sm:mb-4">
                  <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>

                {/* Title */}
                <div className="text-center mb-4 sm:mb-6">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                    Create your account
                  </h1>
                  <p className="mt-1 text-sm text-gray-700">
                    Step {currentStep + 1} of {steps.length}
                  </p>
                </div>

                {/* Progress Indicator */}
                <div className="mb-6">
                  <ProgressIndicator steps={steps} variant="dots" />
                </div>

                {/* Form */}
                <AuthFormWrapper
                  formId="signup-multistep-form"
                  onSubmit={handleSubmit(handleNext)}
                  isLoading={isLoading}
                  className="mt-0"
                >
                  {/* Step 1: Account Info */}
                  {currentStep === 0 && (
                    <div className="space-y-4">
                      <TextInput
                        label="Full name"
                        {...register("name")}
                        error={errors.name?.message}
                        touched={touchedFields.name}
                        autoComplete="name"
                        icon={<User className="w-4 h-4" />}
                        placeholder="Enter your full name"
                      />
                      
                      <EmailInput
                        label="Email address"
                        {...register("email")}
                        error={errors.email?.message}
                        touched={touchedFields.email}
                        autoComplete="email"
                        icon={<Mail className="w-4 h-4" />}
                        placeholder="Enter your email"
                      />
                    </div>
                  )}

                  {/* Step 2: Security */}
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <PasswordInput
                        label="Create password"
                        {...register("password")}
                        error={errors.password?.message}
                        touched={touchedFields.password}
                        autoComplete="new-password"
                        showIcon
                        placeholder="Create a strong password"
                      />
                      
                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-sm text-blue-800">
                          Your password should be at least 8 characters long and include 
                          uppercase, lowercase, numbers, and symbols.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Profile */}
                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <TextInput
                        label="Kennel name (optional)"
                        {...register("kennelName")}
                        icon={<Building className="w-4 h-4" />}
                        placeholder="Enter your kennel name"
                      />
                      
                      <div className="space-y-2">
                        <div className="flex items-start">
                          <Checkbox
                            id="agreements"
                            {...register("agreements")}
                            className={errors.agreements ? "border-red-500" : ""}
                          />
                          <label
                            htmlFor="agreements"
                            className="ml-2 text-sm text-gray-700"
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
                          <p className="text-sm text-red-600 ml-6">
                            {errors.agreements.message}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="mt-6 flex items-center justify-between">
                    {currentStep > 0 ? (
                      <BackButton
                        onClick={handleBack}
                        variant="button"
                        label="Previous"
                      />
                    ) : (
                      <div />
                    )}
                    
                    <LoadingButton
                      type="submit"
                      isLoading={isLoading}
                      loadingText={currentStep === steps.length - 1 ? "Creating..." : "Next"}
                      className="ml-auto px-8"
                    >
                      {currentStep === steps.length - 1 ? "Create account" : "Continue"}
                    </LoadingButton>
                  </div>
                </AuthFormWrapper>

                {/* Sign in link */}
                <p className="mt-6 text-center text-sm sm:text-base text-gray-700">
                  Already have an account?{" "}
                  <Link
                    to="/sign-in"
                    className="font-medium text-primary-600 hover:text-primary-500"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <AuthFooter />
        </div>
      </AuthLayout>
    </AuthPageWrapper>
  );
}