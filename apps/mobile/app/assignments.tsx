import { View } from "react-native";
import { Stack } from "expo-router";
import { FileText } from "lucide-react-native";

import { EmptyState } from "~/components/ui/EmptyState";
import { PageHeader } from "~/components/ui/PageHeader";
import { Screen } from "~/components/ui/Screen";
import { AssignmentCard } from "~/features/assignments/AssignmentCard";
import { useAssignments } from "~/lib/api/hooks";
import { selectAssignments } from "~/lib/api/mobile-selectors";

export default function AssignmentsScreen() {
  const assignmentsQuery = useAssignments();
  const assignments = selectAssignments(assignmentsQuery.data);

  return (
    <Screen
      onRefresh={() => void assignmentsQuery.refetch()}
      refreshing={assignmentsQuery.isFetching}
    >
      <Stack.Screen options={{ title: "Assignments" }} />
      <PageHeader showBack title="Assignments" />
      <View className="gap-[10px]">
        {assignments.map((assignment) => (
          <AssignmentCard assignment={assignment} key={assignment.id} />
        ))}
      </View>
      {!assignments.length && !assignmentsQuery.isLoading ? (
        <EmptyState
          body="Your assignments will appear here."
          icon={FileText}
          title="No assignments yet"
        />
      ) : null}
    </Screen>
  );
}
