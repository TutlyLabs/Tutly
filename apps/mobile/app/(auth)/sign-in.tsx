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
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, router } from "expo-router";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react-native";

import { AppText } from "~/components/ui/AppText";
import { Screen } from "~/components/ui/Screen";
import { useAuth } from "~/lib/auth/auth-provider";
import { useTheme } from "~/lib/theme/use-theme";
import { openWebPath } from "~/lib/web-handoff";

export default function SignInScreen() {
  const { colors, isDark } = useTheme();
  const { isAuthenticated, isLoading, signIn } = useAuth();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <Screen scroll={false} contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        style={{ flex: 1, paddingHorizontal: 24, paddingTop: 72, paddingBottom: 28, justifyContent: "space-between" }}
      >
        {/* Brand */}
        <View style={{ alignItems: "center", marginTop: 24, marginBottom: 36 }}>
          <LinearGradient
            colors={[colors.primary, `${colors.primary}CC`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 62,
              height: 62,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.35,
              shadowRadius: 30,
              elevation: 8,
            }}
          >
            <Image
              source={require("../../assets/logo.png")}
              style={{ width: 32, height: 32 }}
              resizeMode="contain"
              tintColor="#FFFFFF"
            />
          </LinearGradient>
          <AppText style={{ fontSize: 26, fontWeight: "600", letterSpacing: -0.8, textAlign: "center", marginBottom: 6 }}>
            Welcome back
          </AppText>
          <AppText style={{ fontSize: 13, color: colors.inkSoft, textAlign: "center" }}>
            Sign in to continue learning on Tutly
          </AppText>
        </View>

        <View style={{ gap: 14 }}>
          {/* Google SSO */}
          <Pressable
            onPress={() => openWebPath("/sign-in?provider=google")}
            style={{
              height: 48,
              borderRadius: 12,
              backgroundColor: isDark ? "#FFFFFF" : colors.canvasElevated,
              borderWidth: isDark ? 0 : 1,
              borderColor: colors.lineHi,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <View style={{ width: 17, height: 17, alignItems: "center", justifyContent: "center" }}>
              <AppText style={{ fontSize: 14, fontWeight: "700" }}>G</AppText>
            </View>
            <AppText style={{ fontSize: 14, fontWeight: "600", letterSpacing: -0.1, color: isDark ? "#0B0B12" : colors.ink }}>
              Continue with Google
            </AppText>
          </Pressable>

          {/* Divider */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
            <AppText style={{ fontSize: 11, color: colors.inkFaint, fontWeight: "500", letterSpacing: 0.3 }}>
              or with email
            </AppText>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
          </View>

          {/* Email Field */}
          <View>
            <AppText style={{ fontSize: 11, fontWeight: "600", color: colors.inkSoft, letterSpacing: 0.3, marginBottom: 6, paddingLeft: 2 }}>
              Email
            </AppText>
            <View
              style={{
                height: 48,
                borderRadius: 12,
                backgroundColor: colors.canvasElevated,
                borderWidth: 1,
                borderColor: colors.line,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                gap: 10,
                overflow: "hidden",
              }}
            >
              {isDark && <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />}
              <Mail color={colors.inkFaint} size={18} strokeWidth={1.7} />
              <TextInput
                autoCapitalize="none"
                autoComplete="username"
                autoCorrect={false}
                onChangeText={setLogin}
                placeholder="you@college.edu"
                placeholderTextColor={colors.inkFaint}
                style={{ flex: 1, fontSize: 14, color: colors.ink, letterSpacing: -0.1 }}
                value={login}
              />
            </View>
          </View>

          {/* Password Field */}
          <View>
            <AppText style={{ fontSize: 11, fontWeight: "600", color: colors.inkSoft, letterSpacing: 0.3, marginBottom: 6, paddingLeft: 2 }}>
              Password
            </AppText>
            <View
              style={{
                height: 48,
                borderRadius: 12,
                backgroundColor: colors.canvasElevated,
                borderWidth: 1,
                borderColor: colors.line,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                gap: 10,
                overflow: "hidden",
              }}
            >
              {isDark && <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />}
              <LockKeyhole color={colors.inkFaint} size={18} strokeWidth={1.7} />
              <TextInput
                autoCapitalize="none"
                autoComplete="password"
                autoCorrect={false}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.inkFaint}
                secureTextEntry={!showPassword}
                style={{ flex: 1, fontSize: 14, color: colors.ink, letterSpacing: showPassword ? -0.1 : 3 }}
                value={password}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff color={colors.inkFaint} size={18} strokeWidth={1.7} />
                ) : (
                  <Eye color={colors.inkFaint} size={18} strokeWidth={1.7} />
                )}
              </Pressable>
            </View>
          </View>

          {/* Forgot password */}
          <Pressable onPress={() => openWebPath("/reset-password")} style={{ alignSelf: "flex-end" }}>
            <AppText style={{ fontSize: 12, color: colors.inkSoft, fontWeight: "500" }}>
              Forgot password?
            </AppText>
          </Pressable>

          {/* Error */}
          {error ? (
            <View style={{ backgroundColor: colors.coralLight, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 }}>
              <AppText style={{ color: colors.danger, fontSize: 12 }}>{error}</AppText>
            </View>
          ) : null}

          {/* Sign in button */}
          <Pressable
            disabled={!login.trim() || !password || isLoading || submitting}
            onPress={handleSignIn}
          >
            {({ pressed }) => (
              <View
                style={{
                  height: 48,
                  borderRadius: 12,
                  marginTop: 4,
                  backgroundColor: colors.primary,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: (!login.trim() || !password || isLoading || submitting) ? 0.5 : pressed ? 0.85 : 1,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.35,
                  shadowRadius: 24,
                  elevation: 6,
                }}
              >
                <AppText style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600", letterSpacing: -0.1 }}>
                  {submitting ? "Signing in..." : "Sign in"}
                </AppText>
                {!submitting && <ArrowRight color="#FFFFFF" size={16} strokeWidth={2} />}
              </View>
            )}
          </Pressable>
        </View>

        {/* Footer */}
        <View style={{ marginTop: "auto", paddingTop: 24 }}>
          <Pressable onPress={() => openWebPath("/sign-up")} style={{ alignSelf: "center", paddingVertical: 6 }}>
            <AppText style={{ textAlign: "center", fontSize: 12, color: colors.inkSoft }}>
              New to Tutly?{" "}
              <AppText style={{ color: colors.primary, fontWeight: "600", fontSize: 12 }}>Create account</AppText>
            </AppText>
          </Pressable>
          <AppText style={{ textAlign: "center", fontSize: 10, color: colors.inkFaint, marginTop: 14, lineHeight: 15 }}>
            By continuing you agree to our{"\n"}Terms of Service and Privacy Policy
          </AppText>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
