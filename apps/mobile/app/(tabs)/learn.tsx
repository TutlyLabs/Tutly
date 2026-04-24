import { View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck } from "lucide-react-native";

import { EmptyState } from "~/components/ui/EmptyState";
import { PageHeader } from "~/components/ui/PageHeader";
import { Screen } from "~/components/ui/Screen";
import { CourseCard } from "~/features/courses/CourseCard";
import { useCourses } from "~/lib/api/hooks";
import { selectCourses } from "~/lib/api/mobile-selectors";
import { queryKeys } from "~/lib/api/query-keys";

export default function LearnScreen() {
  const queryClient = useQueryClient();
  const coursesQuery = useCourses();
  const courses = selectCourses(coursesQuery.data);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.courses });
  };

  return (
    <Screen onRefresh={refresh} refreshing={coursesQuery.isFetching}>
      <PageHeader title="Courses" />
      <View className="gap-[10px]">
        {courses.map((course) => (
          <CourseCard course={course} key={course.id} />
        ))}
      </View>
      {!courses.length && !coursesQuery.isLoading ? (
        <EmptyState
          body="Your enrolled courses will appear here."
          icon={BookOpenCheck}
          title="No courses yet"
        />
      ) : null}
    </Screen>
  );
}
