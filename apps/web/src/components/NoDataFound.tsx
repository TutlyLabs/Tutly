import Image from "next/image";

const NoDataFound = ({
  message = "No data found",
  className,
}: {
  message?: string;
  className?: string;
}) => {
  return (
    <div className={className}>
      <p className="mt-5 text-center text-3xl font-bold">Oops! {message}</p>
      <Image
        src="/notify_nodata_found.svg"
        height={400}
        width={400}
        className="mx-auto mt-8"
        alt={message}
      />
    </div>
  );
};

export default NoDataFound;
