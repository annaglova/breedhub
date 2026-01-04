import { cn } from "@ui/lib/utils";

const requirements = [
  { regex: /.{8,}/ },
  { regex: /[A-Z]/ },
  { regex: /[a-z]/ },
  { regex: /[0-9]/ },
  { regex: /[^A-Za-z0-9]/ },
];

interface PasswordRequirementsProps {
  password: string;
  showTitle?: boolean;
  compact?: boolean;
  className?: string;
}

export function PasswordRequirements({
  password,
  showTitle = true,
  compact = false,
  className,
}: PasswordRequirementsProps) {
  const metRequirements = password
    ? requirements.filter((req) => req.regex.test(password)).length
    : 0;
  const strength = Math.min(metRequirements, 5);

  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = [
    "text-red-600",
    "text-orange-600",
    "text-yellow-600",
    "text-blue-600",
    "text-green-600",
  ];

  if (compact && !password) {
    return (
      <div className={cn("text-xs text-slate-500", className)}>
        Password must contain at least 8 characters, uppercase & lowercase
        letters, numbers, and special characters.
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Password Strength Indicator - Always visible */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-600">Password strength:</span>
          {password ? (
            <span className={cn("text-sm ", strengthColors[strength - 1])}>
              {strengthLabels[strength - 1]}
            </span>
          ) : (
            <span className="text-sm text-slate-400">Not entered</span>
          )}
        </div>

        {/* Strength bars - always visible */}
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-all",
                password && i < strength
                  ? [
                      "bg-red-500",
                      "bg-orange-500",
                      "bg-yellow-500",
                      "bg-blue-500",
                      "bg-green-500",
                    ][strength - 1]
                  : "bg-slate-200"
              )}
            />
          ))}
        </div>
      </div>

      {/* Password Requirements - Always visible */}
      <div>
        <p
          className={cn(
            "leading-relaxed",
            compact ? "text-xs" : "text-sm",
            password ? "text-slate-600" : "text-slate-500"
          )}
        >
          Your password must be at least 8 characters long and include uppercase
          and lowercase letters, numbers, and special characters.
        </p>
      </div>
    </div>
  );
}
