import { useCallback, useState } from "react";
import { View } from "react-native";
import * as Linking from "expo-linking";
import { Stack, useFocusEffect } from "expo-router";
import { Download, ExternalLink, FileVideo, Trash2 } from "lucide-react-native";

import type { CachedMedia } from "~/lib/media/media-cache";
import { AppText } from "~/components/ui/AppText";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { EmptyState } from "~/components/ui/EmptyState";
import { PageHeader } from "~/components/ui/PageHeader";
import { Screen } from "~/components/ui/Screen";
import { getMediaManifest, removeCachedMedia } from "~/lib/media/media-cache";
import { useTheme } from "~/lib/theme/use-theme";

export default function DownloadsScreen() {
  const { colors } = useTheme();
  const [items, setItems] = useState<CachedMedia[]>([]);

  const refresh = useCallback(async () => {
    const manifest = await getMediaManifest();
    setItems(Object.values(manifest));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const remove = async (key: string) => {
    await removeCachedMedia(key);
    await refresh();
  };

  return (
    <Screen onRefresh={refresh}>
      <Stack.Screen options={{ title: "Downloads" }} />
      <PageHeader showBack title="Downloads" />
      <View className="gap-sm">
        {items.map((item) => (
          <Card key={item.key} className="flex-row items-center gap-sm">
            <View
              className="items-center rounded-[10px] h-[42px] justify-center w-[42px]"
              style={{ backgroundColor: `${colors.primary}10` }}
            >
              <FileVideo color={colors.primary} size={20} strokeWidth={2} />
            </View>
            <View className="flex-1 gap-[2px]">
              <AppText variant="subtitle">{item.title}</AppText>
              <AppText muted variant="caption">
                {item.bytes
                  ? `${(item.bytes / (1024 * 1024)).toFixed(1)} MB`
                  : "Downloaded"}
              </AppText>
              <AppText muted variant="caption">
                {new Date(item.downloadedAt).toLocaleString()}
              </AppText>
            </View>
            <View className="gap-xs">
              <Button
                icon={ExternalLink}
                onPress={() => Linking.openURL(item.localUri)}
                tone="secondary"
              >
                Open
              </Button>
              <Button
                icon={Trash2}
                onPress={() => remove(item.key)}
                tone="ghost"
              >
                Remove
              </Button>
            </View>
          </Card>
        ))}
      </View>
      {!items.length ? (
        <EmptyState
          body="Media you download will appear here."
          icon={Download}
          title="No downloads yet"
        />
      ) : null}
    </Screen>
  );
}
