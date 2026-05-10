import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { z } from "zod";
import { format } from "date-fns";
import { Loader2, Plus, Upload, Ban, Trash2, Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { generateCertificateCode, getCertStatus } from "@/lib/certificate";
import { stampFile } from "@/lib/stamp";
import { toast } from "sonner";

const issueSchema = z.object({
  recipient_name: z.string().trim().min(1).max(100),
  recipient_email: z.string().trim().email().max(255),
  skill_name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(500).optional(),
  issue_date: z.string(),
  expiration_date: z.string().optional(),
});

type Cert = {
  id: string;
  certificate_code: string;
  recipient_name: string;
  recipient_email: string;
  skill_name: string;
  issue_date: string;
  expiration_date: string | null;
  revoked: boolean;
  issuer_name: string;
  description: string | null;
};

export default function IssuerPortal() {
  const { user, isIssuer, loading: authLoading } = useAuth();
  const [certs, setCerts] = useState<Cert[]>([]);
  const [issuerName, setIssuerName] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("organization, full_name").eq("id", user.id).maybeSingle();
      setIssuerName(prof?.organization || prof?.full_name || user.email!);
      load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("certificates")
      .select("*")
      .eq("issuer_id", user.id)
      .order("created_at", { ascending: false });
    setCerts((data ?? []) as Cert[]);
  }

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isIssuer) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container max-w-md py-20 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Issuer access required</h1>
          <p className="mt-2 text-muted-foreground">
            This portal is for verified issuers only. Sign up as an issuer to issue credentials.
          </p>
          <Button className="mt-5" asChild><Link to="/dashboard">Back to dashboard</Link></Button>
        </main>
      </div>
    );
  }

  const filtered = certs.filter(
    (c) =>
      c.recipient_name.toLowerCase().includes(filter.toLowerCase()) ||
      c.skill_name.toLowerCase().includes(filter.toLowerCase()) ||
      c.certificate_code.toLowerCase().includes(filter.toLowerCase()) ||
      c.recipient_email.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Issuer Portal</h1>
          <p className="mt-1 text-muted-foreground">Issue and manage credentials as <span className="font-semibold text-foreground">{issuerName}</span>.</p>
        </div>

        <Tabs defaultValue="issue" className="mt-8">
          <TabsList>
            <TabsTrigger value="issue"><Plus className="mr-1.5 h-4 w-4" />Issue New</TabsTrigger>
            <TabsTrigger value="bulk"><Upload className="mr-1.5 h-4 w-4" />Bulk Upload</TabsTrigger>
            <TabsTrigger value="manage">Manage ({certs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="issue" className="mt-6">
            <IssueForm issuerName={issuerName} userId={user.id} onIssued={load} />
          </TabsContent>

          <TabsContent value="bulk" className="mt-6">
            <BulkUpload issuerName={issuerName} userId={user.id} onDone={load} />
          </TabsContent>

          <TabsContent value="manage" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>Issued certificates</CardTitle>
                    <CardDescription>Search, revoke, or delete previously issued credentials.</CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      placeholder="Search..."
                      className="w-64 pl-8"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CertList certs={filtered} onChanged={load} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function IssueForm({ issuerName, userId, onIssued }: { issuerName: string; userId: string; onIssued: () => void }) {
  const [loading, setLoading] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    recipient_name: "",
    recipient_email: "",
    skill_name: "",
    description: "",
    issue_date: today,
    expiration_date: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = issueSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const code = generateCertificateCode();
    const { error } = await supabase.from("certificates").insert({
      issuer_id: userId,
      issuer_name: issuerName,
      certificate_code: code,
      recipient_name: parsed.data.recipient_name,
      recipient_email: parsed.data.recipient_email.toLowerCase(),
      skill_name: parsed.data.skill_name,
      description: parsed.data.description || null,
      issue_date: parsed.data.issue_date,
      expiration_date: parsed.data.expiration_date || null,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Certificate ${code} issued`);
    setForm({ ...form, recipient_name: "", recipient_email: "", skill_name: "", description: "" });
    onIssued();
  }

  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issue New Certificate</CardTitle>
        <CardDescription>A unique 12-character ID is generated automatically.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <Label htmlFor="rn">Student name *</Label>
            <Input id="rn" value={form.recipient_name} onChange={upd("recipient_name")} required />
          </div>
          <div>
            <Label htmlFor="re">Student email *</Label>
            <Input id="re" type="email" value={form.recipient_email} onChange={upd("recipient_email")} required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="sk">Skill / course name *</Label>
            <Input id="sk" value={form.skill_name} onChange={upd("skill_name")} required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="dsc">Description (optional)</Label>
            <Textarea id="dsc" value={form.description} onChange={upd("description")} maxLength={500} rows={3} />
          </div>
          <div>
            <Label htmlFor="id">Issue date *</Label>
            <Input id="id" type="date" value={form.issue_date} onChange={upd("issue_date")} required />
          </div>
          <div>
            <Label htmlFor="ed">Expiration (optional)</Label>
            <Input id="ed" type="date" value={form.expiration_date} onChange={upd("expiration_date")} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={loading} variant="success">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Issue Certificate
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function BulkUpload({ issuerName, userId, onDone }: { issuerName: string; userId: string; onDone: () => void }) {
  const [csv, setCsv] = useState("recipient_name,recipient_email,skill_name,issue_date,expiration_date\nJane Doe,jane@example.com,Data Science Foundations,2025-10-01,2028-10-01");
  const [busy, setBusy] = useState(false);

  async function process() {
    const lines = csv.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) { toast.error("Add at least one data row"); return; }
    const headers = lines[0].split(",").map((h) => h.trim());
    const required = ["recipient_name", "recipient_email", "skill_name"];
    if (!required.every((r) => headers.includes(r))) {
      toast.error(`CSV needs columns: ${required.join(", ")}`);
      return;
    }

    const rows = lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      const o: any = {};
      headers.forEach((h, i) => (o[h] = cols[i]));
      return o;
    });

    setBusy(true);
    const inserts = rows.map((r) => ({
      issuer_id: userId,
      issuer_name: issuerName,
      certificate_code: generateCertificateCode(),
      recipient_name: r.recipient_name,
      recipient_email: (r.recipient_email || "").toLowerCase(),
      skill_name: r.skill_name,
      issue_date: r.issue_date || format(new Date(), "yyyy-MM-dd"),
      expiration_date: r.expiration_date || null,
    }));

    const { error } = await supabase.from("certificates").insert(inserts);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success(`Issued ${inserts.length} certificates`); onDone(); }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Upload (CSV)</CardTitle>
        <CardDescription>
          Required columns: <code>recipient_name, recipient_email, skill_name</code>. Optional:{" "}
          <code>issue_date, expiration_date</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={10} className="font-mono text-xs" />
        <Button onClick={process} disabled={busy} variant="success">
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Upload className="mr-2 h-4 w-4" /> Process & Issue
        </Button>
      </CardContent>
    </Card>
  );
}

function CertList({ certs, onChanged }: { certs: Cert[]; onChanged: () => void }) {
  async function revoke(id: string, current: boolean) {
    const { error } = await supabase.from("certificates").update({ revoked: !current }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(current ? "Restored" : "Revoked"); onChanged(); }
  }

  async function del(id: string) {
    if (!confirm("Permanently delete this certificate?")) return;
    const { error } = await supabase.from("certificates").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); onChanged(); }
  }

  if (certs.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">No certificates yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="py-3 pr-3">Recipient</th>
            <th className="py-3 pr-3">Skill</th>
            <th className="py-3 pr-3">Code</th>
            <th className="py-3 pr-3">Issued</th>
            <th className="py-3 pr-3">Status</th>
            <th className="py-3 pr-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {certs.map((c) => {
            const status = getCertStatus(c);
            return (
              <tr key={c.id} className="transition-smooth hover:bg-muted/40">
                <td className="py-3 pr-3">
                  <div className="font-medium">{c.recipient_name}</div>
                  <div className="text-xs text-muted-foreground">{c.recipient_email}</div>
                </td>
                <td className="py-3 pr-3">{c.skill_name}</td>
                <td className="py-3 pr-3 font-mono text-xs">{c.certificate_code}</td>
                <td className="py-3 pr-3 text-muted-foreground">{format(new Date(c.issue_date), "MMM d, yyyy")}</td>
                <td className="py-3 pr-3"><StatusBadge status={status} size="sm" /></td>
                <td className="py-3 pr-3">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => revoke(c.id, c.revoked)} title={c.revoked ? "Restore" : "Revoke"}>
                      <Ban className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => del(c.id)} title="Delete">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
