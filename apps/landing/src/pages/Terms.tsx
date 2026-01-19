import { usePageTitle } from "@/hooks/usePageTitle";
import LandingContentLayout from "@/layouts/LandingContentLayout";

export default function Terms() {
  usePageTitle("Terms of Service");

  return (
    <LandingContentLayout
      title="Terms and Conditions"
      subtitle="Please read these terms carefully before using BreedHub. By using our platform, you agree to be bound by these terms"
    >
      <div className="prose prose-lg max-w-none w-full">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 tracking-wide">
            1. Acceptance of Terms
          </h2>
          <p className="text-slate-700 mb-4 leading-relaxed">
            By accessing and using BreedHub, you accept and agree to be
            bound by the terms and provision of this agreement. If you
            do not agree to abide by the above, please do not use this
            service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 tracking-wide">
            2. Use License
          </h2>
          <p className="text-slate-700 mb-4 leading-relaxed">
            Permission is granted to temporarily access the materials
            (information or software) on BreedHub for personal,
            non-commercial transitory viewing only. This is the grant of
            a license, not a transfer of title, and under this license
            you may not:
          </p>
          <ul className="list-disc pl-6 text-slate-700 mb-4">
            <li>modify or copy the materials;</li>
            <li>
              use the materials for any commercial purpose, or for any
              public display (commercial or non-commercial);
            </li>
            <li>
              attempt to decompile or reverse engineer any software
              contained on BreedHub;
            </li>
            <li>
              remove any copyright or other proprietary notations from
              the materials.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 tracking-wide">
            3. Account Registration
          </h2>
          <p className="text-slate-700 mb-4 leading-relaxed">
            To use certain features of BreedHub, you must register for
            an account. You agree to:
          </p>
          <ul className="list-disc pl-6 text-slate-700 mb-4">
            <li>
              provide accurate, current, and complete information during
              registration;
            </li>
            <li>
              maintain and update your information to keep it accurate
              and complete;
            </li>
            <li>
              maintain the security of your password and accept all
              risks of unauthorized access;
            </li>
            <li>
              notify us immediately if you discover any unauthorized use
              of your account.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 tracking-wide">
            4. Breeding Data and Privacy
          </h2>
          <p className="text-slate-700 mb-4 leading-relaxed">
            You retain all rights to the breeding data you submit to
            BreedHub. By submitting data, you grant us a license to use,
            store, and display your content solely for the purpose of
            operating and improving our services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 tracking-wide">
            5. Subscription and Payments
          </h2>
          <p className="text-slate-700 mb-4 leading-relaxed">
            Some aspects of the Service are provided for a fee. You will
            be charged in advance on a recurring basis (monthly, yearly,
            or 3-yearly). You can cancel your subscription at any time
            through your account settings.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 tracking-wide">6. Disclaimer</h2>
          <p className="text-slate-700 mb-4 leading-relaxed">
            The materials on BreedHub are provided on an 'as is' basis.
            BreedHub makes no warranties, expressed or implied, and
            hereby disclaims and negates all other warranties including,
            without limitation, implied warranties or conditions of
            merchantability, fitness for a particular purpose, or
            non-infringement of intellectual property or other violation
            of rights.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 tracking-wide">
            7. Limitations
          </h2>
          <p className="text-slate-700 mb-4 leading-relaxed">
            In no event shall BreedHub or its suppliers be liable for
            any damages (including, without limitation, damages for loss
            of data or profit, or due to business interruption) arising
            out of the use or inability to use the materials on
            BreedHub, even if BreedHub or a BreedHub authorized
            representative has been notified orally or in writing of the
            possibility of such damage.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 tracking-wide">
            8. Revisions and Errata
          </h2>
          <p className="text-slate-700 mb-4 leading-relaxed">
            The materials appearing on BreedHub could include technical,
            typographical, or photographic errors. BreedHub does not
            warrant that any of the materials on its website are
            accurate, complete, or current. BreedHub may make changes to
            the materials contained on its website at any time without
            notice.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 tracking-wide">
            9. Governing Law
          </h2>
          <p className="text-slate-700 mb-4 leading-relaxed">
            These terms and conditions are governed by and construed in
            accordance with the laws of Ukraine and you irrevocably
            submit to the exclusive jurisdiction of the courts in that
            State or location.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 tracking-wide">
            10. Contact Information
          </h2>
          <p className="text-slate-700">
            If you have any questions about these Terms and Conditions,
            please contact us at:
          </p>
          <p className="text-slate-700 mt-2">
            Email:{" "}
            <a
              href="mailto:info@breedhub"
              className="text-primary-500 hover:text-primary-600"
            >
              info@breedhub
            </a>
          </p>
        </section>
      </div>
      <p className="text-slate-500 text-sm text-center mt-8">
        Last updated: {new Date().toLocaleDateString()}
      </p>
    </LandingContentLayout>
  );
}
