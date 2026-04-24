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
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
      keyboardShouldPersistTaps="handled"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        className="flex-1"
      >
        <View className="flex-1 gap-xxl justify-center px-xl">
          <View className="items-center gap-sm">
            <Image
              source={require("../../assets/logo.png")}
              className="h-[48px] mb-sm w-[48px]"
              resizeMode="contain"
            />
            <AppText variant="title">Sign in to Tutly</AppText>
            <AppText muted>
              Access your classes, assignments, and progress.
            </AppText>
          </View>

          <View className="gap-lg">
            <View className="gap-xs">
              <AppText variant="caption" style={{ fontWeight: "600" }}>Username or email</AppText>
              <View
                className="flex-row items-center rounded-md gap-sm min-h-[46px] px-md"
                style={{ borderWidth: StyleSheet.hairlineWidth, backgroundColor: colors.canvasElevated, borderColor: colors.border }}
              >
                <Mail color={colors.inkSoft} size={16} />
                <TextInput
                  autoCapitalize="none"
                  autoComplete="username"
                  autoCorrect={false}
                  onChangeText={setLogin}
                  placeholder="you@college.edu"
                  placeholderTextColor={colors.inkSoft}
                  className="flex-1 text-[14px] font-medium" style={{ color: colors.ink }}
                  value={login}
                />
              </View>
            </View>

            <View className="gap-xs">
              <AppText variant="caption" style={{ fontWeight: "600" }}>Password</AppText>
              <View
                className="flex-row items-center rounded-md gap-sm min-h-[46px] px-md"
                style={{ borderWidth: StyleSheet.hairlineWidth, backgroundColor: colors.canvasElevated, borderColor: colors.border }}
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
                  className="flex-1 text-[14px] font-medium" style={{ color: colors.ink }}
                  value={password}
                />
              </View>
            </View>

            {error ? (
              <View
                className="rounded-sm px-md py-sm"
                style={{
                  backgroundColor: "#FEE2E2",
                  borderColor: "#FECACA",
                  borderWidth: StyleSheet.hairlineWidth,
                }}
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
              style={{ width: "100%", minHeight: 46 }}
            >
              Sign in
            </Button>

            <Pressable
              onPress={() => openWebPath("/reset-password")}
              className="self-center py-xs"
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
