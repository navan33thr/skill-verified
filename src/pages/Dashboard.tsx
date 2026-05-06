import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Award, Share2, Copy, Check, ExternalLink, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { CertificateCard } from "@/components/CertificateCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCertStatus } from "@/lib/certificate";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

type Cert = {
  id: string;
  certificate_code: string;
  skill_name: string;
  issuer_name: string;
  recipient_name: string;
  issue_date: string;
  expiration_date: string | null;
  revoked: boolean;
  description: string | null;
};

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareCert, setShareCert] = useState<Cert | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("certificates")
        .select("*")
        .ilike("recipient_email", user.email!)
        .order("issue_date", { ascending: false });
      setCerts((data ?? []) as Cert[]);
      setLoading(false);
    })();
  }, [user]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const valid = certs.filter((c) => getCertStatus(c) === "valid").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Certificates</h1>
            <p className="mt-1 text-muted-foreground">Your verified credentials, all in one place.</p>
          </div>
          <div className="flex gap-3">
            <StatCard icon={Award} label="Total" value={certs.length} />
            <StatCard icon={TrendingUp} label="Active" value={valid} accent />
          </div>
        </div>

        <div className="mt-10">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-80 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : certs.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
              <Award className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 font-medium">No certificates yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Once an issuer awards you a certificate using the email{" "}
                <span className="font-mono text-foreground">{user.email}</span>, it'll show up here.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {certs.map((c) => {
                const status = getCertStatus(c);
                return (
                  <div key={c.id} className="space-y-3 animate-fade-up">
                    <div className="flex items-center justify-between">
                      <StatusBadge status={status} size="sm" />
                      <Button size="sm" variant="ghost" onClick={() => setShareCert(c)}>
                        <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share
                      </Button>
                    </div>
                    <CertificateCard
                      recipientName={c.recipient_name}
                      skillName={c.skill_name}
                      issuerName={c.issuer_name}
                      issueDate={c.issue_date}
                      expirationDate={c.expiration_date}
                      certificateCode={c.certificate_code}
                      description={c.description}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <ShareDialog cert={shareCert} onClose={() => setShareCert(null)} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border bg-card px-5 py-3 shadow-cert ${accent ? "border-success/30" : ""}`}>
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
        <div className="text-xl font-bold leading-tight">{value}</div>
      </div>
    </div>
  );
}

function ShareDialog({ cert, onClose }: { cert: Cert | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!cert) return null;

  const url = `${window.location.origin}/verify?code=${cert.certificate_code}`;
  const linkedIn = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  function copy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={!!cert} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share your certificate</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-xl bg-muted p-4 text-center">
            <div className="font-semibold">{cert.skill_name}</div>
            <div className="font-mono text-xs text-muted-foreground">{cert.certificate_code}</div>
          </div>

          <div className="flex justify-center rounded-xl border bg-card p-5">
            <QRCodeSVG value={url} size={160} level="M" />
          </div>

          <div className="flex gap-2">
            <input readOnly value={url} className="flex-1 rounded-md border bg-background px-3 py-2 text-sm font-mono" />
            <Button size="sm" variant="secondary" onClick={copy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <Button asChild className="w-full" variant="success">
            <a href={linkedIn} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Share to LinkedIn
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
