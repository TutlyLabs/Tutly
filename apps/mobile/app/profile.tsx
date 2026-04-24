import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { Mail, Phone, UserRound } from "lucide-react-native";

import { AppText } from "~/components/ui/AppText";
import { Card } from "~/components/ui/Card";
import { Chip } from "~/components/ui/Chip";
import { PageHeader } from "~/components/ui/PageHeader";
import { Screen } from "~/components/ui/Screen";
import { useProfile } from "~/lib/api/hooks";
import { useAuth } from "~/lib/auth/auth-provider";
import { spacing } from "~/lib/theme/tokens";
import { useTheme } from "~/lib/theme/use-theme";

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const profileQuery = useProfile();
  const profile = profileQuery.data as any;
  const profileUser = profile?.data || profile || user;

  return (
    <Screen
      onRefresh={() => void profileQuery.refetch()}
      refreshing={profileQuery.isFetching}
    >
      <Stack.Screen options={{ title: "Profile" }} />
      <PageHeader showBack title="Profile" />
      <Card elevated style={styles.profile}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <UserRound color="#FFFFFF" size={30} strokeWidth={2} />
        </View>
        <Chip tone="primary">{profileUser?.role || user?.role}</Chip>
        <AppText variant="title">{profileUser?.name || user?.name}</AppText>
        <AppText muted>{profileUser?.username || user?.username}</AppText>
      </Card>

      <Card style={styles.details}>
        <View style={styles.row}>
          <Mail color={colors.sky} size={17} />
          <View>
            <AppText variant="caption">Email</AppText>
            <AppText muted>{profileUser?.email || "Not set"}</AppText>
          </View>
        </View>
        <View style={styles.row}>
          <Phone color={colors.coral} size={17} />
          <View>
            <AppText variant="caption">Mobile</AppText>
            <AppText muted>
              {profileUser?.mobile || profileUser?.profile?.mobile || "Not set"}
            </AppText>
          </View>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: {
    alignItems: "center",
    gap: spacing.sm,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 24,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  details: {
    gap: spacing.md,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
});
