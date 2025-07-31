import { useState, useEffect } from "react";
import { Button } from "@ui/components/button";
import { cn } from "@ui/lib/utils";
import { Eye, EyeOff, Volume2, Info, CheckCircle, AlertCircle } from "lucide-react";

interface ScreenReaderTestPanelProps {
  className?: string;
  defaultOpen?: boolean;
}

/**
 * Development tool for testing screen reader compatibility
 * Shows ARIA attributes, roles, and announces changes
 */
export function ScreenReaderTestPanel({ 
  className,
  defaultOpen = false 
}: ScreenReaderTestPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [ariaElements, setAriaElements] = useState<HTMLElement[]>([]);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null);

  // Only show in development
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  useEffect(() => {
    if (!isOpen) return;

    // Find all elements with ARIA attributes
    const findAriaElements = () => {
      const elements = document.querySelectorAll<HTMLElement>([
        '[role]',
        '[aria-label]',
        '[aria-labelledby]',
        '[aria-describedby]',
        '[aria-live]',
        '[aria-invalid]',
        '[aria-selected]',
        '[aria-current]',
        '[aria-expanded]',
        '[aria-hidden="false"]',
        '[tabindex]'
      ].join(','));
      
      setAriaElements(Array.from(elements));
    };

    // Monitor live regions
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const target = mutation.target as HTMLElement;
        const liveRegion = target.closest('[aria-live], [role="alert"], [role="status"]');
        
        if (liveRegion && mutation.type === 'childList') {
          const text = liveRegion.textContent?.trim();
          if (text) {
            setAnnouncements(prev => [...prev.slice(-4), `[${new Date().toLocaleTimeString()}] ${text}`]);
          }
        }
      });
    });

    // Monitor focus changes
    const handleFocus = (e: FocusEvent) => {
      setFocusedElement(e.target as HTMLElement);
    };

    // Start monitoring
    findAriaElements();
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    
    document.addEventListener('focus', handleFocus, true);
    
    // Re-scan periodically
    const interval = setInterval(findAriaElements, 2000);

    return () => {
      observer.disconnect();
      document.removeEventListener('focus', handleFocus, true);
      clearInterval(interval);
    };
  }, [isOpen]);

  const getAriaInfo = (element: HTMLElement) => {
    const info: Record<string, string> = {};
    
    // Get all ARIA attributes
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('aria-') || attr.name === 'role') {
        info[attr.name] = attr.value;
      }
    });
    
    // Get computed label
    const label = element.getAttribute('aria-label') || 
                 element.getAttribute('aria-labelledby') ||
                 element.textContent?.trim().substring(0, 50);
    
    return { info, label };
  };

  const highlightElement = (element: HTMLElement) => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.style.outline = '3px solid #6366f1';
    element.style.outlineOffset = '2px';
    
    setTimeout(() => {
      element.style.outline = '';
      element.style.outlineOffset = '';
    }, 2000);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-4 right-4 z-50",
          "bg-purple-600 text-white p-3 rounded-full shadow-lg",
          "hover:bg-purple-700 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2",
          className
        )}
        aria-label="Toggle screen reader test panel"
      >
        {isOpen ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>

      {/* Test Panel */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-40 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-purple-600 text-white p-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Volume2 className="w-5 h-5 mr-2" />
              Screen Reader Test Panel
            </h2>
            <p className="text-sm text-purple-100 mt-1">
              Development tool for accessibility testing
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Currently Focused */}
            {focusedElement && (
              <div className="p-4 border-b">
                <h3 className="font-medium text-gray-900 mb-2">Currently Focused</h3>
                <div className="bg-blue-50 p-3 rounded-md text-sm">
                  <p className="font-mono text-xs text-blue-900">
                    {focusedElement.tagName.toLowerCase()}
                    {focusedElement.id && `#${focusedElement.id}`}
                    {focusedElement.className && `.${focusedElement.className.split(' ')[0]}`}
                  </p>
                  {Object.entries(getAriaInfo(focusedElement).info).map(([key, value]) => (
                    <div key={key} className="mt-1">
                      <span className="text-blue-700">{key}:</span> {value}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Announcements */}
            <div className="p-4 border-b">
              <h3 className="font-medium text-gray-900 mb-2">Live Announcements</h3>
              {announcements.length > 0 ? (
                <div className="space-y-2">
                  {announcements.map((announcement, index) => (
                    <div key={index} className="bg-green-50 p-2 rounded text-sm text-green-800">
                      {announcement}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No announcements yet</p>
              )}
            </div>

            {/* ARIA Elements */}
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-2">
                ARIA Elements ({ariaElements.length})
              </h3>
              <div className="space-y-2">
                {ariaElements.slice(0, 20).map((element, index) => {
                  const { info, label } = getAriaInfo(element);
                  return (
                    <button
                      key={index}
                      onClick={() => highlightElement(element)}
                      className="w-full text-left p-2 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <div className="text-sm font-mono text-gray-700">
                        {element.tagName.toLowerCase()}
                        {element.id && <span className="text-purple-600">#{element.id}</span>}
                      </div>
                      {label && (
                        <div className="text-xs text-gray-600 truncate">
                          {label}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {Object.entries(info).map(([key, value]) => (
                          <span key={key} className="mr-2">
                            {key}="{value}"
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-4 bg-gray-50">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-gray-600">
                <p>This panel helps test screen reader compatibility.</p>
                <p className="mt-1">Click elements to highlight them on the page.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}