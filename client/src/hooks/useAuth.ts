import { trpc } from "../lib/trpc.js";
import { useLocation } from "wouter";

export function useAuth() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: user, isLoading, error } = trpc.auth.me.useQuery(undefined, {
    retry: false,
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
    },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      setLocation("/");
    },
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    loginError: loginMutation.error?.message,
    loginLoading: loginMutation.isPending,
    register: registerMutation.mutateAsync,
    registerError: registerMutation.error?.message,
    registerLoading: registerMutation.isPending,
    logout: logoutMutation.mutate,
    logoutLoading: logoutMutation.isPending,
  };
}
