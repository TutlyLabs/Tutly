import * as SecureStore from "expo-secure-store";

const BEARER_TOKEN_KEY = "tutly.bearer-token";

export async function getStoredBearerToken() {
  return SecureStore.getItemAsync(BEARER_TOKEN_KEY);
}

export async function setStoredBearerToken(token: string) {
  await SecureStore.setItemAsync(BEARER_TOKEN_KEY, token);
}

export async function clearStoredBearerToken() {
  await SecureStore.deleteItemAsync(BEARER_TOKEN_KEY);
}

export async function storeBearerTokenFromResponse(response: Response) {
  const token = response.headers.get("set-auth-token");
  if (token) {
    await setStoredBearerToken(token);
  }
  return token;
}
