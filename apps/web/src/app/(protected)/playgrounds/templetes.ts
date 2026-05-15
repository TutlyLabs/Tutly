import { IoLogoHtml5 } from "react-icons/io5";
import { RiReactjsFill, RiSvelteFill } from "react-icons/ri";
import {
  SiAngular,
  SiJavascript,
  SiSolid,
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

// Browser-runnable templates only.
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
    name: "Vanilla TS",
    description: "Vanilla with TypeScript",
    icon: SiTypescript,
    color: "text-blue-600",
    template: "vanilla-ts",
  },
  {
    name: "React",
    description: "React (Parcel)",
    icon: RiReactjsFill,
    color: "text-sky-400",
    template: "react",
  },
  {
    name: "React TS",
    description: "React with TypeScript (Parcel)",
    icon: SiTypescript,
    color: "text-blue-600",
    template: "react-ts",
  },
  {
    name: "Vue",
    description: "Vue.js framework",
    icon: SiVuedotjs,
    color: "text-green-600",
    template: "vue",
  },
  {
    name: "Vue TS",
    description: "Vue with TypeScript",
    icon: SiTypescript,
    color: "text-blue-600",
    template: "vue-ts",
  },
  {
    name: "Angular",
    description: "Angular framework",
    icon: SiAngular,
    color: "text-red-600",
    template: "angular",
  },
  {
    name: "Svelte",
    description: "Svelte framework",
    icon: RiSvelteFill,
    color: "text-orange-500",
    template: "svelte",
  },
  {
    name: "Solid",
    description: "SolidJS framework",
    icon: SiSolid,
    color: "text-blue-500",
    template: "solid",
  },
];
