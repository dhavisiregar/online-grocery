import type { UserAddress } from "@/types";

export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetPrimary,
}: {
  address: UserAddress;
  onEdit: () => void;
  onDelete: () => void;
  onSetPrimary: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-soft transition-shadow hover:shadow-soft-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{address.label}</p>
            {address.is_primary && (
              <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand-dark">
                Utama
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-foreground/70">
            {address.recipient_name} · {address.phone}
          </p>
          <p className="mt-1 text-sm text-foreground/60">
            {address.address_line}, {address.district}, {address.city}, {address.province}{" "}
            {address.postal_code}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-4 border-t border-border pt-3 text-sm">
        <button type="button" onClick={onEdit} className="font-medium text-brand-dark hover:underline">
          Edit
        </button>
        {!address.is_primary && (
          <button type="button" onClick={onSetPrimary} className="font-medium text-brand-dark hover:underline">
            Jadikan Utama
          </button>
        )}
        <button type="button" onClick={onDelete} className="font-medium text-red-600 hover:underline">
          Hapus
        </button>
      </div>
    </div>
  );
}
