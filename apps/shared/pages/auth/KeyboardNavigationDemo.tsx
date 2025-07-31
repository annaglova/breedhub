import { useState } from "react";
import { TabNavigation } from "@shared/components/auth/TabNavigation";
import { BackButton } from "@shared/components/auth/BackButton";
import { Button } from "@ui/components/button";
import { Info, Keyboard, ArrowLeft, ArrowRight } from "lucide-react";

export default function KeyboardNavigationDemo() {
  const [activeTab, setActiveTab] = useState("instructions");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <BackButton to="/sign-in" className="mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Keyboard Navigation Demo
          </h1>
          <p className="text-gray-600">
            Test keyboard navigation features for accessibility
          </p>
        </div>

        {/* Instructions Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-start space-x-3 mb-4">
            <Keyboard className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Keyboard Shortcuts
              </h2>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span><kbd>←</kbd> Arrow Left: Navigate to previous tab</span>
                </li>
                <li className="flex items-center">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  <span><kbd>→</kbd> Arrow Right: Navigate to next tab</span>
                </li>
                <li className="flex items-center">
                  <span className="w-4 h-4 mr-2 text-center">⇥</span>
                  <span><kbd>Tab</kbd>: Move focus between elements</span>
                </li>
                <li className="flex items-center">
                  <span className="w-4 h-4 mr-2 text-center">↵</span>
                  <span><kbd>Enter</kbd>: Activate focused element</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tab Navigation Demo */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tab Navigation Example
          </h3>
          
          <TabNavigation
            tabs={[
              { id: "instructions", label: "Instructions", icon: <Info className="w-4 h-4" /> },
              { id: "demo", label: "Demo" },
              { id: "code", label: "Code Example" },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            className="mb-6"
          />

          {/* Tab Panels */}
          <div className="mt-6">
            {activeTab === "instructions" && (
              <div
                id="tabpanel-instructions"
                role="tabpanel"
                aria-labelledby="tab-instructions"
                className="space-y-4"
              >
                <p className="text-gray-600">
                  Try using your keyboard to navigate between tabs:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                  <li>Click on any tab to focus it</li>
                  <li>Use arrow keys (← →) to switch between tabs</li>
                  <li>The focused tab will be highlighted with a focus ring</li>
                  <li>Tab content changes as you navigate</li>
                </ol>
              </div>
            )}

            {activeTab === "demo" && (
              <div
                id="tabpanel-demo"
                role="tabpanel"
                aria-labelledby="tab-demo"
                className="space-y-4"
              >
                <p className="text-gray-600 mb-4">
                  This is a demo of keyboard-accessible tab navigation.
                </p>
                <div className="flex space-x-4">
                  <Button>Action 1</Button>
                  <Button variant="outline">Action 2</Button>
                </div>
              </div>
            )}

            {activeTab === "code" && (
              <div
                id="tabpanel-code"
                role="tabpanel"
                aria-labelledby="tab-code"
                className="space-y-4"
              >
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto text-sm">
{`<TabNavigation
  tabs={[
    { id: "tab1", label: "Tab 1" },
    { id: "tab2", label: "Tab 2" },
    { id: "tab3", label: "Tab 3" }
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>`}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Additional Examples */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Accessibility Features:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Full keyboard navigation support</li>
                <li>ARIA labels and roles for screen readers</li>
                <li>Focus indicators for all interactive elements</li>
                <li>Tab order follows visual layout</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}