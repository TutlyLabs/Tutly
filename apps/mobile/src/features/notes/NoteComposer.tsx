import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { NotebookPen, Trash2 } from "lucide-react-native";

import { AppText } from "~/components/ui/AppText";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { InputField } from "~/components/ui/InputField";
import { radius, spacing } from "~/lib/theme/tokens";
import { useTheme } from "~/lib/theme/use-theme";

type NoteComposerProps = {
  category: "CLASS" | "ASSIGNMENT" | "DOUBT";
  objectId: string;
  title?: string;
  initialDescription?: string | null;
  initialTags?: string[];
  saving?: boolean;
  embedded?: boolean;
  onSave: (input: {
    description: string | null;
    tags: string[];
  }) => Promise<void>;
  onClear?: () => Promise<void>;
};

export function NoteComposer({
  category,
  objectId,
  title = "Personal notes",
  initialDescription,
  initialTags,
  saving = false,
  embedded = false,
  onSave,
  onClear,
}: NoteComposerProps) {
  const { colors } = useTheme();
  const [description, setDescription] = useState(initialDescription || "");
  const [tagsInput, setTagsInput] = useState((initialTags || []).join(", "));

  useEffect(() => {
    setDescription(initialDescription || "");
    setTagsInput((initialTags || []).join(", "));
  }, [initialDescription, initialTags, objectId, category]);

  const parsedTags = tagsInput
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const handleSave = async () => {
    await Haptics.selectionAsync();
    await onSave({
      description: description.trim() ? description.trim() : null,
      tags: parsedTags,
    });
  };

  const handleClear = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setDescription("");
    setTagsInput("");
    await onClear?.();
  };

  const body = (
    <>
      <View style={styles.header}>
        <View style={styles.copy}>
          <NotebookPen size={18} />
          <AppText variant="subtitle">{title}</AppText>
        </View>
        <AppText muted variant="caption">
          {category}
        </AppText>
      </View>
      <InputField
        helper="Saved to your Tutly account."
        label="Note"
        multiline
        numberOfLines={6}
        onChangeText={setDescription}
        placeholder="Write the bits you want to remember from this item."
        value={description}
      />
      <InputField
        helper="Separate tags with commas."
        label="Tags"
        onChangeText={setTagsInput}
        placeholder="attendance, revision, follow-up"
        value={tagsInput}
      />
      <View style={styles.actions}>
        <Button loading={saving} onPress={handleSave}>
          Save note
        </Button>
        {onClear ? (
          <Button
            icon={Trash2}
            loading={saving}
            onPress={handleClear}
            tone="ghost"
          >
            Clear
          </Button>
        ) : null}
      </View>
    </>
  );

  if (embedded) {
    return (
      <View
        style={[
          styles.card,
          styles.embedded,
          {
            backgroundColor: colors.canvas,
            borderColor: colors.border,
          },
        ]}
      >
        {body}
      </View>
    );
  }

  return (
    <Card elevated style={styles.card}>
      {body}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  embedded: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  copy: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.md,
  },
});
