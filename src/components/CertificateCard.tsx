import { ShieldCheck, Calendar, Award } from "lucide-react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { CertStatus } from "@/lib/certificate";

interface Props {
  recipientName: string;
  skillName: string;
  issuerName: string;
  issueDate: string;
  expirationDate?: string | null;
  certificateCode: string;
  status?: CertStatus;
  description?: string | null;
}

export function CertificateCard(p: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-gradient-cert shadow-cert cert-watermark">
      {/* Verified watermark overlay */}
      <div className="pointer-events-none absolute -right-8 top-8 rotate-12 select-none">
        <div className="flex items-center gap-2 rounded-full border-2 border-success/30 bg-success/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-success/60">
          <ShieldCheck className="h-3.5 w-3.5" />
          Verified
        </div>
      </div>

      <div className="border-b bg-primary p-5 text-primary-foreground">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-success/20 p-1.5">
            <Award className="h-4 w-4 text-success" />
          </div>
          <div className="text-xs font-semibold uppercase tracking-widest opacity-80">
            Certificate of Achievement
          </div>
        </div>
      </div>

      <div className="space-y-5 p-6 sm:p-8">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Awarded to</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{p.recipientName}</div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">For mastering</div>
          <div className="mt-1 text-xl font-semibold text-primary">{p.skillName}</div>
          {p.description && (
            <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 border-t pt-5">
          <div>
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
              <Calendar className="h-3 w-3" /> Issued
            </div>
            <div className="mt-1 text-sm font-medium">
              {format(new Date(p.issueDate), "MMM d, yyyy")}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Expires</div>
            <div className="mt-1 text-sm font-medium">
              {p.expirationDate ? format(new Date(p.expirationDate), "MMM d, yyyy") : "Never"}
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between border-t pt-5">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Issued by</div>
            <div className="mt-1 text-sm font-semibold">{p.issuerName}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Certificate ID</div>
            <div className="mt-1 font-mono text-sm font-bold tracking-wider text-primary">
              {p.certificateCode}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
