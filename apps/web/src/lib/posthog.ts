import { PostHog } from "posthog-node";

let posthogClient: PostHog | null = null;

export default function PostHogClient() {
  if (!posthogClient) {
    posthogClient = new PostHog(
      "phc_fkSt1fQ3v4zrEcSB1TWZMHGA5B0Q0hAB70JlZcINrMU",
      {
        host: "https://us.i.posthog.com",
      },
    );
  }
  return posthogClient;
}

export const posthog = PostHogClient();

export const isFeatureEnabled = async (
  featureFlag: string,
  userId: string,
): Promise<boolean> => {
  try {
    const isEnabled = await posthog?.isFeatureEnabled(featureFlag, userId);
    return isEnabled ?? false;
  } catch (error) {
    console.error("Error checking feature flag:", error);
    return false;
  }
};
