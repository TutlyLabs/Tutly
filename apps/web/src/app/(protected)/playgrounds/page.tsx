"use client";

import { RiReactjsFill } from "react-icons/ri";
import { IoLogoHtml5 } from "react-icons/io5";
import Link from "next/link";

export default function PlaygroundsPage() {
  return (
    <div className="flex flex-wrap gap-10">
      <Link href="/playgrounds/html-css-js">
        <div className="flex w-[350px] items-center gap-6 rounded-lg border-2 border-slate-300 p-3 px-5 hover:border-gray-500 dark:bg-white dark:text-black">
          <div>
            <IoLogoHtml5 className="h-20 w-20 rounded-md bg-slate-200 p-2 text-orange-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold">HTML/CSS/JS</h1>
            <p className="text-sm text-slate-500">
              Playground for html, css, and js
            </p>
          </div>
        </div>
      </Link>
      <Link href="/playgrounds/react">
        <div className="flex w-[350px] items-center gap-6 rounded-lg border-2 border-slate-300 p-3 px-5 hover:border-gray-500 dark:bg-white dark:text-black">
          <div>
            <RiReactjsFill className="h-20 w-20 rounded-md bg-slate-200 p-1.5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold">React.js</h1>
            <p className="text-sm text-slate-500">Playground for React</p>
          </div>
        </div>
      </Link>
    </div>
  );
}
