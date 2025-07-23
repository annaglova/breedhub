export function AuthFooter() {
  return (
    <div className="relative z-10 flex h-20 w-full items-center px-6 sm:h-24 md:px-8">
      <span className="font-medium text-white text-base">
        Breedhub &copy; {new Date().getFullYear()} | With ♥ from Ukraine
      </span>
    </div>
  );
}