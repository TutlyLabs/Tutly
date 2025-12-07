# Security Policy

## Supported Versions

We always provide security updates for the **latest release** of Tutly.  
Whenever there is a security update, you should upgrade to the latest version to receive the fix.

We do **not** maintain separate long-term support branches or older version branches at this time.

---

## Reporting a Vulnerability

All security bugs in `TutlyLabs/Tutly` should be reported **privately** by email to: `security@tutly.in`

Your email will be acknowledged within **48 hours**, and you'll receive a more detailed response within **72 hours** indicating the next steps in handling your report.

When reporting a vulnerability, please include:

- A **detailed description** of the issue.
- The **type of issue** (e.g. DoS, authentication bypass, privilege escalation, information disclosure, XSS, CSRF, SQL injection, etc.).
- Any **assumptions or preconditions** (e.g. “requires authenticated instructor account”, “requires access to internal network”, “requires specific browser”, etc.).
- Clear **steps to reproduce**, including:
  - URLs, API endpoints, or components involved.
  - Example requests/payloads (curl, Postman, screenshots, etc.).
  - Any relevant logs or error messages (with secrets and personal data removed).
- The **impact** you believe this issue could have on:
  - Student/instructor data confidentiality.
  - Integrity of assignments, grades, or attendance.
  - Availability of the Tutly LMS installation.
- The **version/commit** of Tutly you tested against and any important configuration details.

If you have not received a reply to your initial email within **48 hours**, or you have not heard from the security contact for **five days**, you may escalate via:

- Secondary contact: `uday@tutly.in`

Please **do not** open public GitHub issues for security vulnerabilities before responsible disclosure has been coordinated.

---

## Disclosure Process

Tutly uses the following general disclosure process:

1. **Triage & Verification**  
   - A maintainer or security contact will review your report, attempt to reproduce the issue, and assess its impact on confidentiality, integrity, and availability.
   - We may ask you for additional information to help reproduce or better understand the issue.

2. **Assessment & Scope**  
   - The team decides on the severity and affected components (e.g. authentication, assignment management, code playground, real-time notifications).
   - Code is audited to identify any related or similar vulnerabilities.

3. **Fix Development**  
   - A fix is developed and tested against current supported versions (latest release / `main`).
   - Where feasible, we add or improve automated tests to prevent regressions.

4. **Coordinated Release**  
   - A new Tutly release is prepared and published containing the security fix.
   - We aim to release fixes as soon as reasonably possible, depending on complexity and required testing.

5. **Advisory & Acknowledgement**  
   - A brief security note or advisory will be published in the release notes and/or official communication channels (e.g. project README, website, or blog).
   - Please indicate in your email whether we may **credit you** as the reporter (e.g. name, handle, affiliation).  
     By default, we will **not** publish your identity to protect your privacy.

This process may take some time, especially if coordination with downstream deployments or related projects is required. We will make every effort to handle security bugs promptly and responsibly, while ensuring that fixes are properly tested and released in a consistent manner.

---

## Non-Security Issues

For non-security bugs or feature requests, please use:

- GitHub Issues: [`TutlyLabs/Tutly` issues](https://github.com/TutlyLabs/Tutly/issues)

Please avoid including sensitive information (such as secrets, personal data, or exploit details) in public issues.
