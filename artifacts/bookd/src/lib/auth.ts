import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@workspace/api-client-react";
import { setAuthTokenGetter } from "@workspace/api-client-react/src/custom-fetch";

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  setAuth: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      setAuth: (user, token, refreshToken) => set({ user, token, refreshToken }),
      logout: () => set({ user: null, token: null, refreshToken: null }),
    }),
    {
      name: "bookd-auth",
    }
  )
);

// Set the global auth token getter for the API client
setAuthTokenGetter(() => {
  return useAuth.getState().token;
});
