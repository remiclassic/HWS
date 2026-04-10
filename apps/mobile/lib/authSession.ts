import { authAnonymous } from "./api";
import { clearToken, setToken } from "./authStorage";
import { queryClient } from "./queryClient";

export async function applyAuthToken(token: string): Promise<void> {
  await setToken(token);
  queryClient.clear();
}

/** Clears credentials and provisions a fresh anonymous user (e.g. after sign out or delete account). */
export async function refreshAnonymousSession(): Promise<void> {
  await clearToken();
  const { token } = await authAnonymous();
  await setToken(token);
  queryClient.clear();
}
