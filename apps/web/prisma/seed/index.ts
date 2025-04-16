import { PrismaClient, type Course, type User } from "@prisma/client";
import bcrypt from "bcryptjs";

import { courses, organization, users } from "./data/users";

const prisma = new PrismaClient();

async function cleanDatabase() {
  await prisma.enrolledUsers.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  console.log("Cleaned up the database");
}

async function seedOrganization() {
  const org = await prisma.organization.create({
    data: organization,
  });
  console.log("Created organization:", org.name);
  return org;
}

async function seedUsers(organizationId: string) {
  const createdUsers = [];
  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const createdUser = await prisma.user.create({
      data: {
        ...user,
        password: hashedPassword,
        organizationId,
        isProfilePublic: true,
      },
    });
    createdUsers.push(createdUser);
    console.log(`Created user: ${user.name} (${user.role})`);
  }
  return createdUsers;
}

async function seedCourses(instructor: User) {
  const createdCourses = [];
  for (const course of courses) {
    const createdCourse = await prisma.course.create({
      data: {
        ...course,
        createdById: instructor.id,
      },
    });
    createdCourses.push(createdCourse);
    console.log(`Created course: ${course.title}`);
  }
  return createdCourses;
}

async function seedEnrollments(createdUsers: User[], createdCourses: Course[]) {
  const [instructor, mentor1, mentor2, ...students] = createdUsers;
  if (!instructor || !mentor1 || !mentor2) {
    throw new Error("Missing instructor or mentors");
  }

  for (const course of createdCourses) {
    // Enroll instructor
    await prisma.enrolledUsers.create({
      data: {
        username: instructor.username,
        courseId: course.id,
      },
    });
    console.log(`Enrolled instructor ${instructor.name} in ${course.title}`);

    // Enroll mentors
    await prisma.enrolledUsers.create({
      data: {
        username: mentor1.username,
        courseId: course.id,
      },
    });
    console.log(`Enrolled mentor ${mentor1.name} in ${course.title}`);

    await prisma.enrolledUsers.create({
      data: {
        username: mentor2.username,
        courseId: course.id,
      },
    });
    console.log(`Enrolled mentor ${mentor2.name} in ${course.title}`);

    // Enroll all students with alternating mentors
    for (const [index, student] of students.entries()) {
      const mentor = index % 2 === 0 ? mentor1 : mentor2;
      await prisma.enrolledUsers.create({
        data: {
          username: student.username,
          mentorUsername: mentor.username,
          courseId: course.id,
        },
      });
      console.log(
        `Enrolled student ${student.name} with mentor ${mentor.name} in ${course.title}`,
      );
    }
  }
}


async function main() {
  try {
    console.log("Starting seed...");

    await cleanDatabase();

    const org = await seedOrganization();
    const createdUsers = await seedUsers(org.id);
    // First user is instructor
    const createdCourses = await seedCourses(createdUsers[0]!);
    await seedEnrollments(createdUsers, createdCourses);
    console.log("✅ Seed completed successfully");
  } catch (error) {
    console.error("Seed failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
