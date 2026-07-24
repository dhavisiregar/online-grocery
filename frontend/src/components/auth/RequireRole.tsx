"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/types";

export function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || !roles.includes(user.role)) router.replace("/");
  }, [loading, user, roles, router]);

  if (loading || !user || !roles.includes(user.role)) {
    return <div className="px-4 py-16 text-center text-sm text-foreground/60">Memuat…</div>;
  }

  return <>{children}</>;
}
