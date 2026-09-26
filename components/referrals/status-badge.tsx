import { STATUS_LABEL } from "@/lib/referrals/logic";
import type { ReferralStatus } from "@/types/referral";

const style: Record<ReferralStatus, string> = {
  sent: "bg-amber-100 text-amber-900",
  acknowledged: "bg-hippo-100 text-hippo-900",
  completed: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-off-white text-charcoal",
};

export function ReferralStatusBadge({ status }: { status: ReferralStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
