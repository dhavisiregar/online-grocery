import { ORDER_STATUS_LABEL, type OrderStatus } from "@/types";

const STATUS_STYLE: Record<OrderStatus, string> = {
  waiting_payment: "bg-amber-100 text-amber-800",
  waiting_confirmation: "bg-amber-100 text-amber-800",
  processing: "bg-sky-100 text-sky-800",
  shipped: "bg-indigo-100 text-indigo-800",
  confirmed: "bg-brand-light text-brand-dark",
  cancelled: "bg-red-100 text-red-700",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}
    >
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
