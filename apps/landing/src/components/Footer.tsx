import Image from "next/image";
import Link from "next/link";
import { FaLinkedinIn } from "react-icons/fa";
import { FaInstagram, FaTelegram, FaTwitter } from "react-icons/fa6";
// import { AnimatedTooltip } from "./ui/animated-tooltip";


// const people = [
//   {
//     id: 1,
//     name: "Uday Sagar",
//     link: "https://github.com/UdaySagar-Git",
//     image: "https://i.postimg.cc/VsWLXt25/image.png",
//   },
//   {
//     id: 2,
//     name: "Vighnesh",
//     link: "https://github.com/vighnesh-7",
//     image: "https://i.postimg.cc/y6mWnt3C/image.png",
//   },
//   {
//     id: 3,
//     name: "Goutham",
//     link: "https://github.com/goutham4126",
//     image: "https://i.postimg.cc/vZRqM1Hz/image.png",
//   },
//   {
//     id: 4,
//     name: "Kalyan",
//     link: "https://github.com/kalyan-2005",
//     image: "https://i.postimg.cc/GpC5P4Wt/image.png",
//   },
// ];
 

const defaultSections = [
  {
    title: "Explore",
    links: [
      { name: "Contribute", href: "https://github.com/tutlyLabs/" },
      // { name: "Pricing", href: "#" },
      { name: "Reviews", href: "#testimonials" },
    ],
  },
  {
    title: "Learn",
    links: [
      { name: "Courses", href: "https://learn.tutly.in/courses" },
      { name: "About us", href: "#" },
    ],
  },
  {
    title: "Contact",
    links: [
      { name: "sales@tutly.in", href: "mailto:sales@tutly.in" },
      { name: "Office: Hyderabad, Telangana India. 500090", href: "#" },
    ],
  },
];

const defaultSocialLinks = [
  {
    icon: <FaTwitter className="size-5" />,
    href: "https://x.com/tutlydotin",
    label: "Twitter",
  },
  {
    icon: <FaTelegram className="size-5" />,
    href: "https://t.me/tutlydotin",
    label: "Telegram",
  },
  {
    icon: <FaInstagram className="size-5" />,
    href: "https://www.instagram.com/tutlydotin",
    label: "Instagram",
  },
  {
    icon: <FaLinkedinIn className="size-5" />,
    href: "https://www.linkedin.com/company/tutly/",
    label: "LinkedIn",
  },
];

const defaultLegalLinks = [
  { name: "Terms of Service", href: "/terms" },
  { name: "Privacy Policy", href: "/privacy" },
];

export default function Footer() {
  return (
    <section className="animate-gradient bg-gradient-to-r from-black to-blue-950/50 bg-[length:200%_200%] py-12">
      <div className="container mx-auto px-4">
        <div className="flex w-full flex-col justify-between gap-8 lg:flex-row lg:items-start lg:text-left">
          <div className="flex w-full flex-col justify-between gap-4 lg:items-start">
            <div className="flex items-center gap-2 lg:justify-start">
              <Image
                src="/logo.png"
                className="rounded"
                width={44}
                height={44}
                alt="logo"
              />
              <h2 className="text-3xl font-black sm:text-5xl">Tutly</h2>
            </div>
            <p className="max-w-[70%] text-sm text-gray-300 max-sm:hidden">
              A cutting-edge Learning Management System (LMS) that
              revolutionizes education by providing powerful tools for course
              creation, student management, and performance analytics.
            </p>
            <ul className="flex items-center space-x-6 text-gray-300">
              {defaultSocialLinks.map((social, idx) => (
                <li key={idx} className="font-medium hover:text-white">
                  <a
                    href={social.href}
                    target="_blank"
                    aria-label={social.label}
                  >
                    {social.icon}
                  </a>
                </li>
              ))}
            </ul>
            {/* <div className="flex flex-row items-center justify-center">
              <AnimatedTooltip items={people} />
            </div> */}
          </div>
          <div className="grid w-full gap-6 md:grid-cols-3 lg:gap-12">
            {defaultSections.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                <h3 className="mb-3 font-semibold text-white">
                  {section.title}
                </h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  {section.links.map((link, linkIdx) => (
                    <li key={linkIdx} className="font-medium hover:text-white">
                      <a href={link.href}>{link.name}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 flex flex-col justify-between gap-4 border-t border-gray-700 py-6 text-xs font-medium text-gray-300 md:flex-row md:items-center md:text-left">
          <p className="order-2 lg:order-1">
            Copyright ©2025 Tutly. All rights reserved.
          </p>
          <ul className="order-1 flex flex-col gap-2 md:order-2 md:flex-row">
            {defaultLegalLinks.map((link, idx) => (
              <li key={idx} className="hover:text-white">
                <Link href={link.href}>{link.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
