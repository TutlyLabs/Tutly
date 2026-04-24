import Constants from "expo-constants";

const DEFAULT_TUTLY_URL = "https://learn.tutly.in";

const configuredApiUrl =
  process.env.EXPO_PUBLIC_TUTLY_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string | undefined);
const configuredWebUrl =
  process.env.EXPO_PUBLIC_TUTLY_WEB_URL ||
  (Constants.expoConfig?.extra?.webUrl as string | undefined);

const defaultApiUrl = configuredApiUrl || DEFAULT_TUTLY_URL;
const defaultWebUrl = configuredWebUrl || configuredApiUrl || DEFAULT_TUTLY_URL;

export const env = {
  apiUrl: defaultApiUrl,
  webUrl: defaultWebUrl,
  scheme: Constants.expoConfig?.scheme?.toString() || "tutly",
};
