"use client";

import { useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa";

import { Card } from "@tutly/ui/card";

import CourseFormModal from "./CourseFormModal";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

function AddCourse() {
  const router = useRouter();
  const [openModal, setOpenModal] = useState(false);

  const searchParams = useSearchParams();

  useEffect(() => {
    const modal = searchParams.get("modal");
    if (modal === "create") {
      setOpenModal(true);
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("modal");
      router.replace(`/courses?${newSearchParams.toString()}`, {
        scroll: false,
      });
    }
  }, [searchParams, router]);

  return (
    <>
      <Card
        className="text-primary group bg-card hover:bg-primary/5 hover:border-primary/40 flex aspect-[16/9] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors"
        onClick={() => setOpenModal(true)}
      >
        <div className="text-center">
          <FaPlus className="mx-auto text-3xl transition-transform group-hover:scale-110" />
          <h1 className="mt-2 text-sm font-medium">New course</h1>
        </div>
      </Card>

      <CourseFormModal
        open={openModal}
        onOpenChange={setOpenModal}
        mode="add"
      />
    </>
  );
}

export default AddCourse;
