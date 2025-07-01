import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { TIERS, THREE_YEARLY, YEARLY, MONTHLY } from "@/constants/pricing";

// Fondy configuration
const FONDY_MERCHANT_ID = 1396424;
const FONDY_SERVER_CALLBACK = "https://addmessage-g5gclys73a-uc.a.run.app/";

interface FondyOptions {
  merchant_id: number;
  amount: number;
  currency: string;
  order_desc: string;
  server_callback_url: string;
  lang: string;
  recurring_data?: {
    every: number;
    period: string;
    amount: number;
    start_time: string;
    end_time: string;
  };
}

declare global {
  interface Window {
    fondy: (action: string, options: FondyOptions) => void;
  }
}

export default function Payment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const checkoutRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get payment parameters from URL
  const breed = searchParams.get("breed");
  const product = searchParams.get("product");
  const billingType = searchParams.get("billingType");
  const customPrice = searchParams.get("customPrice");
  const isGift = searchParams.get("gift") === "true";

  useEffect(() => {
    // Redirect to prepayment if no breed selected and not a gift
    if (!breed && !isGift) {
      navigate("/prepayments");
      return;
    }

    // Load Fondy script
    const script = document.createElement("script");
    script.src = "/assets/lib/checkout.js";
    script.async = true;
    script.onload = () => {
      setIsLoading(false);
      initializePayment();
    };
    script.onerror = () => {
      setError("Failed to load payment processor. Please try again.");
      setIsLoading(false);
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [breed, isGift, navigate]);

  const initializePayment = () => {
    if (!window.fondy) {
      setError("Payment processor not available. Please try again.");
      return;
    }

    // Find the selected tier
    const tier = TIERS.find(t => t.name === product);
    if (!tier && product !== "Supreme Patron") {
      setError("Invalid product selected.");
      return;
    }

    // Get the price based on billing type
    let price = 0;
    if (product === "Supreme Patron" && customPrice) {
      price = parseFloat(customPrice);
    } else if (tier) {
      const billingIndex = parseInt(billingType || "1");
      price = tier.prices[billingIndex]?.value || 0;
    }

    if (price === 0 && product !== "Free forever") {
      setError("Invalid price configuration.");
      return;
    }

    // Configure payment options
    const options: FondyOptions = {
      merchant_id: FONDY_MERCHANT_ID,
      amount: Math.round(price * 100), // Convert to cents
      currency: "USD",
      order_desc: isGift ? `Gift subscription: ${product}` : `${product} subscription`,
      server_callback_url: FONDY_SERVER_CALLBACK,
      lang: "en",
    };

    // Add recurring data for subscriptions (not gifts)
    if (!isGift && price > 0) {
      const currentDate = new Date();
      const endDate = new Date();
      
      let period = "month";
      let every = 1;

      if (billingType === "0") { // 3-yearly
        period = "month";
        every = 36;
        endDate.setFullYear(endDate.getFullYear() + 3);
      } else if (billingType === "1") { // yearly
        period = "month";
        every = 12;
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else { // monthly
        period = "month";
        every = 1;
        endDate.setMonth(endDate.getMonth() + 1);
      }

      options.recurring_data = {
        every,
        period,
        amount: Math.round(price * 100),
        start_time: currentDate.toISOString().split('T')[0],
        end_time: endDate.toISOString().split('T')[0],
      };
    }

    // Initialize Fondy checkout
    try {
      window.fondy("checkout", options);
    } catch (err) {
      setError("Failed to initialize payment. Please try again.");
      console.error("Fondy initialization error:", err);
    }
  };

  const getBillingPeriodText = () => {
    switch (billingType) {
      case "0": return THREE_YEARLY;
      case "1": return YEARLY;
      case "2": return MONTHLY;
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {isLoading && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            <p className="mt-4 text-gray-600">Loading payment processor...</p>
          </div>
        )}

        {error && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-red-500 mb-4">
              <i className="pi pi-exclamation-circle text-4xl" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Payment Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition"
            >
              Go Back
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Complete Your Payment</h2>
            <div className="mb-6 text-gray-600">
              <p><strong>Product:</strong> {product}</p>
              {!isGift && <p><strong>Billing:</strong> {getBillingPeriodText()}</p>}
              {product === "Supreme Patron" && customPrice && (
                <p><strong>Amount:</strong> ${customPrice}/month</p>
              )}
              {isGift && <p className="text-sm mt-2 text-green-600">This is a gift subscription</p>}
            </div>
            
            {/* Fondy checkout container */}
            <div ref={checkoutRef} id="checkout"></div>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-500 hover:text-gray-700 underline"
              >
                Cancel and go back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}