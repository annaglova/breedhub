import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { LoadingBar } from "@/components/layout/LoadingBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@ui/lib/utils";
import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [screenHeight, setScreenHeight] = useState(window.innerHeight);
  const [topBarHeight, setTopBarHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);

  const topBarRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  // xxxl breakpoint - 1920px
  const isXXXL = useMediaQuery("(min-width: 1920px)");

  // Measure heights
  useEffect(() => {
    const measureHeights = () => {
      if (topBarRef.current) {
        setTopBarHeight(topBarRef.current.offsetHeight);
      }
      if (footerRef.current) {
        setFooterHeight(footerRef.current.offsetHeight);
      }
    };

    measureHeights();
    window.addEventListener("resize", measureHeights);

    const handleResize = () => {
      setScreenHeight(window.innerHeight);
      measureHeights();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const mainHeight = screenHeight - topBarHeight - footerHeight;
  const isReady = screenHeight >= 0 && topBarHeight >= 0 && footerHeight >= 0;

  return (
    <div className="layout-container bg-gray-100 flex flex-col">
      <LoadingBar />

      {/* Main wrapper with sidebar and content */}
      <div className="flex flex-1">
        {/* Sidebar - starts from top */}
        <Sidebar
          isCollapsed={!isSidebarOpen}
          className={cn(
            "h-full z-20",
            "hidden lg:block 3xl:hidden border border-blue-500",
            isSidebarOpen ? "w-64" : "w-16"
          )}
        />

        {/* Mobile sidebar overlay */}
        {isMobileSidebarOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <Sidebar
              isCollapsed={false}
              onClose={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-50 mobile-sidebar-enter"
            />
          </>
        )}

        {/* Content wrapper */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div ref={topBarRef} className="border border-red-500">
            <Header
              onMenuClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            />
          </div>

          {/* Content area */}
          <div className="flex flex-1 overflow-hidden border border-green-500">
            {isReady && (
              <div className="flex-1 3xl:flex 3xl:justify-center">
                {/* Left menu column - only on xxxl */}
                {isXXXL && (
                  <div className="hidden w-64 pr-5 3xl:block">
                    <Sidebar isCollapsed={false} asMenu />
                  </div>
                )}

                {/* Main content */}
                <main
                  className="flex-1 overflow-hidden"
                  style={{ height: `${mainHeight}px` }}
                >
                  <Outlet />
                </main>

                {/* Right spacer column - only on xxxl */}
                {isXXXL && <div className="hidden w-64 pl-5 3xl:block" />}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer - full width */}
      <div ref={footerRef}>
        <Footer className="bg-footer-ground" />
      </div>
    </div>
  );
}
