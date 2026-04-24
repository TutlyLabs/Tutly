import { View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { BookOpenCheck, FileText } from "lucide-react-native";

import { EmptyState } from "~/components/ui/EmptyState";
import { PageHeader } from "~/components/ui/PageHeader";
import { Screen } from "~/components/ui/Screen";
import { SectionHeader } from "~/components/ui/SectionHeader";
import { AssignmentCard } from "~/features/assignments/AssignmentCard";
import { ClassCard } from "~/features/courses/ClassCard";
import { useAssignments, useCourseClasses } from "~/lib/api/hooks";
import { selectAssignments, selectClasses } from "~/lib/api/mobile-selectors";

export default function CourseDetailScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const classesQuery = useCourseClasses(courseId);
  const assignmentsQuery = useAssignments();
  const classes = selectClasses(classesQuery.data);
  const assignments = selectAssignments(assignmentsQuery.data).filter(
    (assignment) => assignment.class?.courseId === courseId,
  );

  return (
    <Screen
      onRefresh={() => {
        void classesQuery.refetch();
        void assignmentsQuery.refetch();
      }}
      refreshing={classesQuery.isFetching || assignmentsQuery.isFetching}
    >
      <Stack.Screen options={{ title: "Course" }} />
      <PageHeader showBack title="Course" />

      <View className="gap-sm">
        <SectionHeader action={`${classes.length}`} title="Classes" />
        {classes.map((classItem) => (
          <ClassCard item={classItem} key={classItem.id} />
        ))}
        {!classes.length && !classesQuery.isLoading ? (
          <EmptyState
            body="Classes will appear here."
            icon={BookOpenCheck}
            title="No classes yet"
          />
        ) : null}
      </View>

      <View className="gap-sm">
        <SectionHeader title="Assignments" />
        {assignments.map((assignment) => (
          <AssignmentCard assignment={assignment} key={assignment.id} />
        ))}
        {!assignments.length ? (
          <EmptyState
            body="Assignments for this course will appear here."
            icon={FileText}
            title="No assignments yet"
          />
        ) : null}
      </View>
    </Screen>
  );
}
