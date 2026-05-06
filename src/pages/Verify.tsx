import { useEffect, useState } from "react";
import { Search, ShieldCheck, ArrowLeft } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CertificateCard } from "@/components/CertificateCard";
import { StatusBadge } from "@/components/StatusBadge";
import { CertStatus, getCertStatus } from "@/lib/certificate";

type Cert = {
  recipient_name: string;
  skill_name: string;
  issuer_name: string;
  issue_date: string;
  expiration_date: string | null;
  certificate_code: string;
  revoked: boolean;
  description: string | null;
};

export default function Verify() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("code") ?? "";
  const [code, setCode] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [cert, setCert] = useState<Cert | null>(null);
  const [status, setStatus] = useState<CertStatus>("not_found");

  async function lookup(c: string) {
    if (!c.trim()) return;
    setLoading(true);
    setSearched(true);
    const { data } = await supabase
      .from("certificates")
      .select("recipient_name, skill_name, issuer_name, issue_date, expiration_date, certificate_code, revoked, description")
      .eq("certificate_code", c.trim().toUpperCase())
      .maybeSingle();
    setCert(data);
    setStatus(getCertStatus(data));
    setLoading(false);
  }

  useEffect(() => {
    if (initial) lookup(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setParams({ code });
    lookup(code);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container max-w-3xl py-12">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Home
        </Link>

        <div className="rounded-2xl border bg-card p-8 shadow-cert">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Verify a Certificate</h1>
              <p className="text-sm text-muted-foreground">Enter the 12-digit certificate ID below.</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-6 flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. A7K9MP3XQ2RB"
              className="font-mono uppercase tracking-wider"
              maxLength={12}
            />
            <Button type="submit" disabled={loading || !code.trim()}>
              <Search className="mr-1.5 h-4 w-4" />
              Verify
            </Button>
          </form>
        </div>

        {searched && (
          <div className="mt-8 animate-fade-up">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Result</h2>
              <StatusBadge status={status} size="lg" />
            </div>

            {cert ? (
              <CertificateCard
                recipientName={cert.recipient_name}
                skillName={cert.skill_name}
                issuerName={cert.issuer_name}
                issueDate={cert.issue_date}
                expirationDate={cert.expiration_date}
                certificateCode={cert.certificate_code}
                status={status}
                description={cert.description}
              />
            ) : (
              <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Search className="h-5 w-5" />
                </div>
                <p className="mt-4 font-medium">No certificate found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Double-check the ID — it should be 12 alphanumeric characters.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
