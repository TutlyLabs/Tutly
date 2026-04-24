import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
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
import { spacing } from "~/lib/theme/tokens";
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
      <View style={styles.list}>
        {items.map((item) => (
          <Card key={item.key} style={styles.card}>
            <View style={[styles.icon, { backgroundColor: `${colors.primary}10` }]}>
              <FileVideo color={colors.primary} size={20} strokeWidth={2} />
            </View>
            <View style={styles.copy}>
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
            <View style={styles.actions}>
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

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  card: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  icon: {
    alignItems: "center",
    borderRadius: 10,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  actions: {
    gap: spacing.xs,
  },
});
