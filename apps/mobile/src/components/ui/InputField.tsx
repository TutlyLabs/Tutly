import type { TextInputProps } from "react-native";
import { TextInput, View } from "react-native";

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
    <View className="gap-sm">
      {label ? <AppText variant="label">{label}</AppText> : null}
      <TextInput
        multiline={multiline}
        numberOfLines={numberOfLines}
        placeholderTextColor={colors.inkSoft}
        style={[
          {
            backgroundColor: colors.canvas,
            borderColor: colors.border,
            color: colors.ink,
            minHeight: multiline ? 120 : 52,
            textAlignVertical: multiline ? "top" : "center",
            borderRadius: 12,
            borderWidth: 1,
            fontSize: 15,
            fontWeight: "600",
            paddingHorizontal: 16,
            paddingVertical: 16,
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
