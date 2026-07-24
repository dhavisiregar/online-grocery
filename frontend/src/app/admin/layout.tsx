"use client";

import { RequireRole } from "@/components/auth/RequireRole";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["super_admin", "store_admin"]}>
      <div className="mx-auto flex max-w-6xl flex-col md:flex-row">
        <AdminSidebar />
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </div>
    </RequireRole>
  );
}
