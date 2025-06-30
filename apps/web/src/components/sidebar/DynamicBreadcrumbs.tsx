import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useIsMobile } from "@/hooks/use-mobile";

const truncateText = (text: string, maxLength = 7): string => {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

export interface DynamicBreadcrumbsProps {
  pathname: string;
  crumbReplacement?: Record<string, string>;
  maxVisible?: number;
}

export function DynamicBreadcrumbs({
  pathname,
  crumbReplacement,
  maxVisible = 3,
}: DynamicBreadcrumbsProps) {
  const isMobile = useIsMobile();
  const pathSegments = pathname.split("/").filter((segment) => segment !== "");

  const showEllipsis = pathSegments.length > maxVisible;
  let visibleSegments: Array<{ segment: string; index: number }> = [];

  if (showEllipsis) {
    const firstSegment = pathSegments[0];
    if (firstSegment) {
      visibleSegments.push({ segment: firstSegment, index: 0 });
    }

    const lastSegmentsCount = maxVisible - 1;
    for (
      let i = Math.max(1, pathSegments.length - lastSegmentsCount);
      i < pathSegments.length;
      i++
    ) {
      const segment = pathSegments[i];
      if (segment) {
        visibleSegments.push({ segment, index: i });
      }
    }
  } else {
    visibleSegments = pathSegments
      .map((segment, index) => (segment ? { segment, index } : null))
      .filter(
        (item): item is { segment: string; index: number } => item !== null,
      );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {visibleSegments.map(({ segment, index }, arrayIndex) => {
          const href = `/${pathSegments.slice(0, index + 1).join("/")}`;
          const isLast = index === pathSegments.length - 1;
          const showingEllipsis =
            showEllipsis && arrayIndex === 0 && visibleSegments.length > 1;

          const rawDisplayText =
            crumbReplacement?.[segment] ??
            segment.charAt(0).toUpperCase() + segment.slice(1);
          const displayText = isMobile
            ? truncateText(rawDisplayText)
            : rawDisplayText;

          return (
            <Fragment key={segment + index}>
              <BreadcrumbItem>
                {!isLast ? (
                  <BreadcrumbLink href={href}>{displayText}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{displayText}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}

              {showingEllipsis && (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbPage>...</BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              )}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
