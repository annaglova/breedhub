import LandingFigure from "@/assets/backgrounds/landing-figure.svg?react";
import LandingLayout from "@/layouts/LandingLayout";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function Privacy() {
  usePageTitle("Privacy Policy");

  return (
    <LandingLayout>
      <div className="pb-20 relative overflow-hidden">
        {/* Background */}
        <div className="xxl:top-[-64vw] absolute right-[-7vw] top-[-23vw] w-full md:right-[-10vw] md:top-[-47vw] lg:top-[-59vw] -z-1">
          <LandingFigure style={{ width: "100vw" }} />
        </div>

        <div className="flex flex-col items-center justify-center pt-14 sm:pt-32">
          <div className="landing-content-container">
            {/* Page header */}
            <div className="relative space-y-3 text-center">
              <h1 className="text-white tracking-tight leading-tight">Privacy Policy</h1>
              <p className="text-2xl text-slate-600 xl:text-white max-w-3xl mx-auto mt-2 tracking-wide leading-relaxed">
                Your privacy is important to us. Learn how we collect, use, 
                and protect your information when you use BreedHub
              </p>
            </div>
            <div className="landing-content-card">
              <div className="prose prose-lg max-w-none w-full">
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4 tracking-wide">
                    1. Introduction
                  </h2>
                  <p className="text-slate-700 mb-4 leading-relaxed">
                    BreedHub ("we," "our," or "us") is committed to protecting
                    your privacy. This Privacy Policy explains how we collect,
                    use, disclose, and safeguard your information when you use
                    our breeding management platform.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4 tracking-wide">
                    2. Information We Collect
                  </h2>
                  <p className="text-slate-700 mb-4 leading-relaxed">
                    We collect information you provide directly to us, such as:
                  </p>
                  <ul className="list-disc pl-6 text-slate-700 mb-4">
                    <li>Account information (name, email, password)</li>
                    <li>
                      Profile information (kennel name, location, contact
                      details)
                    </li>
                    <li>
                      Breeding data (pet information, pedigrees, health records)
                    </li>
                    <li>
                      Payment information (processed securely through
                      third-party providers)
                    </li>
                    <li>Communications between you and other users</li>
                  </ul>
                  <p className="text-slate-700 mb-4 leading-relaxed">
                    We automatically collect certain information when you use
                    our platform:
                  </p>
                  <ul className="list-disc pl-6 text-slate-700 mb-4">
                    <li>Log data (IP address, browser type, pages visited)</li>
                    <li>
                      Device information (hardware model, operating system)
                    </li>
                    <li>
                      Usage data (features used, time spent, interactions)
                    </li>
                    <li>Cookies and similar tracking technologies</li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4 tracking-wide">
                    3. How We Use Your Information
                  </h2>
                  <p className="text-slate-700 mb-4 leading-relaxed">
                    We use the information we collect to:
                  </p>
                  <ul className="list-disc pl-6 text-slate-700 mb-4">
                    <li>Provide, maintain, and improve our services</li>
                    <li>Process transactions and send related information</li>
                    <li>
                      Send technical notices, updates, and support messages
                    </li>
                    <li>Respond to your comments and questions</li>
                    <li>Develop new features and services</li>
                    <li>Monitor and analyze trends and usage</li>
                    <li>Detect, prevent, and address technical issues</li>
                    <li>Protect against fraudulent or illegal activity</li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4 tracking-wide">
                    4. Information Sharing and Disclosure
                  </h2>
                  <p className="text-slate-700 mb-4 leading-relaxed">
                    We do not sell, trade, or rent your personal information. We
                    may share your information in the following situations:
                  </p>
                  <ul className="list-disc pl-6 text-slate-700 mb-4">
                    <li>With your consent or at your direction</li>
                    <li>With service providers who assist in our operations</li>
                    <li>
                      To comply with legal obligations or respond to legal
                      requests
                    </li>
                    <li>
                      To protect the rights, property, and safety of BreedHub
                      and our users
                    </li>
                    <li>
                      In connection with a merger, sale, or acquisition of our
                      business
                    </li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4 tracking-wide">
                    5. Data Security
                  </h2>
                  <p className="text-slate-700 mb-4 leading-relaxed">
                    We implement appropriate technical and organizational
                    measures to protect your personal information against
                    unauthorized access, alteration, disclosure, or destruction.
                    However, no method of transmission over the Internet or
                    electronic storage is 100% secure.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4 tracking-wide">
                    6. Your Rights and Choices
                  </h2>
                  <p className="text-slate-700 mb-4 leading-relaxed">You have the right to:</p>
                  <ul className="list-disc pl-6 text-slate-700 mb-4">
                    <li>Access and receive a copy of your personal data</li>
                    <li>Update or correct your information</li>
                    <li>Delete your account and associated data</li>
                    <li>Object to or restrict certain processing</li>
                    <li>Data portability</li>
                    <li>Withdraw consent where applicable</li>
                    <li>Opt-out of marketing communications</li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4 tracking-wide">
                    7. Children's Privacy
                  </h2>
                  <p className="text-slate-700 mb-4 leading-relaxed">
                    BreedHub is not intended for children under 13 years of age.
                    We do not knowingly collect personal information from
                    children under 13. If we learn we have collected information
                    from a child under 13, we will delete that information
                    promptly.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4 tracking-wide">
                    8. International Data Transfers
                  </h2>
                  <p className="text-slate-700 mb-4 leading-relaxed">
                    Your information may be transferred to and processed in
                    countries other than your country of residence. These
                    countries may have data protection laws different from those
                    in your country. We take appropriate safeguards to ensure
                    your information remains protected.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4 tracking-wide">
                    9. Changes to This Policy
                  </h2>
                  <p className="text-slate-700 mb-4 leading-relaxed">
                    We may update this Privacy Policy from time to time. We will
                    notify you of any changes by posting the new Privacy Policy
                    on this page and updating the "Last updated" date.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4 tracking-wide">
                    10. Contact Us
                  </h2>
                  <p className="text-slate-700 leading-relaxed">
                    If you have any questions about this Privacy Policy, please
                    contact us at:
                  </p>
                  <p className="text-slate-700 mt-2">
                    Email:{" "}
                    <a
                      href="mailto:privacy@breedhub"
                      className="text-primary-500 hover:text-primary-600"
                    >
                      privacy@breedhub
                    </a>
                  </p>
                  <p className="text-slate-700 leading-relaxed">Address: Breedhub, Ukraine</p>
                </section>
              </div>
              <p className="text-slate-500 text-sm text-center mt-8">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
}
