import HeaderFigure from "@/assets/backgrounds/header-figure.svg?react";
import LandingFigure from "@/assets/backgrounds/landing-figure.svg?react";
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
          <HeaderFigure className="absolute top-[-20%] right-[-10%] w-[120%] h-auto" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="container mx-auto px-6 pt-14 sm:pt-32 text-center">
            <h1 className="text-white">Choose Your Plan</h1>
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
            <div className="landing-content-container">
              <h2 className="text-4xl font-bold text-center mb-12">
                Compare Features
              </h2>

              {/* Desktop Features Table */}
              <div className="hidden lg:block max-w-5xl mx-auto ">
                <div className="bg-primary-300 rounded-full px-6 font-semibold text-white shadow-md lg:px-8 ">
                  <div
                    className="grid py-3 mb-8"
                    style={{ gridTemplateColumns: "auto 112px 112px 112px" }}
                  >
                    <div></div>
                    {TIERS.slice(0, 3).map((tier, index) => (
                      <div key={index} className="text-center self-center">
                        <h4 className="font-bold text-lg">{tier.name}</h4>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Feature Categories */}
                {FEATURE_BLOCKS.map((category, catIndex) => (
                  <div key={catIndex} className="mb-8">
                    <div
                      className="rounded-lg px-6 py-3 mb-2"
                      style={{
                        backgroundColor: (category.color || "#6366f1") + "20",
                      }}
                    >
                      <h3
                        className="text-lg font-bold"
                        style={{ color: category.color || "#6366f1" }}
                      >
                        {category.name}
                      </h3>
                    </div>
                    {category.features.map((feature, featIndex) => (
                      <div
                        key={featIndex}
                        className="grid py-3 hover:bg-gray-50 border-b border-gray-100"
                        style={{
                          gridTemplateColumns: "20px auto 112px 112px 112px",
                        }}
                      >
                        <div className="self-center">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor: category.color || "#6366f1",
                            }}
                          />
                        </div>
                        <div className="pr-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className=" font-medium">{feature.name}</p>
                              {feature.status === "COMING SOON" && (
                                <span className="text-xs bg-primary-300 text-white px-2 py-0.5 rounded-full flex-shrink-0 text-center uppercase">
                                  Coming Soon
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-center self-center">
                          <FeatureTier featureTier={feature.tier1} />
                        </div>
                        <div className="text-center self-center">
                          <FeatureTier featureTier={feature.tier2} />
                        </div>
                        <div className="text-center self-center">
                          <FeatureTier featureTier={feature.tier3} />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Mobile Features - Tier Selector */}
              <div className="lg:hidden">
                <div className="flex justify-center mb-8">
                  <div className="inline-flex rounded-full bg-primary-300 p-1">
                    {TIERS.slice(0, 3).map((tier, index) => (
                      <button
                        key={index}
                        onClick={() => setShowMobileTier(index)}
                        className={`
                        px-4 py-2 rounded-full text-md font-medium transition-all 
                        ${
                          showMobileTier === index
                            ? "bg-white/70 text-gray-900 shadow-sm  "
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
                  <div key={catIndex} className="mb-6">
                    <div
                      className="rounded-lg p-3 mb-2"
                      style={{
                        backgroundColor: (category.color || "#6366f1") + "20",
                      }}
                    >
                      <h3
                        className="text-base font-bold"
                        style={{ color: category.color || "#6366f1" }}
                      >
                        {category.name}
                      </h3>
                    </div>
                    {category.features.map((feature, featIndex) => (
                      <div
                        key={featIndex}
                        className="grid py-3 border-b border-gray-100"
                        style={{ gridTemplateColumns: "auto 64px" }}
                      >
                        <div className="pr-2">
                          <div className="flex items-start gap-2">
                            <div className="self-center mr-2">
                              <div
                                className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                                style={{
                                  backgroundColor: category.color || "#6366f1",
                                }}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className=" font-medium">{feature.name}</p>
                                {feature.status === "COMING SOON" && (
                                  <span className="text-xs bg-primary-300 text-white px-2 py-0.5 rounded-full flex-shrink-0 text-center uppercase">
                                    Coming Soon
                                  </span>
                                )}
                              </div>
                              <p className=" text-gray-600">
                                {feature.description}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-center self-center">
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
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Gift Subscription Section */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-accent-500 opacity-90"></div>

            {/* Background SVG Pattern */}
            <div className="absolute inset-0 opacity-10">
              <LandingFigure className="absolute -right-1/4 -top-1/4 w-full h-full transform rotate-12" />
              <LandingFigure className="absolute -left-1/4 -bottom-1/4 w-full h-full transform -rotate-12" />
            </div>

            <div className="relative z-10 container mx-auto px-6 py-20">
              <div className="max-w-3xl mx-auto text-center">
                {/* Gift Icon */}
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full backdrop-blur-sm">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                    />
                  </svg>
                </div>

                <h2 className="text-5xl font-bold mb-6 text-white">
                  Gift a Subscription
                </h2>

                <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
                  Give the gift of professional breeding management.
                  <span className="block mt-2">
                    Perfect for fellow breeders or kennel owners.
                  </span>
                </p>

                <div className="space-y-4">
                  <Link to="/payment?gift=true">
                    <button className="group relative inline-flex items-center gap-3 bg-white text-primary-600 font-bold py-5 px-10 rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                      <span className="text-lg">Buy Gift Subscription</span>
                      <svg
                        className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    </button>
                  </Link>

                  <p className="text-white/70 text-sm">
                    Available for all subscription tiers • Instant delivery
                  </p>
                </div>
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
                  className="mb-4 border border-gray-200 rounded-lg overflow-hidden shadow-sm"
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
        </div>
      </div>
    </LandingLayout>
  );
}
