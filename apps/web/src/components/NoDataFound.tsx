import Image from "next/image";

const NoDataFound = ({ message = "No data found" }: { message?: string }) => {
  return (
    <div>
      <Image
        src="/notify_nodata_found.svg"
        height={400}
        className="mx-auto mt-8"
        width={400}
        alt={message}
      />
      <p className="mt-4 text-center text-lg text-gray-400">The page is missing… just like that one homework assignment.</p>
    </div>
  );
};

export default NoDataFound;
