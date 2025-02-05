import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@tutly/ui/breadcrumb";

export interface DynamicBreadcrumbsProps {
  pathname: string;
  crumbReplacement?: Record<string, string>;
}
export function DynamicBreadcrumbs({
  pathname,
  crumbReplacement,
}: DynamicBreadcrumbsProps) {
  const pathSegments = pathname.split("/").filter((segment) => segment !== "");

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {pathSegments.map((segment, index) => {
          const href = `/${pathSegments.slice(0, index + 1).join("/")}`;
          const isLast = index === pathSegments.length - 1;

          const displayText =
            crumbReplacement?.[segment] ??
            segment.charAt(0).toUpperCase() + segment.slice(1);

          return (
            <Fragment key={segment}>
              <BreadcrumbItem>
                {!isLast ? (
                  <BreadcrumbLink href={href}>{displayText}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{displayText}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
