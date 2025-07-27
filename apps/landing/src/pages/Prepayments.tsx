import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Footer from "@/components/Footer";
import TierSelector from "@/components/TierSelector";
import LandingFigure from "@/assets/backgrounds/landing-figure.svg?react";
import LogoWhite from "@shared/icons/logo/logo-white.svg?react";
import { Info, ArrowLeft } from "lucide-react";

// Mock breed data - replace with API call when ready
const mockBreeds = [
  { id: "1", name: "Labrador Retriever" },
  { id: "2", name: "German Shepherd" },
  { id: "3", name: "Golden Retriever" },
  { id: "4", name: "French Bulldog" },
  { id: "5", name: "Bulldog" },
  { id: "6", name: "Beagle" },
  { id: "7", name: "Poodle" },
  { id: "8", name: "Rottweiler" },
  { id: "9", name: "Yorkshire Terrier" },
  { id: "10", name: "Dachshund" },
];

export default function Prepayments() {
  const navigate = useNavigate();
  const [selectedBreed, setSelectedBreed] = useState<string>("");
  const [selectedBreedName, setSelectedBreedName] = useState<string>("");
  const [showTierSelector, setShowTierSelector] = useState(false);
  const [formError, setFormError] = useState<string>("");

  const handleBreedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBreed) {
      setFormError("Please select a breed to continue");
      return;
    }

    const breed = mockBreeds.find(b => b.id === selectedBreed);
    if (breed) {
      setSelectedBreedName(breed.name);
      setShowTierSelector(true);
      setFormError("");
    }
  };

  const handleBreedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBreed(e.target.value);
    setFormError("");
  };

  const handleBillingTypeChange = () => {
    // This is handled by TierSelector internally
  };

  const handleBackToBreedSelection = () => {
    setShowTierSelector(false);
    setSelectedBreed("");
    setSelectedBreedName("");
  };

  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      {/* Background SVG */}
      <div className="absolute right-[-30vw] top-[-13vw] w-full md:right-[-47vw] md:top-[-17vw] xxl:top-[-25vw] xxxl:top-[-32vw]">
        <LandingFigure style={{ width: "80%" }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center">
              <LogoWhite className="h-10 w-auto" />
            </Link>
            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/product" className="text-gray-700 hover:text-primary-500 transition">
                Product
              </Link>
              <Link to="/pricing" className="text-gray-700 hover:text-primary-500 transition">
                Pricing
              </Link>
              <Link to="/about" className="text-gray-700 hover:text-primary-500 transition">
                About
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow container mx-auto px-6 py-12 max-w-6xl">
          {!showTierSelector ? (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  Choose Your Breed
                </h1>
                <p className="text-xl text-gray-600">
                  Select the breed you want to support with your subscription
                </p>
              </div>

              <form onSubmit={handleBreedSubmit} className="bg-white rounded-lg shadow-lg p-8">
                <div className="mb-6">
                  <label 
                    htmlFor="breed-select" 
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Select a breed <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="breed-select"
                    value={selectedBreed}
                    onChange={handleBreedChange}
                    className={`
                      w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                      ${formError ? 'border-red-500' : 'border-gray-300'}
                    `}
                  >
                    <option value="">-- Select a breed --</option>
                    {mockBreeds.map(breed => (
                      <option key={breed.id} value={breed.id}>
                        {breed.name}
                      </option>
                    ))}
                  </select>
                  {formError && (
                    <p className="mt-2 text-sm text-red-600">{formError}</p>
                  )}
                </div>

                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-700">
                    <Info className="inline-block w-4 h-4 mr-2" />
                    By selecting a breed, you'll be supporting its community and helping improve 
                    breeding data and resources for all {selectedBreedName || "breed"} enthusiasts.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-600 transition"
                >
                  Continue to Plan Selection
                </button>
              </form>
            </div>
          ) : (
            <div>
              <div className="text-center mb-8">
                <button
                  onClick={handleBackToBreedSelection}
                  className="text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center"
                >
                  <ArrowLeft className="inline-block w-4 h-4 mr-2" />
                  Back to breed selection
                </button>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  Choose Your Plan
                </h1>
                <p className="text-xl text-gray-600">
                  Supporting: <span className="font-semibold text-primary-500">{selectedBreedName}</span>
                </p>
              </div>

              {/* Pass breed parameter to tier links */}
              <div className="breed-tier-selector">
                <TierSelector 
                  onBillingTypeChange={handleBillingTypeChange}
                  breedId={selectedBreed}
                />
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}