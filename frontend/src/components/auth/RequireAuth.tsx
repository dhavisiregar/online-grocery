"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { PageLoader } from "@/components/ui/Spinner";

// Unauthenticated (or, when requireVerified is set, unverified) users are
// redirected to the homepage rather than a login page, per spec — unless
// redirectToLogin is set. Bouncing straight to "/" with no explanation reads
// as "this page is broken" rather than "please sign in", so pages a guest
// might reasonably land on directly (cart, wishlist) opt into sending them
// to /login instead, with ?next= so they land back here after signing in.
export function RequireAuth({
  children,
  requireVerified = false,
  redirectToLogin = false,
}: {
  children: React.ReactNode;
  requireVerified?: boolean;
  redirectToLogin?: boolean;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(redirectToLogin ? `/login?next=${encodeURIComponent(pathname)}` : "/");
      return;
    }
    if (requireVerified && !user.is_verified) {
      router.replace("/");
    }
  }, [loading, user, requireVerified, redirectToLogin, pathname, router]);

  if (loading || !user || (requireVerified && !user.is_verified)) {
    return <PageLoader />;
  }

  return <>{children}</>;
}
