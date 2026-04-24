import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { spacing } from "~/lib/theme/tokens";
import { useTheme } from "~/lib/theme/use-theme";
import { AppText } from "./AppText";
import { Card } from "./Card";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  body?: string;
};

export function EmptyState({ icon: Icon, title, body }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <Card style={styles.card}>
      <View style={[styles.icon, { backgroundColor: `${colors.primary}10` }]}>
        <Icon color={colors.primary} size={22} strokeWidth={2} />
      </View>
      <AppText variant="subtitle">{title}</AppText>
      {body ? (
        <AppText muted style={styles.body}>
          {body}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  icon: {
    alignItems: "center",
    borderRadius: 999,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  body: {
    textAlign: "center",
  },
});
