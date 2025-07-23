export function AuthFooter() {
  return (
    <div className="relative z-10 flex h-16 sm:h-20 md:h-24 w-full items-center px-4 sm:px-6 md:px-8">
      <span className="font-medium text-white text-sm sm:text-base">
        Breedhub &copy; {new Date().getFullYear()} <span className="hidden sm:inline">| With ♥ from Ukraine</span>
        <span className="sm:hidden">| ♥ UA</span>
      </span>
    </div>
  );
}