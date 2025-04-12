import Link from "next/link";
import { FaArrowCircleUp, FaLinkedinIn } from "react-icons/fa";
import { FaInstagram, FaTelegram, FaTwitter } from "react-icons/fa6";

export default function Footer() {
  return (
    <div
      id="about"
      className="animate-gradient bg-gradient-to-r from-black to-blue-950/50 bg-[length:200%_200%] px-2 pt-4 text-gray-300 max-sm:text-xs sm:py-8 md:px-24"
    >
      <div className="flex flex-wrap justify-between">
        <div className="flex w-2/5 flex-col gap-8 max-sm:w-full max-sm:pb-6">
          <h1 className="text-3xl font-black sm:text-5xl">Tutly</h1>
          <p className="max-sm:hidden">
            Tutly is a cutting-edge Learning Management System (LMS) designed to
            revolutionize education. We provide instructors with powerful tools
            to create courses, manage students, track progress, and analyze
            performance, all in one seamless platform. Tutly transforms
            traditional education into an engaging and efficient experience.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <h1 className="font-semibold text-white">Explore</h1>
          <Link href={"/developers"}>Contribute</Link>
          <h1>Pricing</h1>
          <h1>Reviews</h1>
        </div>
        <div className="flex flex-col gap-4">
          <h1 className="font-semibold text-white">Learn</h1>
          <h1>Courses</h1>
          <h1>About us</h1>
        </div>
        <div className="flex flex-col gap-4">
          <h1 className="font-semibold text-white">Contact</h1>
          <h1>sales@tutly.in</h1>
          <div>
            <h1>Office:</h1>
            <h1>Hyderabad, Telangana</h1>
            <h1>India. 500090</h1>
          </div>
          <div className="flex gap-4 text-lg">
            <Link href="https://x.com/tutlydotin" target="_blank">
              <FaTwitter />
            </Link>
            <Link href="https://t.me/tutlydotin" target="_blank">
              <FaTelegram />
            </Link>
            <Link href="https://www.instagram.com/tutlydotin" target="_blank">
              <FaInstagram />
            </Link>
            <Link
              href="https://www.linkedin.com/company/tutly/"
              target="_blank"
            >
              <FaLinkedinIn />
            </Link>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between sm:pt-14">
        <div>
          <div className="flex gap-4 py-4">
            <h1>Copyright ©2025 Tutly. All rights reserved.</h1>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </div>
        </div>
        <Link href="/">
          <FaArrowCircleUp className="cursor-pointer text-3xl duration-500 hover:-translate-y-4" />
        </Link>
      </div>
    </div>
  );
}
