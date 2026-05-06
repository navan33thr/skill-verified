import { CheckCircle2, XCircle, AlertTriangle, HelpCircle } from "lucide-react";
import { CertStatus } from "@/lib/certificate";
import { cn } from "@/lib/utils";

const map = {
  valid: {
    label: "Valid",
    icon: CheckCircle2,
    cls: "bg-success/10 text-success border-success/30",
  },
  expired: {
    label: "Expired",
    icon: AlertTriangle,
    cls: "bg-warning/10 text-warning border-warning/30",
  },
  revoked: {
    label: "Revoked",
    icon: XCircle,
    cls: "bg-destructive/10 text-destructive border-destructive/30",
  },
  not_found: {
    label: "Not Found",
    icon: HelpCircle,
    cls: "bg-muted text-muted-foreground border-border",
  },
} as const;

export function StatusBadge({ status, size = "md" }: { status: CertStatus; size?: "sm" | "md" | "lg" }) {
  const m = map[status];
  const Icon = m.icon;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold",
        m.cls,
        size === "sm" && "px-2.5 py-0.5 text-xs",
        size === "md" && "px-3 py-1 text-sm",
        size === "lg" && "px-4 py-1.5 text-base"
      )}
    >
      <Icon className={cn(size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4")} />
      {m.label}
    </div>
  );
}
