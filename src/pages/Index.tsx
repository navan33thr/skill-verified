import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Zap, Globe2, BadgeCheck, Search, Building2, GraduationCap } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { CertificateCard } from "@/components/CertificateCard";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-success/20 blur-3xl" />
        <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-primary-glow/40 blur-3xl" />

        <div className="container relative grid gap-12 py-20 md:py-28 lg:grid-cols-2 lg:items-center">
          <div className="animate-fade-up space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Trusted by leading institutions
            </div>

            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Tamper-proof credentials,{" "}
              <span className="bg-gradient-to-r from-success to-emerald-300 bg-clip-text text-transparent">
                verifiable in seconds.
              </span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-white/75">
              Issue secure digital certificates, let learners showcase verified skills, and give
              employers instant trust — with one unique ID or QR scan.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button size="lg" variant="success" asChild>
                <Link to="/auth?mode=signup">
                  Start issuing <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" asChild>
                <Link to="/verify">
                  <Search className="mr-1 h-4 w-4" /> Verify a certificate
                </Link>
              </Button>
            </div>

            <div className="flex items-center gap-6 pt-4 text-sm text-white/60">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success" /> SHA-secured</div>
              <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-success" /> Instant verify</div>
              <div className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-success" /> Public profiles</div>
            </div>
          </div>

          <div className="animate-fade-up [animation-delay:200ms]">
            <div className="relative mx-auto max-w-md rotate-2 transition-smooth hover:rotate-0">
              <div className="absolute -inset-4 rounded-3xl bg-success/20 blur-2xl" />
              <div className="relative">
                <CertificateCard
                  recipientName="Aisha Patel"
                  skillName="Advanced React Engineering"
                  issuerName="Stellar Tech Academy"
                  issueDate="2025-09-12"
                  expirationDate="2028-09-12"
                  certificateCode="A7K9MP3XQ2RB"
                  description="Demonstrated mastery of React 18, hooks, performance optimization, and modern patterns."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-sm font-semibold uppercase tracking-widest text-success">Why Certify</div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Built for two sides of trust
          </h2>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border bg-card p-8 shadow-cert transition-smooth hover:shadow-elegant">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-bold">For Learners</h3>
            <p className="mt-2 text-muted-foreground">
              A single home for every credential you've earned. Share to LinkedIn, your portfolio, or
              employers in one click.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {["Lifetime gallery of badges & PDFs", "Public, shareable verification links", "QR codes ready for resumes"].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border bg-card p-8 shadow-cert transition-smooth hover:shadow-elegant">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-bold">For Institutions</h3>
            <p className="mt-2 text-muted-foreground">
              Issue branded credentials at scale. CSV bulk-upload, instant revocation, and unique
              hashes mean credentials you stand behind.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {["Single-click & bulk issuance", "Revoke or edit any time", "12-digit secure ID per cert"].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <div className="overflow-hidden rounded-3xl bg-gradient-hero p-10 text-center text-primary-foreground sm:p-14">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to issue your first certificate?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">
            Free to start. No setup fees. Trusted infrastructure.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button size="lg" variant="success" asChild>
              <Link to="/auth?mode=signup">Create free account</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white" asChild>
              <Link to="/verify">Try verification</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Certify © {new Date().getFullYear()}
          </div>
          <div>Tamper-proof credentials for the modern web.</div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
