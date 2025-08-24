import React from "react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tutly | Terms of Service",
  description: "Terms of Service for Tutly",
};

function Page() {
  return (
    <div className="container mx-auto min-h-screen px-4">
      <div className="flex h-64 flex-col items-center justify-center gap-8 border-b border-gray-200">
        <h1 className="text-center text-4xl font-bold tracking-wider uppercase">
          Terms of Service
        </h1>
        <h2 className="text-center text-sm font-medium text-gray-500">
          Last Updated: February 25, 2025
        </h2>
      </div>
      <div className="space-y-8 py-12 text-base font-light">
        <p className="leading-relaxed">
          Welcome to Tutly! These Terms and Conditions{" "}
          <span className="font-semibold">(&ldquo;Terms&rdquo;)</span> govern
          your use of Tutly and its learning platform (
          <Link
            className="text-blue-500 hover:underline"
            href="https://learn.tutly.in"
          >
            learn.tutly.in
          </Link>
          ). By accessing or using our services, you agree to these Terms. If
          you do not agree, please refrain from using our platform. Tutly
          provides instructor accounts to clients, allowing them to create and
          manage courses, enroll students, and oversee their learning progress.
          Students interact with courses through assignments, quizzes, and other
          materials provided by their instructors.
        </p>
        <div>
          <h2 className="mb-4 text-xl font-bold tracking-wide uppercase">
            1. Account Registration and Responsibilities
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-lg font-bold tracking-wide uppercase">
                1.1 Instructor Accounts
              </h3>
              <p className="leading-relaxed">
                Clients who wish to use Tutly will be provided with an
                instructor account, allowing them to create courses and manage
                students. Instructors must ensure that all course content,
                assignments, and related materials are original, lawful, and do
                not violate intellectual property rights. Instructors must not
                misuse their privileges by enrolling unauthorized users or
                distributing course content outside Tutly. Course performance
                reports, analytics, and student submissions are accessible only
                to the assigned instructor.
              </p>
            </div>
            <div>
              <h3 className="mb-3 text-lg font-bold tracking-wide uppercase">
                1.2 Student Accounts
              </h3>
              <p className="leading-relaxed">
                Students are enrolled in courses by their respective
                instructors. They are responsible for completing assignments and
                adhering to academic integrity policies. Students must not share
                course materials, plagiarize content, or engage in any unethical
                behavior. Failure to comply may result in removal from courses
                or platform restrictions.
              </p>
            </div>
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-bold tracking-wide uppercase">
            2. Course Content and Intellectual Property
          </h2>
          <p className="leading-relaxed">
            Instructors retain ownership of their course materials but grant
            Tutly a non-exclusive, royalty-free license to host, display, and
            distribute the content within the platform. Students do not have
            rights to redistribute or commercialize course content without the
            explicit permission of the instructor. If content is found to be
            plagiarized or violating third-party rights, Tutly reserves the
            right to remove or restrict access to such content.
          </p>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-bold tracking-wide uppercase">
            3. User Management and Data Access
          </h2>
          <p className="leading-relaxed">
            Instructors have full control over their enrolled students,
            including the ability to manage enrollments, track attendance, and
            view assignment submissions. Tutly provides detailed analytics such
            as course-wise reports, student performance trends, and engagement
            statistics to instructors. Student data remains confidential and is
            only accessible to the respective instructor and authorized
            administrators.
          </p>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-bold tracking-wide uppercase">
            4. Payments and Refunds
          </h2>
          <p className="leading-relaxed">
            Tutly may offer subscription-based or one-time fee services for
            instructors. Payment terms will be specified at the time of
            purchase. Payments are securely processed via third-party gateways.
            Tutly does not store financial information. Refund requests are
            subject to Tutly&apos;s refund policy, which varies based on service
            agreements.
          </p>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-bold tracking-wide uppercase">
            5. Prohibited Activities
          </h2>
          <div className="leading-relaxed">
            Users must not:
            <ul className="list-disc pl-8">
              <li>Violate intellectual property rights or copyrights.</li>
              <li>
                Use Tutly for fraudulent, illegal, or unethical activities.
              </li>
              <li>
                Attempt to hack, reverse-engineer, or disrupt Tutly&apos;s
                security, data, or services.
              </li>
              <li>Upload offensive, misleading, or harmful content.</li>
              <li>Share or sell access to courses, materials, or accounts.</li>
            </ul>
            Tutly reserves the right to suspend or terminate any account found
            violating these rules.
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-bold tracking-wide uppercase">
            6. Liability and Disclaimers
          </h2>
          <div className="leading-relaxed">
            Tutly provides services &quot;AS IS&quot; without warranties
            regarding uninterrupted access, accuracy, or suitability for
            specific learning needs. We are not responsible for:
            <ul className="list-disc pl-8">
              <li>Incorrect information uploaded by instructors.</li>
              <li>
                Misuse of student or instructor data by unauthorized third
                parties.
              </li>
              <li>
                Service interruptions caused by technical failures or
                cyber-attacks.
              </li>
            </ul>
            By using Tutly, you acknowledge these risks and agree not to hold us
            liable for any losses.
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-bold tracking-wide uppercase">
            7. Changes to Terms
          </h2>
          <p className="leading-relaxed">
            We may update these Terms periodically. Any changes will be
            communicated via email or notifications. Continued use of Tutly
            implies acceptance of the modified Terms.
          </p>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-bold tracking-wide uppercase">
            8. Contact Us
          </h2>
          <p className="leading-relaxed">
            If you have any questions or concerns regarding these Terms, please
            contact us at{" "}
            <span className="text-blue-500">support@tutly.in</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Page;
