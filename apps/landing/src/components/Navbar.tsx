import React from "react";
import Image from "next/image";
import Link from "next/link";

const links = [
  {
    name: "About",
    link: "#",
  },
  {
    name: "Clients",
    link: "#testimonials",
  },
  {
    name: "FAQ",
    link: "#faqs",
  },
  {
    name: "Pricing",
    link: "#",
  },
  {
    name: "Developers",
    link: "#",
  },
];

function Navbar() {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between bg-[#0F1427] py-4 lg:px-24">
      <div className="flex items-center gap-20">
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src="/logo.png"
            className="rounded"
            width={30}
            height={30}
            alt="logo"
          />
          <div>
            <h1 className="text-xl font-black">Tutly</h1>
          </div>
        </Link>
        <div className="flex items-center gap-12 max-lg:hidden">
          {links.map((link) =>
            link.link.startsWith("#") ? (
              <Link
                key={link.name}
                href={link.link.substring(1)}
                // smooth={true}
                // duration={500}
                className="cursor-pointer font-semibold tracking-wider text-gray-500 hover:text-white"
              >
                {link.name}
              </Link>
            ) : (
              <Link key={link.name} href={link.link}>
                <h1 className="font-semibold tracking-wider text-gray-500 hover:text-white">
                  {link.name}
                </h1>
              </Link>
            ),
          )}
        </div>
      </div>
      <div className="flex items-center gap-6">
        <Link href="https://learn.tutly.in" target="_blank">
          Login
        </Link>
        <Link
          href="mailto:sales@tutly.in"
          className="animate-shimmer items-center justify-center rounded-full border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] p-1 px-2 font-medium text-slate-400 transition-colors focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 focus:outline-none"
        >
          Contact Us
        </Link>
      </div>
    </div>
  );
}

export default Navbar;
