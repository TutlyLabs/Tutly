import { AnimatedTestimonials } from "@/components/ui/animated-testimonials";

export function Testimonials() {
  const testimonials = [
    {
      quote:
        "The attention to detail and innovative features have completely transformed our workflow. This is exactly what we've been looking for.",
      name: "VNR Vignana Jyothi Institute of Engineering and Technology",
      designation: "Hyderabad, Telangana",
      src: "/images/testimonials/vnr-logo.jpg",
    },
    {
      quote:
        "Implementation was seamless and the results exceeded our expectations. The platform's flexibility is remarkable.",
      name: "PVP Siddhartha Institute of Technology",
      designation: "Vijayawada, Andhra Pradesh",
      src: "/images/testimonials/pvp-logo.png",
    },
  ];
  return (
    <div className="px-4 sm:px-6">
      <AnimatedTestimonials testimonials={testimonials} />
    </div>
  );
}
