"use client";

import type { Template } from "../templetes";
import { templates } from "../templetes";
import { useRouter } from "next/navigation";

export default function SandboxTemplates() {
  const router = useRouter();

  const handleTemplateClick = (template: Template) => {
    router.push(`/playgrounds/sandbox?template=${template.template}&name=${encodeURIComponent(template.name)}`);
  };

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => {
        const IconComponent = template.icon;

        return (
          <div
            key={template.template}
            className="flex cursor-pointer items-center gap-6 rounded-lg border-2 border-slate-300 p-3 px-5 transition-colors hover:border-gray-500 dark:bg-white dark:text-black"
            onClick={() => handleTemplateClick(template)}
          >
            <div>
              <div
                className={`flex h-20 w-20 items-center justify-center rounded-md bg-slate-200 p-2 ${template.color}`}
              >
                <IconComponent className="h-12 w-12" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold">{template.name}</h1>
              <p className="text-sm text-slate-500">{template.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
