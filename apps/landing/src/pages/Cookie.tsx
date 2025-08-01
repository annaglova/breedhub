import React from "react";
import Footer from "@/components/Footer";
import LandingFigure from "@/assets/backgrounds/landing-figure.svg?react";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function Cookie() {
  usePageTitle("Cookie Policy");

  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      {/* Background SVG */}
      <div className="absolute right-[-30vw] top-[-13vw] w-full md:right-[-47vw] md:top-[-17vw] xxl:top-[-25vw] xxxl:top-[-32vw]">
        <LandingFigure style={{ width: "80%" }} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="container mx-auto px-6 py-20 max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-8 text-center">
            Cookie Policy
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-8 text-center">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. What Are Cookies</h2>
              <p className="text-gray-700 mb-4">
                Cookies are small text files that are placed on your computer or mobile device when you visit a website. 
                They are widely used to make websites work more efficiently and provide information to the owners of the site.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. How We Use Cookies</h2>
              <p className="text-gray-700 mb-4">
                BreedHub uses cookies and similar tracking technologies to improve your browsing experience and to better 
                understand how you use our platform. We use cookies for the following purposes:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Essential cookies:</strong> Required for the operation of our website</li>
                <li><strong>Performance cookies:</strong> Help us understand how visitors interact with our website</li>
                <li><strong>Functionality cookies:</strong> Remember your preferences and personalize your experience</li>
                <li><strong>Analytics cookies:</strong> Help us improve our website by collecting anonymous usage data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. Types of Cookies We Use</h2>
              
              <h3 className="text-xl font-semibold mb-2 mt-4">Session Cookies</h3>
              <p className="text-gray-700 mb-4">
                These are temporary cookies that expire when you close your browser. We use session cookies to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Remember your login status during your visit</li>
                <li>Maintain your session security</li>
                <li>Enable core platform functionality</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-4">Persistent Cookies</h3>
              <p className="text-gray-700 mb-4">
                These cookies remain on your device for a set period. We use persistent cookies to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Remember your preferences and settings</li>
                <li>Provide a personalized experience on return visits</li>
                <li>Analyze site usage patterns over time</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Third-Party Cookies</h2>
              <p className="text-gray-700 mb-4">
                We may use third-party services that set their own cookies, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Google Analytics:</strong> To understand how visitors use our site</li>
                <li><strong>Supabase:</strong> For authentication and data storage</li>
                <li><strong>Payment processors:</strong> To handle secure transactions</li>
              </ul>
              <p className="text-gray-700 mb-4">
                These third parties may use cookies to collect information about your online activities across different websites.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Cookie Settings and Preferences</h2>
              <p className="text-gray-700 mb-4">
                You can control and manage cookies in various ways:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Browser settings:</strong> Most browsers allow you to refuse or accept cookies</li>
                <li><strong>Device settings:</strong> Mobile devices may have settings to control cookies</li>
                <li><strong>Third-party tools:</strong> Various browser plugins can block tracking cookies</li>
              </ul>
              <p className="text-gray-700 mb-4">
                Please note that blocking certain cookies may impact the functionality of our platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. How to Manage Cookies</h2>
              <p className="text-gray-700 mb-4">
                You can manage cookies through your browser settings. Here are links to cookie management information for popular browsers:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600">Google Chrome</a></li>
                <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600">Mozilla Firefox</a></li>
                <li><a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600">Safari</a></li>
                <li><a href="https://support.microsoft.com/en-us/windows/manage-cookies-in-microsoft-edge-view-allow-block-delete-and-use-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600">Microsoft Edge</a></li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Do Not Track Signals</h2>
              <p className="text-gray-700 mb-4">
                Some browsers offer a "Do Not Track" (DNT) option. Because there is no industry standard for DNT signals, 
                our platform does not currently respond to DNT signals.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Updates to This Policy</h2>
              <p className="text-gray-700 mb-4">
                We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, 
                legal, or regulatory reasons. We will notify you of any material changes by posting the new Cookie Policy on this page.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Contact Us</h2>
              <p className="text-gray-700">
                If you have any questions about our use of cookies, please contact us at:
              </p>
              <p className="text-gray-700 mt-2">
                Email: <a href="mailto:privacy@breedhub" className="text-primary-500 hover:text-primary-600">privacy@breedhub</a>
              </p>
              <p className="text-gray-700">
                Address: Breedhub, Ukraine
              </p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}