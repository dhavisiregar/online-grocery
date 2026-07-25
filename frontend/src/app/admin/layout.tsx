"use client";

import { RequireRole } from "@/components/auth/RequireRole";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["super_admin", "store_admin"]}>
      <div className="mx-auto flex max-w-6xl flex-col md:flex-row md:gap-6 md:px-4 md:py-6">
        <AdminSidebar />
        <div className="min-w-0 flex-1 p-4 md:p-0">{children}</div>
      </div>
    </RequireRole>
  );
}
