import { cn } from "@ui/lib/utils";
import { useEffect, useState } from "react";

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export function PasswordStrength({
  password,
  className,
}: PasswordStrengthProps) {
  const [strength, setStrength] = useState(0);
  const [feedback, setFeedback] = useState<string[]>([]);

  useEffect(() => {
    const calculateStrength = () => {
      let score = 0;
      const checks = [];

      if (password.length >= 8) {
        score += 1;
      } else if (password.length > 0) {
        checks.push("Use at least 8 characters");
      }

      if (/[A-Z]/.test(password)) {
        score += 1;
      } else if (password.length > 0) {
        checks.push("Include uppercase letter");
      }

      if (/[a-z]/.test(password)) {
        score += 1;
      } else if (password.length > 0) {
        checks.push("Include lowercase letter");
      }

      if (/[0-9]/.test(password)) {
        score += 1;
      } else if (password.length > 0) {
        checks.push("Include number");
      }

      if (/[^A-Za-z0-9]/.test(password)) {
        score += 1;
      } else if (password.length > 0) {
        checks.push("Include special character");
      }

      setStrength(score);
      setFeedback(checks);
    };

    calculateStrength();
  }, [password]);

  if (!password) return null;

  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-blue-500",
    "bg-green-500",
  ];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-600">Password strength:</span>
        <span
          className={cn(
            "text-sm ",
            strength === 0 && "text-red-600",
            strength === 1 && "text-orange-600",
            strength === 2 && "text-yellow-600",
            strength === 3 && "text-blue-600",
            strength === 4 && "text-green-600",
            strength === 5 && "text-green-600"
          )}
        >
          {strengthLabels[strength]}
        </span>
      </div>
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all",
              i < strength ? strengthColors[strength - 1] : "bg-slate-200"
            )}
          />
        ))}
      </div>
    </div>
  );
}
