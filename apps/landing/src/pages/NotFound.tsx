import LandingFigure from "@/assets/backgrounds/landing-figure.svg?react";
import Footer from "@/components/Footer";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AlertTriangle, ArrowLeft, Home } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFound() {
  usePageTitle("Page Not Found");

  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      {/* Background SVG */}
      <div className="absolute right-[-30vw] top-[-13vw] w-full md:right-[-47vw] md:top-[-17vw] xxl:top-[-25vw] 3xl:top-[-32vw]">
        <LandingFigure style={{ width: "80%" }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="flex-grow flex items-center justify-center px-6">
          <div className="text-center max-w-2xl">
            {/* 404 Icon */}
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-red-100">
                <AlertTriangle className="text-red-500 w-16 h-16" />
              </div>
            </div>

            {/* Error Message */}
            <h1 className="text-6xl md:text-8xl font-bold text-slate-900 mb-4">
              404
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-700 mb-4">
              Page Not Found
            </h2>
            <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
              Oops! The page you're looking for doesn't exist. It might have
              been moved or deleted.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/">
                <button className="w-full sm:w-auto bg-primary-500 text-white px-6 py-3 rounded-lg  hover:bg-primary-600 transition">
                  <Home className="inline-block w-4 h-4 mr-2" />
                  Go to Homepage
                </button>
              </Link>
              <button
                onClick={() => window.history.back()}
                className="w-full sm:w-auto bg-slate-200 text-slate-700 px-6 py-3 rounded-lg  hover:bg-slate-300 transition"
              >
                <ArrowLeft className="inline-block w-4 h-4 mr-2" />
                Go Back
              </button>
            </div>

            {/* Helpful Links */}
            <div className="mt-12 pt-8 border-t border-slate-200">
              <p className="text-slate-600 mb-4">
                Here are some helpful links:
              </p>
              <div className="flex flex-wrap gap-4 justify-center text-sm">
                <Link
                  to="/product"
                  className="text-primary-500 hover:text-primary-600 transition"
                >
                  Product Features
                </Link>
                <span className="text-slate-300">•</span>
                <Link
                  to="/pricing"
                  className="text-primary-500 hover:text-primary-600 transition"
                >
                  Pricing Plans
                </Link>
                <span className="text-slate-300">•</span>
                <Link
                  to="/about"
                  className="text-primary-500 hover:text-primary-600 transition"
                >
                  About Us
                </Link>
                <span className="text-slate-300">•</span>
                <a
                  href="mailto:support@breedhub"
                  className="text-primary-500 hover:text-primary-600 transition"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
