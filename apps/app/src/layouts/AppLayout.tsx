import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { LoadingBar } from "@/components/shared/LoadingBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  useSignals();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Hide sidebar menu on 3xl in fullscreen mode
  const isFullscreen = spaceStore.isFullscreen.value;
  const [screenHeight, setScreenHeight] = useState(window.innerHeight);
  const [topBarHeight, setTopBarHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);

  const topBarRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  // Custom breakpoints
  const is3XL = useMediaQuery("(min-width: 1920px)"); // 3xl
  const isLG = useMediaQuery("(min-width: 1280px)");   // lg

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

  return (
    <div className="layout-container bg-slate-100 flex flex-col h-screen">
      <LoadingBar />

      {/* Main wrapper with sidebar and content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar - starts from top, hidden on 3xl (replaced by menu in content) */}
        <Sidebar
          isCollapsed={!isSidebarOpen}
          className={cn(
            "h-full z-20",
            "hidden lg:block 3xl:hidden",
            isSidebarOpen ? "w-64" : "w-16"
          )}
        />

        {/* Mobile sidebar overlay */}
        {isMobileSidebarOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <Sidebar
              isCollapsed={false}
              onClose={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-[60] mobile-sidebar-enter"
            />
          </>
        )}

        {/* Content wrapper */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <Header
            ref={topBarRef}
            onMenuClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          />

          {/* Content area - centered with max-width on ultra-wide screens */}
          <div className="flex flex-1 overflow-hidden lg:pr-5 3xl:pr-0 3xl:justify-center">
            {/* Content container with max-width */}
            <div className="flex flex-1 3xl:flex-initial 3xl:w-full 3xl:max-w-[2016px]">
              {/* Left menu column - only on 3xl, empty in fullscreen */}
              {is3XL && (
                <div className="hidden w-64 pr-5 3xl:block shrink-0">
                  {!isFullscreen && <Sidebar isCollapsed={false} asMenu />}
                </div>
              )}

              {/* Main content */}
              <main
                className="flex-1 overflow-hidden 3xl:max-w-[1504px]"
                style={isLG ? { height: `${mainHeight - 20}px` } : undefined}
              >
                <Outlet />
              </main>

              {/* Right spacer column - only on 3xl */}
              {is3XL && <div className="hidden w-64 pl-5 3xl:block shrink-0" />}
            </div>
          </div>
        </div>
      </div>

      {/* Footer - shows workspace navigation on mobile (< sm), copyright on sm+ */}
      <Footer ref={footerRef} className="bg-footer-ground" />
    </div>
  );
}
