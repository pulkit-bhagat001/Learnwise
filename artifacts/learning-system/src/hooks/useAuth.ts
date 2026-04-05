import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getMe } from "@workspace/api-client-react";
import { getToken, setToken, removeToken, isAuthenticated as checkIsAuthenticated } from "@/lib/auth";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

export function useAuth() {
  const [, setLocation] = useLocation();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => getMe(),
    enabled: checkIsAuthenticated(),
    retry: false,
  });

  const isAuthenticated = !!user;

  const login = (token: string, userData: any) => {
    setToken(token);
    queryClient.setQueryData(["/api/auth/me"], userData);
  };

  const logout = () => {
    removeToken();
    queryClient.setQueryData(["/api/auth/me"], null);
    queryClient.clear();
    setLocation("/login");
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    error,
  };
}
