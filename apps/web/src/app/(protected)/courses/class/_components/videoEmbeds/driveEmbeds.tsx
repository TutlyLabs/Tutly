"use client";

const DriveEmbed = ({ embedId }: { embedId: string }) => (
  <div className="">
    <iframe
      src={`https://drive.google.com/file/d/${embedId}/preview`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; storage-access *"
      allowFullScreen
      title="Embedded Drive"
      className="aspect-video w-full"
      referrerPolicy="no-referrer-when-downgrade"
    />
  </div>
);
export default DriveEmbed;
