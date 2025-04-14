import {
  FaChalkboardTeacher,
  FaChartLine,
  FaClipboardCheck,
  FaFileUpload,
  FaGraduationCap,
  FaLaptop,
  FaRocket,
  FaUserPlus,
  FaUsers,
  FaUserTie,
} from "react-icons/fa";

const faqs = [
  {
    question: "What is Tutly?",
    answer:
      "Tutly is a powerful Learning Management System (LMS) that simplifies teaching, mentoring, and learning. It enables instructors to create and manage courses, assign mentors to students, track progress, and evaluate assignments—all in one seamless platform.",
    icon: <FaGraduationCap />,
  },
  {
    question: "Who can use Tutly?",
    answer:
      "Tutly is designed for educational institutions, instructors, mentors, and students. Instructors can manage courses, mentors can assist with student evaluation, and students can learn and complete assignments efficiently.",
    icon: <FaUsers />,
  },
  {
    question: "What is the role of an instructor on Tutly?",
    answer:
      "Instructors have full control over course creation and student enrollment. They can add classes, assignments, and exams, track student performance, generate course reports, and manage users.",
    icon: <FaChalkboardTeacher />,
  },
  {
    question: "What is a mentor, and how do they help?",
    answer:
      "A mentor is assigned by an instructor to oversee a group of students. Mentors evaluate assignments, provide feedback, track attendance (via Excel uploads from Zoom, etc.), and assist with student management to ensure smooth learning.",
    icon: <FaUserTie />,
  },
  {
    question: "How do students enroll in a course?",
    answer:
      "Students are enrolled by the instructor. Once enrolled, they can access course materials, attend classes, submit assignments, and track their progress.",
    icon: <FaUserPlus />,
  },
  {
    question: "Can assignments be submitted through Tutly?",
    answer:
      "Yes! Students can upload their assignments directly on Tutly, and instructors or mentors can review, grade, and provide feedback—all within the platform.",
    icon: <FaFileUpload />,
  },
  {
    question: "Does Tutly support attendance tracking?",
    answer:
      "Yes! Instructors and mentors can upload attendance sheets (e.g., from Zoom) in Excel format, allowing easy tracking of student participation.",
    icon: <FaClipboardCheck />,
  },
  {
    question: "Is there an analytics feature for tracking student progress?",
    answer:
      "Absolutely! Tutly provides detailed course-wise reports, performance analytics, and real-time statistics to help instructors and mentors monitor student engagement and success.",
    icon: <FaChartLine />,
  },
  {
    question: "Is Tutly suitable for offline or hybrid courses?",
    answer:
      "No, Tutly is exclusively designed for online learning and does not support offline or hybrid models.",
    icon: <FaLaptop />,
  },
  {
    question: "How do I get started with Tutly?",
    answer:
      "If you're an institution or instructor, you can contact us to create an instructor account. From there, you can start creating courses, enrolling students, and assigning mentors.",
    icon: <FaRocket />,
  },
];

export function FAQs() {
  return (
    <div className="mx-auto my-8 grid max-w-7xl grid-cols-1 sm:grid-cols-2 gap-4">
      {faqs.map(({ question, answer, icon }) => (
        <Card question={question} answer={answer} icon={icon} key={question} />
      ))}
    </div>
  );
}

function Card({
  question,
  answer,
  icon,
}: {
  question: string;
  answer: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="group flex items-start gap-2 rounded-lg p-8 shadow-md">
      <div className="rounded border border-gray-600 p-2 duration-500 group-hover:border-blue-500 group-hover:text-blue-500">
        {icon}
      </div>
      <div className="">
        <h1 className="text-lg font-semibold tracking-wide transition-transform duration-500 group-hover:translate-x-4">
          {question}
        </h1>
        <p className="mt-4 text-gray-500">{answer}</p>
      </div>
    </div>
  );
}
