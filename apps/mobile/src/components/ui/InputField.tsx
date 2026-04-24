import type { TextInputProps } from "react-native";
import { StyleSheet, TextInput, View } from "react-native";

import { radius, spacing } from "~/lib/theme/tokens";
import { useTheme } from "~/lib/theme/use-theme";
import { AppText } from "./AppText";

type InputFieldProps = TextInputProps & {
  label?: string;
  helper?: string;
};

export function InputField({
  label,
  helper,
  multiline,
  numberOfLines,
  style,
  ...props
}: InputFieldProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <TextInput
        multiline={multiline}
        numberOfLines={numberOfLines}
        placeholderTextColor={colors.inkSoft}
        style={[
          styles.input,
          {
            backgroundColor: colors.canvas,
            borderColor: colors.border,
            color: colors.ink,
            minHeight: multiline ? 120 : 52,
            textAlignVertical: multiline ? "top" : "center",
          },
          style,
        ]}
        {...props}
      />
      {helper ? (
        <AppText muted variant="caption">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    fontSize: 15,
    fontWeight: "600",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
