import React from "react";
import { Link } from "react-router-dom";

// Test component to verify all routes are working
export default function RouteTest() {
  const routes = [
    { path: "/", name: "Landing Page" },
    { path: "/about", name: "About" },
    { path: "/application", name: "Application" },
    { path: "/product", name: "Product" },
    { path: "/pricing", name: "Pricing" },
    { path: "/payment", name: "Payment" },
    { path: "/prepayments", name: "Prepayments" },
    { path: "/terms", name: "Terms" },
    { path: "/terms-and-conditions", name: "Terms (alt)" },
    { path: "/privacy", name: "Privacy" },
    { path: "/privacy-policy", name: "Privacy (alt)" },
    { path: "/cookie", name: "Cookie" },
    { path: "/cookie-policy", name: "Cookie (alt)" },
    { path: "/non-existent-page", name: "404 Test" },
  ];

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs max-h-96 overflow-auto z-50">
      <h3 className="font-bold mb-2">Route Test</h3>
      <ul className="space-y-1 text-sm">
        {routes.map((route) => (
          <li key={route.path}>
            <Link 
              to={route.path} 
              className="text-blue-500 hover:text-blue-700 hover:underline"
            >
              {route.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}