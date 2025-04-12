import { FAQs } from "@/components/FAQs";
import { Home } from "@/components/Home";
import { Testimonials } from "@/components/Testimonials";

import { metadata } from "./layout";

metadata.title = "Tutly";

export default function Page() {
  return (
    <div>
      <div id="home">
        <Home />
      </div>
      <div id="testimonials">
        <Testimonials />
      </div>
      <div id="faqs">
        <FAQs />
      </div>
    </div>
  );
}
