import React from "react";
import Link from "next/link";

import { metadata } from "../layout";

metadata.title = "Tutly | Terms of Service";

function Page() {
  return (
    <div className="min-h-screen">
      <div className="flex h-80 flex-col items-center justify-center gap-12 border-b-2 border-gray-500">
        <h1 className="text-center text-5xl font-bold tracking-widest uppercase">
          Tutly Terms of <br /> Service
        </h1>
        <h1 className="text-md text-center font-bold tracking-wide text-gray-500">
          Effective Date: February 25, 2025
        </h1>
      </div>
      <div className="py-20 text-lg font-light">
        <p>
          Welcome to Tutly! These Terms and Conditions{" "}
          <span className="font-semibold">("Terms")</span> govern your use of
          Tutly and its learning platform (
          <Link className="text-blue-500" href="https://learn.tutly.in">
            learn.tutly.in
          </Link>
          ). By accessing or using our services, you agree to these Terms. If
          you do not agree, please refrain from using our platform. Tutly
          provides instructor accounts to clients, allowing them to create and
          manage courses, enroll students, and oversee their learning progress.
          Students interact with courses through assignments, quizzes, and other
          materials provided by their instructors.
        </p>
        <div className="pt-8">
          <h1 className="text-xl font-bold tracking-wider uppercase">
            1. Account Registration and Responsibilities
          </h1>
          <div className="pl-8">
            <div className="pt-4">
              <h1 className="text-xl font-bold tracking-wider uppercase">
                1.1 Instructor Accounts
              </h1>
              <p>
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
            <div className="pt-4">
              <h1 className="text-xl font-bold tracking-wider uppercase">
                1.2 Student Accounts
              </h1>
              <p>
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
        <div className="pt-8">
          <h1 className="text-xl font-bold tracking-wider uppercase">
            2. Course Content and Intellectual Property
          </h1>
          <p>
            Instructors retain ownership of their course materials but grant
            Tutly a non-exclusive, royalty-free license to host, display, and
            distribute the content within the platform. Students do not have
            rights to redistribute or commercialize course content without the
            explicit permission of the instructor. If content is found to be
            plagiarized or violating third-party rights, Tutly reserves the
            right to remove or restrict access to such content.
          </p>
        </div>
        <div className="pt-8">
          <h1 className="text-xl font-bold tracking-wider uppercase">
            3. User Management and Data Access
          </h1>
          <p>
            Instructors have full control over their enrolled students,
            including the ability to manage enrollments, track attendance, and
            view assignment submissions. Tutly provides detailed analytics such
            as course-wise reports, student performance trends, and engagement
            statistics to instructors. Student data remains confidential and is
            only accessible to the respective instructor and authorized
            administrators.
          </p>
        </div>
        <div className="pt-8">
          <h1 className="text-xl font-bold tracking-wider uppercase">
            4. Payments and Refunds
          </h1>
          <p>
            Tutly may offer subscription-based or one-time fee services for
            instructors. Payment terms will be specified at the time of
            purchase. Payments are securely processed via third-party gateways.
            Tutly does not store financial information. Refund requests are
            subject to Tutly’s refund policy, which varies based on service
            agreements.
          </p>
        </div>
        <div className="pt-8">
          <h1 className="text-xl font-bold tracking-wider uppercase">
            5. Prohibited Activities
          </h1>
          <div>
            Users must not:
            <ul className="list-disc pl-8">
              <li>Violate intellectual property rights or copyrights.</li>
              <li>
                Use Tutly for fraudulent, illegal, or unethical activities.
              </li>
              <li>
                Attempt to hack, reverse-engineer, or disrupt Tutly’s security,
                data, or services.
              </li>
              <li>Upload offensive, misleading, or harmful content.</li>
              <li>Share or sell access to courses, materials, or accounts.</li>
            </ul>
            Tutly reserves the right to suspend or terminate any account found
            violating these rules.
          </div>
        </div>
        <div className="pt-8">
          <h1 className="text-xl font-bold tracking-wider uppercase">
            6. Liability and Disclaimers
          </h1>
          <div>
            Tutly provides services "AS IS" without warranties regarding
            uninterrupted access, accuracy, or suitability for specific learning
            needs. We are not responsible for:
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
        <div className="pt-8">
          <h1 className="text-xl font-bold tracking-wider uppercase">
            7. Changes to Terms
          </h1>
          <p>
            We may update these Terms periodically. Any changes will be
            communicated via email or notifications. Continued use of Tutly
            implies acceptance of the modified Terms.
          </p>
        </div>
        <div className="py-8">
          <h1 className="text-xl font-bold tracking-wider uppercase">
            8. Contact Us
          </h1>
          <p>
            If you have any questions or concerns regarding these Terms, please
            contact us at <span className="text-blue-500">sales@tutly.in</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Page;
