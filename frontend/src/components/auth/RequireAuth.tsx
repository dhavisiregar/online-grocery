"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { PageLoader } from "@/components/ui/Spinner";

// Unauthenticated (or, when requireVerified is set, unverified) users are
// redirected to the homepage rather than a login page, per spec.
export function RequireAuth({
  children,
  requireVerified = false,
}: {
  children: React.ReactNode;
  requireVerified?: boolean;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || (requireVerified && !user.is_verified)) {
      router.replace("/");
    }
  }, [loading, user, requireVerified, router]);

  if (loading || !user || (requireVerified && !user.is_verified)) {
    return <PageLoader />;
  }

  return <>{children}</>;
}
