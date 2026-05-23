import { useRef, useState } from "react";
import { ArrowLeft, Upload, Loader2, QrCode, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { extractQrFromFile, codeFromQrPayload } from "@/lib/scan";
import { toast } from "sonner";

type Result = {
  source: "url" | "file";
  payload: string | null;
  code: string | null;
  match: { found: boolean; recipient?: string; skill?: string; revoked?: boolean } | null;
};

export default function ScanTest() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function lookupCode(code: string) {
    const { data } = await supabase.rpc("verify_certificate", { _code: code });
    const row = data && data[0];
    return row
      ? { found: true, recipient: row.recipient_name, skill: row.skill_name, revoked: row.revoked }
      : { found: false };
  }

  async function runFromUrl() {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const code = codeFromQrPayload(url.trim());
      const match = code ? await lookupCode(code) : null;
      setResult({ source: "url", payload: url.trim(), code, match });
      if (!code) toast.error("No 12-char code found in payload.");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const payload = await extractQrFromFile(f);
      if (!payload) {
        setResult({ source: "file", payload: null, code: null, match: null });
        toast.error("No QR code detected in the file.");
        return;
      }
      const code = codeFromQrPayload(payload);
      const match = code ? await lookupCode(code) : null;
      setResult({ source: "file", payload, code, match });
    } catch (err: any) {
      toast.error(`Scan failed: ${err.message ?? err}`);
    } finally {
      setBusy(false);
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">QR Scan Tester</h1>
              <p className="text-sm text-muted-foreground">
                Paste a QR payload/URL or upload a screenshot to confirm it decodes to the right certificate ID.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <label className="text-sm font-medium">Paste QR payload or verify URL</label>
            <Textarea
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-app.com/verify?code=A7K9MP3XQ2RB"
              rows={3}
              className="font-mono text-sm"
            />
            <Button onClick={runFromUrl} disabled={busy || !url.trim()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
              Decode payload
            </Button>
          </div>

          <div className="mt-6 flex items-center gap-3">
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
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload screenshot or PDF
            </Button>
          </div>
        </div>

        {result && (
          <div className="mt-8 animate-fade-up rounded-2xl border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Decode result</h2>
            <dl className="space-y-3 text-sm">
              <Row label="Source" value={result.source === "url" ? "Pasted payload" : "Uploaded file"} />
              <Row
                label="Raw payload"
                value={result.payload ?? "—"}
                mono
              />
              <Row
                label="Extracted code"
                value={result.code ?? "Not found"}
                mono
                tone={result.code ? "good" : "bad"}
              />
              <div className="border-t pt-3">
                <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Database lookup</div>
                {!result.code ? (
                  <p className="text-sm text-muted-foreground">Skipped — no code to look up.</p>
                ) : !result.match?.found ? (
                  <p className="flex items-center gap-2 text-sm text-destructive">
                    <XCircle className="h-4 w-4" /> No certificate matches <span className="font-mono">{result.code}</span>
                  </p>
                ) : (
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 text-sm text-success">
                      <CheckCircle2 className="h-4 w-4" /> Match found
                    </p>
                    <p className="text-sm"><span className="text-muted-foreground">Recipient:</span> {result.match.recipient}</p>
                    <p className="text-sm"><span className="text-muted-foreground">Skill:</span> {result.match.skill}</p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Status:</span>{" "}
                      {result.match.revoked ? <span className="text-destructive">Revoked</span> : <span className="text-success">Active</span>}
                    </p>
                  </div>
                )}
              </div>
            </dl>

            {result.code && result.match?.found && (
              <Button asChild variant="outline" className="mt-5 w-full">
                <Link to={`/verify?code=${result.code}`}>Open in Verify page</Link>
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, value, mono, tone }: { label: string; value: string; mono?: boolean; tone?: "good" | "bad" }) {
  const toneCls = tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : "";
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 break-all ${mono ? "font-mono text-xs" : ""} ${toneCls}`}>{value}</dd>
    </div>
  );
}
