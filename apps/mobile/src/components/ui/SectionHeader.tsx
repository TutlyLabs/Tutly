import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "./AppText";

type SectionHeaderProps = {
  title: string;
  action?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, action, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <AppText variant="subtitle">{title}</AppText>
      {action ? (
        <Pressable onPress={onAction}>
          {({ pressed }) => (
            <AppText
              muted
              variant="caption"
              style={pressed ? { opacity: 0.7 } : undefined}
            >
              {action}
            </AppText>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
