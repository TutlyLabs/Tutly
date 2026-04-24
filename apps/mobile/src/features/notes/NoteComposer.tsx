import { useEffect, useState } from "react";
import { View } from "react-native";
import * as Haptics from "expo-haptics";
import { NotebookPen, Trash2 } from "lucide-react-native";

import { AppText } from "~/components/ui/AppText";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { InputField } from "~/components/ui/InputField";
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
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-sm">
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
      <View className="gap-md">
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
        className="gap-lg rounded-lg border p-lg"
        style={{
          backgroundColor: colors.canvas,
          borderColor: colors.border,
        }}
      >
        {body}
      </View>
    );
  }

  return (
    <Card elevated className="gap-lg">
      {body}
    </Card>
  );
}
