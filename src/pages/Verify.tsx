import { useEffect, useRef, useState } from "react";
import { Search, ShieldCheck, ArrowLeft, Upload, FileDown, Loader2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CertificateCard } from "@/components/CertificateCard";
import { StatusBadge } from "@/components/StatusBadge";
import { CertStatus, getCertStatus } from "@/lib/certificate";
import { extractQrFromFile, codeFromQrPayload } from "@/lib/scan";
import { toast } from "sonner";

type Cert = {
  recipient_name: string;
  skill_name: string;
  issuer_name: string;
  issue_date: string;
  expiration_date: string | null;
  certificate_code: string;
  revoked: boolean;
  description: string | null;
  file_url: string | null;
  file_type: string | null;
};

export default function Verify() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("code") ?? "";
  const [code, setCode] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [searched, setSearched] = useState(false);
  const [cert, setCert] = useState<Cert | null>(null);
  const [status, setStatus] = useState<CertStatus>("not_found");
  const fileInput = useRef<HTMLInputElement>(null);

  async function lookup(c: string) {
    if (!c.trim()) return;
    setLoading(true);
    setSearched(true);
    const { data } = await supabase
      .from("certificates")
      .select("recipient_name, skill_name, issuer_name, issue_date, expiration_date, certificate_code, revoked, description, file_url, file_type")
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

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setScanning(true);
    try {
      const payload = await extractQrFromFile(f);
      if (!payload) {
        toast.error("No QR code found in this file.");
        return;
      }
      const c = codeFromQrPayload(payload);
      if (!c) {
        toast.error("QR code didn't contain a valid certificate ID.");
        return;
      }
      setCode(c);
      setParams({ code: c });
      await lookup(c);
      toast.success("QR scanned — verifying certificate.");
    } catch (err: any) {
      toast.error(`Couldn't scan file: ${err.message ?? err}`);
    } finally {
      setScanning(false);
      if (fileInput.current) fileInput.current.value = "";
    }
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
              <p className="text-sm text-muted-foreground">
                Enter the 12-digit ID, or upload a certificate file to scan its QR code.
              </p>
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
              <Search className="mr-1.5 h-4 w-4" /> Verify
            </Button>
          </form>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="mt-4">
            <input
              ref={fileInput}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={onFile}
            />
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={scanning}
              onClick={() => fileInput.current?.click()}
            >
              {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload PDF or image to verify
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              We'll read the QR code embedded by Certify and check it against our records.
            </p>
          </div>
        </div>

        {searched && (
          <div className="mt-8 animate-fade-up">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Result</h2>
              <StatusBadge status={status} size="lg" />
            </div>

            {cert ? (
              <div className="space-y-4">
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
                {cert.file_url && (
                  <Button asChild variant="outline" className="w-full">
                    <a href={cert.file_url} target="_blank" rel="noopener noreferrer">
                      <FileDown className="mr-2 h-4 w-4" />
                      View original {cert.file_type === "pdf" ? "PDF" : "image"} (watermarked)
                    </a>
                  </Button>
                )}
              </div>
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
