import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Clock3, PlayCircle, Radio } from "lucide-react-native";

import type { ClassSummary } from "~/types/tutly";
import { AppText } from "~/components/ui/AppText";
import { Card } from "~/components/ui/Card";
import { Chip } from "~/components/ui/Chip";
import { useTheme } from "~/lib/theme/use-theme";

type ClassCardProps = {
  item: ClassSummary;
};

export function ClassCard({ item }: ClassCardProps) {
  const { colors } = useTheme();
  const isLive = item.classType === "LIVE";

  return (
    <Pressable onPress={() => router.push(`/class/${item.id}`)}>
      {({ pressed }) => (
        <Card className="flex-row gap-md overflow-hidden" style={pressed ? { opacity: 0.74 } : undefined}>
          <View
            className="rounded-pill w-[6px]"
            style={{ backgroundColor: isLive ? colors.coral : colors.primary }}
          />
          <View className="flex-1 gap-sm">
            <View className="flex-row flex-wrap gap-sm">
              <Chip
                icon={isLive ? Radio : PlayCircle}
                tone={isLive ? "coral" : "primary"}
              >
                {isLive ? "Live class" : item.video?.videoType || "Recording"}
              </Chip>
              {item.Folder?.title ? (
                <Chip tone="neutral">{item.Folder.title}</Chip>
              ) : null}
            </View>
            <AppText variant="subtitle">{item.title}</AppText>
            <View className="flex-row items-center gap-xs">
              <Clock3 color={colors.inkMuted} size={15} />
              <AppText muted variant="caption">
                {new Date(
                  item.startTime || item.createdAt || Date.now(),
                ).toLocaleString()}
              </AppText>
            </View>
          </View>
        </Card>
      )}
    </Pressable>
  );
}
