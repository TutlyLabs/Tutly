import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Redirect, router } from "expo-router";
import { LockKeyhole, Mail } from "lucide-react-native";

import { AppText } from "~/components/ui/AppText";
import { Button } from "~/components/ui/Button";
import { Screen } from "~/components/ui/Screen";
import { useAuth } from "~/lib/auth/auth-provider";
import { radius, spacing } from "~/lib/theme/tokens";
import { useTheme } from "~/lib/theme/use-theme";
import { openWebPath } from "~/lib/web-handoff";

export default function SignInScreen() {
  const { colors } = useTheme();
  const { isAuthenticated, isLoading, signIn } = useAuth();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Redirect href="/(tabs)" />;

  const handleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    const result = await signIn({ login, password });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace("/(tabs)");
  };

  return (
    <Screen
      scroll={false}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        style={styles.keyboard}
      >
        <View style={styles.stack}>
          <View style={styles.brand}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <AppText variant="title">Sign in to Tutly</AppText>
            <AppText muted>
              Access your classes, assignments, and progress.
            </AppText>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <AppText variant="caption" style={{ fontWeight: "600" }}>Username or email</AppText>
              <View
                style={[
                  styles.inputShell,
                  {
                    backgroundColor: colors.canvasElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Mail color={colors.inkSoft} size={16} />
                <TextInput
                  autoCapitalize="none"
                  autoComplete="username"
                  autoCorrect={false}
                  onChangeText={setLogin}
                  placeholder="you@college.edu"
                  placeholderTextColor={colors.inkSoft}
                  style={[styles.input, { color: colors.ink }]}
                  value={login}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <AppText variant="caption" style={{ fontWeight: "600" }}>Password</AppText>
              <View
                style={[
                  styles.inputShell,
                  {
                    backgroundColor: colors.canvasElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                <LockKeyhole color={colors.inkSoft} size={16} />
                <TextInput
                  autoCapitalize="none"
                  autoComplete="password"
                  autoCorrect={false}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  placeholderTextColor={colors.inkSoft}
                  secureTextEntry
                  style={[styles.input, { color: colors.ink }]}
                  value={password}
                />
              </View>
            </View>

            {error ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: "#FEE2E2",
                    borderColor: "#FECACA",
                  },
                ]}
              >
                <AppText style={{ color: "#DC2626" }} variant="caption">
                  {error}
                </AppText>
              </View>
            ) : null}

            <Button
              disabled={!login.trim() || !password || isLoading}
              loading={submitting}
              onPress={handleSignIn}
              style={styles.signInButton}
            >
              Sign in
            </Button>

            <Pressable
              onPress={() => openWebPath("/reset-password")}
              style={styles.forgotLink}
            >
              <AppText muted variant="caption">
                Forgot password?
              </AppText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  keyboard: {
    flex: 1,
  },
  stack: {
    flex: 1,
    gap: spacing.xxl,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  brand: {
    alignItems: "center",
    gap: spacing.sm,
  },
  logo: {
    height: 48,
    marginBottom: spacing.sm,
    width: 48,
  },
  form: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  inputShell: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  errorBox: {
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  signInButton: {
    width: "100%",
    minHeight: 46,
  },
  forgotLink: {
    alignSelf: "center",
    paddingVertical: spacing.xs,
  },
});
