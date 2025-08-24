/**
 * Utility functions for Bearer token authentication
 */

/**
 * Get the stored Bearer token from localStorage
 */
export const getBearerToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bearer_token");
};

/**
 * Set the Bearer token in localStorage
 */
export const setBearerToken = (token: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem("bearer_token", token);
};

/**
 * Remove the Bearer token from localStorage
 */
export const removeBearerToken = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("bearer_token");
};

/**
 * Check if a Bearer token exists
 */
export const hasBearerToken = (): boolean => {
  return getBearerToken() !== null;
};

/**
 * Create authorization header with Bearer token
 */
export const createAuthHeader = (): Headers => {
  const headers = new Headers();
  const token = getBearerToken();

  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  return headers;
};
