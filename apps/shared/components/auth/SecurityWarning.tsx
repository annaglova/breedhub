import { cn } from "@ui/lib/utils";

interface SecurityWarningProps {
  message: string;
  type?: "warning" | "error" | "info";
  className?: string;
}

export function SecurityWarning({
  message,
  type = "warning",
  className,
}: SecurityWarningProps) {
  const icons = {
    warning: "pi-exclamation-triangle",
    error: "pi-exclamation-circle",
    info: "pi-info-circle",
  };

  const styles = {
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };

  return (
    <div
      className={cn(
        "p-4 rounded-lg border animate-slideDown",
        styles[type],
        className
      )}
    >
      <div className="flex items-start">
        <i className={cn("pi text-lg mr-3 mt-0.5", icons[type])} />
        <div className="flex-1">
          <p className="text-sm ">{message}</p>
        </div>
      </div>
    </div>
  );
}
