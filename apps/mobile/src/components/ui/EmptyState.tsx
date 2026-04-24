import type { LucideIcon } from "lucide-react-native";
import { View } from "react-native";

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
    <Card className="items-center gap-sm py-xl">
      <View
        className="items-center rounded-pill h-[48px] justify-center w-[48px]"
        style={{ backgroundColor: `${colors.primary}10` }}
      >
        <Icon color={colors.primary} size={22} strokeWidth={2} />
      </View>
      <AppText variant="subtitle">{title}</AppText>
      {body ? (
        <AppText muted style={{ textAlign: "center" }}>
          {body}
        </AppText>
      ) : null}
    </Card>
  );
}
