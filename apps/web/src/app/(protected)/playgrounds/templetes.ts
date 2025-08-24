import { IoLogoHtml5 } from "react-icons/io5";
import { RiReactjsFill } from "react-icons/ri";
import {
  SiAngular,
  SiJavascript,
  SiNextdotjs,
  SiNodedotjs,
  SiTypescript,
  SiVuedotjs,
} from "react-icons/si";

export interface Template {
  name: string;
  description: string;
  icon: any;
  color: string;
  template: string;
}

export const templates: Template[] = [
  {
    name: "Static",
    description: "HTML and CSS",
    icon: IoLogoHtml5,
    color: "text-gray-600",
    template: "static",
  },
  {
    name: "Vanilla",
    description: "HTML, CSS, and JavaScript",
    icon: SiJavascript,
    color: "text-yellow-500",
    template: "vanilla",
  },
  {
    name: "Vite + React",
    description: "React with Vite bundler",
    icon: RiReactjsFill,
    color: "text-sky-400",
    template: "vite-react",
  },
  {
    name: "Vite + React TS",
    description: "React with TypeScript and Vite",
    icon: SiTypescript,
    color: "text-blue-600",
    template: "vite-react-ts",
  },
  {
    name: "Node.js",
    description: "Node.js backend",
    icon: SiNodedotjs,
    color: "text-green-600",
    template: "node",
  },
  {
    name: "Next.js",
    description: "Next.js framework",
    icon: SiNextdotjs,
    color: "text-black",
    template: "nextjs",
  },
  {
    name: "Angular",
    description: "Angular framework",
    icon: SiAngular,
    color: "text-red-600",
    template: "angular",
  },
  {
    name: "Vue",
    description: "Vue.js framework",
    icon: SiVuedotjs,
    color: "text-green-600",
    template: "vue",
  },
];
