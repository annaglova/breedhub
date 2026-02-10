import LogoText from "@shared/icons/logo/logo-text.svg?react";
import { Link } from "react-router-dom";
import { cn } from "@ui/lib/utils";

// --- Skeleton building blocks ---

function SkeletonBase({
  headerRight,
  children,
}: {
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen min-h-[100dvh] select-none">
      <div className="relative flex min-h-screen w-full flex-col">
        {/* Header — matches AuthHeader */}
        <div className="relative z-10 flex w-full items-center justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center">
            <Link
              to="/"
              className="flex items-center cursor-pointer relative z-10 rounded p-2 -m-2"
              style={{ border: "none", outline: "none", boxShadow: "none" }}
            >
              <LogoText
                className="h-10 w-auto"
                style={{
                  marginTop: "6px",
                  border: "none",
                  outline: "none",
                  boxShadow: "none",
                }}
              />
            </Link>
          </div>
          {headerRight}
        </div>

        {/* Content — matches auth page card layout */}
        <div className="relative z-10 flex flex-1 items-start sm:items-center justify-center px-0 sm:px-6 pb-4 sm:pb-8 pt-2 sm:pt-4">
          <div className="w-full sm:max-w-md">
            <div className="bg-transparent sm:bg-white rounded-none sm:rounded-xl sm:shadow-xl p-4 sm:p-6 lg:p-8 sm:border sm:border-slate-100 animate-pulse">
              {children}
            </div>
          </div>
        </div>

        {/* Footer — matches AuthFooter height */}
        <footer className="relative z-10 flex h-16 sm:h-20 md:h-24 w-full items-center px-4 sm:px-6 md:px-8">
          <div className="h-4 bg-slate-100 rounded w-48" />
        </footer>
      </div>
    </div>
  );
}

function IconSkeleton() {
  return (
    <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-slate-200 shadow-sm mb-3 sm:mb-4" />
  );
}

function TitleSkeleton() {
  return (
    <div className="space-y-2 text-center mb-4 sm:mb-6">
      <div className="h-8 bg-slate-200 rounded-md mx-auto w-48" />
      <div className="h-4 bg-slate-200 rounded-md mx-auto w-36" />
    </div>
  );
}

function TabsSkeleton() {
  return (
    <div className="flex rounded-lg bg-slate-100 p-[2px] mb-6 sm:mb-4">
      <div className="flex-1 h-10 bg-slate-200 rounded-md mr-[1px]" />
      <div className="flex-1 h-10 bg-slate-100 rounded-md ml-[1px]" />
    </div>
  );
}

function HeaderRightSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <div className="h-4 w-32 bg-slate-200 rounded hidden sm:block" />
      <div className="h-10 w-20 bg-slate-200 rounded-full" />
    </div>
  );
}

function FooterLinkSkeleton() {
  return (
    <div className="mt-6 flex justify-center items-center space-x-2">
      <div className="h-4 bg-slate-200 rounded w-40" />
      <div className="h-4 bg-slate-200 rounded w-14" />
    </div>
  );
}

// --- Page-specific skeletons ---

export function SignInSkeleton() {
  return (
    <SkeletonBase>
      <IconSkeleton />
      <TitleSkeleton />
      <TabsSkeleton />

      {/* Social buttons area — matches sm:h-[340px] container */}
      <div className="relative h-auto sm:h-[340px]">
        <div className="sm:absolute sm:inset-0 flex flex-col justify-center">
          <div className="space-y-7 mt-2 sm:mt-0">
            <div className="h-12 bg-slate-200 rounded-xl" />
            <div className="h-12 bg-slate-200 rounded-xl" />
            <div className="h-12 bg-slate-200 rounded-xl" />
          </div>
          <div className="h-4 bg-slate-200 rounded w-40 mx-auto mt-5" />
        </div>
      </div>

      <FooterLinkSkeleton />
    </SkeletonBase>
  );
}

export function SignUpSkeleton() {
  return (
    <SkeletonBase headerRight={<HeaderRightSkeleton />}>
      <IconSkeleton />
      <TitleSkeleton />
      <TabsSkeleton />

      {/* Social buttons area — matches sm:h-[350px] container */}
      <div className="relative h-auto sm:h-[350px]">
        <div className="sm:absolute sm:inset-0 flex flex-col justify-center">
          <div className="space-y-7 mt-2 sm:mt-0">
            <div className="h-12 bg-slate-200 rounded-xl" />
            <div className="h-12 bg-slate-200 rounded-xl" />
            <div className="h-12 bg-slate-200 rounded-xl" />
          </div>
          <div className="h-4 bg-slate-200 rounded w-44 mx-auto mt-6" />
        </div>
      </div>

      <FooterLinkSkeleton />
    </SkeletonBase>
  );
}

export function ForgotPasswordSkeleton() {
  return (
    <SkeletonBase headerRight={<HeaderRightSkeleton />}>
      <IconSkeleton />
      <TitleSkeleton />

      {/* Email input */}
      <div>
        <div className="h-4 bg-slate-200 rounded w-24 mb-2" />
        <div className="h-10 bg-slate-200 rounded-md" />
      </div>

      {/* Button */}
      <div className="h-12 bg-slate-200 rounded-xl mt-6" />

      <FooterLinkSkeleton />
    </SkeletonBase>
  );
}

export function ResetPasswordSkeleton() {
  return (
    <SkeletonBase headerRight={<HeaderRightSkeleton />}>
      <IconSkeleton />
      <TitleSkeleton />

      <div className="space-y-3">
        {/* Password input 1 */}
        <div>
          <div className="h-4 bg-slate-200 rounded w-28 mb-2" />
          <div className="h-10 bg-slate-200 rounded-md" />
          {/* Password requirements */}
          <div className="mt-3 space-y-2">
            <div className="h-3 bg-slate-200 rounded w-32" />
            <div className="h-3 bg-slate-200 rounded w-36" />
            <div className="h-3 bg-slate-200 rounded w-28" />
            <div className="h-3 bg-slate-200 rounded w-40" />
          </div>
        </div>

        {/* Password input 2 */}
        <div>
          <div className="h-4 bg-slate-200 rounded w-40 mb-2" />
          <div className="h-10 bg-slate-200 rounded-md" />
        </div>
      </div>

      {/* Button */}
      <div className="h-12 bg-slate-200 rounded-xl mt-6" />
    </SkeletonBase>
  );
}

// --- Legacy skeletons (used by AuthPageWrapper) ---

interface AuthFormSkeletonProps {
  className?: string;
}

export function AuthFormSkeleton({ className }: AuthFormSkeletonProps) {
  return (
    <div className={cn("animate-pulse", className)}>
      <IconSkeleton />
      <TitleSkeleton />
      <TabsSkeleton />

      <div className="space-y-4">
        <div>
          <div className="h-4 bg-slate-200 rounded w-20 mb-2" />
          <div className="h-10 bg-slate-200 rounded-md" />
        </div>
        <div>
          <div className="h-4 bg-slate-200 rounded w-24 mb-2" />
          <div className="h-10 bg-slate-200 rounded-md" />
        </div>
        <div className="flex items-center">
          <div className="h-4 w-4 bg-slate-200 rounded mr-2" />
          <div className="h-4 bg-slate-200 rounded w-32" />
        </div>
        <div className="h-12 bg-slate-200 rounded-xl mt-6" />
      </div>

      <FooterLinkSkeleton />
    </div>
  );
}

export function AuthLayoutSkeleton() {
  return (
    <div className="relative flex min-h-screen w-full flex-col animate-pulse">
      <div className="relative z-20 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Link
          to="/"
          className="p-2 -m-2"
          style={{ border: "none", outline: "none", boxShadow: "none" }}
        >
          <LogoText
            className="h-8 w-auto"
            style={{ border: "none", outline: "none", boxShadow: "none" }}
          />
        </Link>
        <div className="flex items-center gap-4">
          <div className="h-4 w-20 bg-slate-200 rounded hidden sm:block" />
          <div className="h-10 w-24 bg-slate-200 rounded-md" />
        </div>
      </div>

      <div className="relative z-10 flex flex-1 items-start sm:items-center justify-center px-0 sm:px-6 pb-4 sm:pb-8 pt-2 sm:pt-4">
        <div className="w-full sm:max-w-md">
          <div className="bg-transparent sm:bg-white rounded-none sm:rounded-xl sm:shadow-xl p-4 sm:p-6 lg:p-8 sm:border sm:border-slate-100">
            <AuthFormSkeleton />
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-auto border-t border-slate-100 py-4 text-center">
        <div className="flex justify-center space-x-6">
          <div className="h-4 w-16 bg-slate-200 rounded" />
          <div className="h-4 w-20 bg-slate-200 rounded" />
          <div className="h-4 w-12 bg-slate-200 rounded" />
        </div>
      </div>
    </div>
  );
}
