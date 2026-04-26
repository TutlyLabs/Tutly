export const organization = {
  name: "Tutly Org",
  createdAt: new Date(),
  orgCode: "tutly",
};

export const courses = [
  {
    title: "Course 1",
    isPublished: true,
  },
  {
    title: "Course 2",
    isPublished: true,
  },
];

export const users = [
  {
    name: "Instructor 1",
    username: "INSTRUCTOR_001",
    email: "instructor@tutly.in",
    role: "INSTRUCTOR",
  },
  {
    name: "Mentor 1",
    username: "MENTOR_001",
    email: "mentor1@tutly.in",
    role: "MENTOR",
  },
  {
    name: "Mentor 2",
    username: "MENTOR_002",
    email: "mentor2@tutly.in",
    role: "MENTOR",
  },
  ...Array.from({ length: 10 }, (_, i) => ({
    name: `Student ${i + 1}`,
    username: `STUDENT_${String(i + 1).padStart(3, "0")}`,
    email: `student${i + 1}@tutly.in`,
    role: "STUDENT",
  })),
];

export const userPasswords = {
  "instructor@tutly.in": "instructor@123",
  "mentor1@tutly.in": "mentor@123",
  "mentor2@tutly.in": "mentor@123",
  ...Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [
      `student${i + 1}@tutly.in`,
      "student@123",
    ]),
  ),
};
