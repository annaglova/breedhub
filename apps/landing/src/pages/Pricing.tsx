import HeaderFigure from "@/assets/backgrounds/header-figure.svg?react";
import FeatureTier from "@/components/FeatureTier";
import TierSelector from "@/components/TierSelector";
import { FEATURE_BLOCKS } from "@/constants/featureBlocks";
import { TIERS, YEARLY_NUMBER } from "@/constants/pricing";
import LandingLayout from "@/layouts/LandingLayout";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function Pricing() {
  const [selectedBillingType, setSelectedBillingType] = useState(YEARLY_NUMBER);
  const [showMobileTier, setShowMobileTier] = useState(0);

  // FAQ data
  const faqItems = [
    {
      question: "Can I change my plan later?",
      answer:
        "Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.",
    },
    {
      question: "What payment methods do you accept?",
      answer:
        "We accept all major credit cards, PayPal, and bank transfers for annual subscriptions.",
    },
    {
      question: "Is there a free trial?",
      answer:
        "The Free Forever plan gives you access to core features indefinitely. You can upgrade anytime to access premium features.",
    },
    {
      question: "Do you offer refunds?",
      answer:
        "We offer a 30-day money-back guarantee for all paid plans. No questions asked.",
    },
  ];

  return (
    <LandingLayout>
      <div className="relative  overflow-hidden">
        {/* Background SVG */}
        <div className="absolute top-0 right-0 w-full h-full pointer-events-none">
          <HeaderFigure className="absolute top-[-20%] right-[-30%] w-[150%] h-auto opacity-50" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="container mx-auto px-6 pt-14 sm:pt-32 text-center">
            <h1>
              Choose Your <span className="text-white">Plan</span>
            </h1>
            <p className="text-2xl text-gray-600 xl:text-white max-w-3xl mx-auto mt-2">
              Join thousands of professional breeders who trust BreedHub to
              manage their breeding programs
            </p>
          </div>

          {/* Tier Selector */}
          <div className="container mx-auto px-6 mb-20 mt-14">
            <TierSelector onBillingTypeChange={setSelectedBillingType} />
          </div>

          {/* Features Comparison Section */}
          <div className="bg-gray-50 py-20">
            <div className="container mx-auto px-6">
              <h2 className="text-4xl font-bold text-center mb-12">
                Compare Features
              </h2>

              {/* Desktop Features Table */}
              <div className="hidden lg:block">
                <div className="grid grid-cols-4 gap-4 mb-8">
                  <div></div>
                  {TIERS.slice(0, 3).map((tier, index) => (
                    <div key={index} className="text-center">
                      <h4 className="font-bold text-lg">{tier.name}</h4>
                    </div>
                  ))}
                </div>

                {/* Feature Categories */}
                {FEATURE_BLOCKS.map((category, catIndex) => (
                  <div key={catIndex} className="mb-12">
                    <div className="bg-red-50 rounded-lg p-3 mb-4">
                      <h3 className="text-xl font-bold text-red-700">
                        {category.name}
                      </h3>
                    </div>
                    {category.features.map((feature, featIndex) => (
                      <div
                        key={featIndex}
                        className="grid grid-cols-4 gap-4 py-3 border-b border-gray-200"
                      >
                        <div>
                          <p className="font-medium">{feature.name}</p>
                          {feature.status === "COMING SOON" && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              Coming Soon
                            </span>
                          )}
                        </div>
                        <div className="text-center">
                          <FeatureTier featureTier={feature.tier1} />
                        </div>
                        <div className="text-center">
                          <FeatureTier featureTier={feature.tier2} />
                        </div>
                        <div className="text-center">
                          <FeatureTier featureTier={feature.tier3} />
                        </div>
                      </div>
                    ))}
                    {/* Action buttons row */}
                    <div className="grid grid-cols-4 gap-4 py-4 mt-2">
                      <div></div>
                      <div className="text-center">
                        <Link
                          to="/app"
                          className="text-primary-500 hover:text-primary-600 font-medium text-sm"
                        >
                          Get Started →
                        </Link>
                      </div>
                      <div className="text-center">
                        <Link
                          to={`/payment?product=${encodeURIComponent(
                            TIERS[1].name
                          )}&billingType=${selectedBillingType}`}
                          className="text-primary-500 hover:text-primary-600 font-medium text-sm"
                        >
                          Choose Plan →
                        </Link>
                      </div>
                      <div className="text-center">
                        <Link
                          to={`/payment?product=${encodeURIComponent(
                            TIERS[2].name
                          )}&billingType=${selectedBillingType}`}
                          className="text-primary-500 hover:text-primary-600 font-medium text-sm"
                        >
                          Choose Plan →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile Features - Tier Selector */}
              <div className="lg:hidden">
                <div className="flex justify-center mb-8">
                  <div className="inline-flex rounded-full bg-gray-100 p-1">
                    {TIERS.slice(0, 3).map((tier, index) => (
                      <button
                        key={index}
                        onClick={() => setShowMobileTier(index)}
                        className={`
                        px-4 py-2 rounded-full text-sm font-medium transition-all
                        ${
                          showMobileTier === index
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-600"
                        }
                      `}
                      >
                        {tier.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile Features List */}
                {FEATURE_BLOCKS.map((category, catIndex) => (
                  <div key={catIndex} className="mb-8">
                    <div className="bg-red-50 rounded-lg p-3 mb-4">
                      <h3 className="text-xl font-bold text-red-700">
                        {category.name}
                      </h3>
                    </div>
                    {category.features.map((feature, featIndex) => (
                      <div
                        key={featIndex}
                        className="py-3 border-b border-gray-200"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 pr-4">
                            <p className="font-medium text-sm">
                              {feature.name}
                            </p>
                            {feature.status === "COMING SOON" && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded inline-block mt-1">
                                Coming Soon
                              </span>
                            )}
                          </div>
                          <div>
                            <FeatureTier
                              featureTier={
                                showMobileTier === 0
                                  ? feature.tier1
                                  : showMobileTier === 1
                                  ? feature.tier2
                                  : feature.tier3
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="container mx-auto px-6 py-20">
            <h2 className="text-4xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>
            <div className="max-w-3xl mx-auto">
              {faqItems.map((item, index) => (
                <div
                  key={index}
                  className="mb-4 border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div className="p-6 bg-white hover:bg-gray-50 transition-colors">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {item.question}
                    </h3>
                    <p className="text-gray-600">{item.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gift Subscription Section */}
          <div className="bg-gradient-to-r from-primary-50 to-pink-50 py-16">
            <div className="container mx-auto px-6 text-center">
              <h2 className="text-4xl font-bold mb-4">Gift a Subscription</h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Give the gift of professional breeding management. Perfect for
                fellow breeders or kennel owners.
              </p>
              <Link to="/payment?gift=true">
                <button className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition duration-200">
                  Buy Gift Subscription
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
}
