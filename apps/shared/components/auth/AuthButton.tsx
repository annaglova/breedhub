import { Link } from "react-router-dom";

interface AuthButtonProps {
  to?: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export function AuthButton({ 
  to, 
  children, 
  onClick, 
  className = "",
  type = "button",
  disabled = false
}: AuthButtonProps) {
  const buttonElement = (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full font-medium text-base px-6 py-2.5 transform transition-all duration-300 hover:scale-105 text-white relative overflow-hidden bg-primary-500 hover:bg-primary-600 border-2 border-primary-500 hover:border-primary-600 ${
        disabled ? "!bg-slate-300 !border-slate-300 !cursor-not-allowed hover:!bg-slate-300 hover:!border-slate-300" : ""
      } ${className}`}
    >
      {children}
    </button>
  );

  if (to) {
    return <Link to={to}>{buttonElement}</Link>;
  }

  return buttonElement;
}