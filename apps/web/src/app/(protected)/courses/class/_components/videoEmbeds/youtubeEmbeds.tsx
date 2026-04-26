"use client";

const YoutubeEmbed = ({ embedId }: { embedId: string }) => (
  <div className="">
    <iframe
      src={`https://www.youtube.com/embed/${embedId}`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      title="Embedded youtube"
      className="aspect-video w-full"
    />
  </div>
);

export default YoutubeEmbed;
