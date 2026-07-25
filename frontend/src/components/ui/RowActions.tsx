"use client";

import { EditIcon, TrashIcon, UserPlusIcon } from "@/components/ui/Icons";

export function EditButton({ onClick, label = "Edit" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-lg bg-brand-light p-1.5 text-brand-dark transition-colors hover:bg-brand hover:text-white"
    >
      <EditIcon />
    </button>
  );
}

export function AssignButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-lg bg-sky-100 p-1.5 text-sky-700 transition-colors hover:bg-sky-600 hover:text-white"
    >
      <UserPlusIcon />
    </button>
  );
}

export function DeleteButton({ onClick, label = "Hapus" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-lg bg-red-50 p-1.5 text-red-600 transition-colors hover:bg-red-600 hover:text-white"
    >
      <TrashIcon />
    </button>
  );
}
