interface Patron {
  name: string;
  contributions?: number;
  avatar?: string;
}

interface TopPatronsProps {
  patrons: Patron[];
  maxDisplay?: number;
  className?: string;
}

// Get initials from name
function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function TopPatrons({
  patrons,
  maxDisplay = 3,
  className = "",
}: TopPatronsProps) {
  if (!patrons || patrons.length === 0) {
    return null;
  }

  return (
    <div className={`flex -space-x-2 ${className}`}>
      {patrons.slice(0, maxDisplay).map((patron, index) => (
        <div
          key={index}
          className="w-6 h-6 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-200 text-[10px] border border-gray-300 dark:border-gray-400 font-semibold shadow-sm bg-gray-200 dark:bg-gray-700"
          style={{
            boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.5)",
            backgroundImage: patron.avatar
              ? `url(${patron.avatar})`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          title={patron.name}
        >
          {!patron.avatar && (
            <span className="select-none">{getInitials(patron.name)}</span>
          )}
        </div>
      ))}
    </div>
  );
}
