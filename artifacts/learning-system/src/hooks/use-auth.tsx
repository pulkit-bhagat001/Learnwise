import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserProfile, LoginRequest, RegisterRequest } from "@workspace/api-client-react";
import { useGetMe, useLoginUser, useRegisterUser, useLogoutUser } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));

  const { data: user, isLoading: isLoadingUser } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    },
  });

  const loginMutation = useLoginUser();
  const registerMutation = useRegisterUser();
  const logoutMutation = useLogoutUser();

  const handleLogin = async (data: LoginRequest) => {
    const res = await loginMutation.mutateAsync({ data });
    localStorage.setItem("token", res.token);
    setToken(res.token);
    queryClient.setQueryData([`/api/auth/me`], res.user);
    setLocation("/");
  };

  const handleRegister = async (data: RegisterRequest) => {
    const res = await registerMutation.mutateAsync({ data });
    localStorage.setItem("token", res.token);
    setToken(res.token);
    queryClient.setQueryData([`/api/auth/me`], res.user);
    setLocation("/");
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem("token");
      setToken(null);
      queryClient.clear();
      setLocation("/login");
    }
  };

  // Check auth state on mount and redirect if invalid
  useEffect(() => {
    if (!isLoadingUser && token && !user) {
      // Token exists but user fetch failed (likely expired)
      localStorage.removeItem("token");
      setToken(null);
      queryClient.clear();
    }
  }, [user, isLoadingUser, token, queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading: isLoadingUser,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
