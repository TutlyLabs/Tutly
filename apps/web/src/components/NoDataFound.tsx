import Image from "next/image";

import { cn } from "@tutly/utils";

interface NoDataFoundProps {
  message?: string;
  description?: string;
  className?: string;
  hideIllustration?: boolean;
}

const NoDataFound = ({
  message = "No data found",
  description,
  className,
  hideIllustration = false,
}: NoDataFoundProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-4 py-8 text-center",
        className,
      )}
    >
      {!hideIllustration && (
        <Image
          src="/notify_nodata_found.svg"
          height={200}
          width={200}
          className="mx-auto h-32 w-32 opacity-90 sm:h-40 sm:w-40"
          alt={message}
        />
      )}
      <div className="space-y-1">
        <p className="text-foreground text-base font-semibold sm:text-lg">
          {message}
        </p>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
    </div>
  );
};

export default NoDataFound;
