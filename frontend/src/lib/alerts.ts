import Swal from "sweetalert2";

// Reads the app's live CSS custom properties so popups follow the current
// light/dark theme and brand color instead of SweetAlert2's own palette.
function themeVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function themedSwal() {
  return Swal.mixin({
    background: themeVar("--background"),
    color: themeVar("--foreground"),
    confirmButtonColor: themeVar("--brand"),
    cancelButtonColor: themeVar("--border"),
    customClass: { popup: "rounded-2xl" },
  });
}

// Shared "delete this thing?" prompt for CRUD admin pages — replaces
// window.confirm so every destructive action looks and behaves the same.
export async function confirmDelete(message: string, title = "Hapus data ini?"): Promise<boolean> {
  const result = await themedSwal().fire({
    title,
    text: message,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Hapus",
    cancelButtonText: "Batal",
    reverseButtons: true,
    focusCancel: true,
  });
  return result.isConfirmed;
}

// Replaces alert(...) for CRUD error/success feedback.
export function notifyError(message: string, title = "Gagal") {
  themedSwal().fire({ title, text: message, icon: "error", confirmButtonText: "OK" });
}

export function notifySuccess(message: string, title = "Berhasil") {
  themedSwal().fire({ title, text: message, icon: "success", confirmButtonText: "OK", timer: 2000 });
}
