import Image from "next/image";

interface NoDataFoundProps {
  message?: string;
  additionalMessage?: string;
}

const NoDataFound = ({
  message = "No data found",
  additionalMessage = "Nothing here… like a to-do list after exams!",
}: NoDataFoundProps) => {
  return (
    <div>
      <p className="mt-5 text-center text-2xl font-bold">Oops! {message}</p>
      <Image
        src="/notify_nodata_found.svg"
        height={300}
        className="mx-auto mt-8"
        width={300}
        alt={message}
      />
      <p className="mt-4 text-center text-lg text-gray-400">
        {additionalMessage}
      </p>
    </div>
  );
};

export default NoDataFound;
