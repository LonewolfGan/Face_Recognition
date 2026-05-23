import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import {
  LuArrowRight,
  LuLock,
  LuScanFace,
  LuSun,
  LuMoon,
  LuMenu,
  LuX,
  LuFolderLock,
  LuWifiOff,
  LuServerOff,
  LuKeyRound,
  LuFileCheck2,
  LuGithub,
  LuTwitter,
  LuLinkedin,
  LuCheck,
  LuShieldCheck,
} from "react-icons/lu";
import { useTheme } from "../../theme";
import { Button, Card } from "../../components/ui";

const EASE = [0.16, 1, 0.3, 1];

/* ─── Animation helpers ─────────────────────────────────────────────── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, ease: EASE, delay },
});

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: EASE, delay },
});

const cardAnim = (i) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.45, delay: i * 0.07, ease: EASE },
});

/* ─── ThemeToggle ───────────────────────────────────────────────────── */
function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDarkMode ? "Mode clair" : "Mode sombre"}
      className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-neutral text-title hover:bg-section-alt transition-colors duration-200 cursor-pointer"
    >
      {isDarkMode ? <LuSun className="w-4 h-4" /> : <LuMoon className="w-4 h-4" />}
    </button>
  );
}

/* ─── Navbar ────────────────────────────────────────────────────────── */
function Navbar({ onLogin, onSignup }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { isDarkMode } = useTheme();

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 40));

  const links = [
    { href: "#features", label: "Fonctionnalités" },
    { href: "#how", label: "Comment ça marche" },
    { href: "#security", label: "Sécurité" },
  ];

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className={`fixed top-0 left-0 right-0 z-50 px-6 py-3.5 transition-all duration-300 border-b ${
        scrolled || open ? "nav-scrolled border-neutral" : "bg-transparent border-transparent"
      }`}
    >
      <div className="max-w-[1140px] mx-auto flex items-center gap-8">
        {/* Logo */}
        <a href="#top" className="inline-flex items-center shrink-0" aria-label="PrivyNote">
          <img
            src={isDarkMode ? "/logodark.png" : "/logolight.png"}
            alt="PrivyNote"
            style={{ height: 32, width: "auto", objectFit: "contain", maxWidth: 148 }}
          />
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 ml-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[14px] font-medium text-body hover:text-title transition-colors duration-200"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2 ml-auto">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={onLogin}>
            Se connecter
          </Button>
          <Button variant="primary" size="sm" onClick={onSignup} className="btn-shimmer">
            Commencer
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fermer" : "Menu"}
          className="md:hidden ml-auto w-9 h-9 inline-flex items-center justify-center rounded-lg border border-neutral text-title cursor-pointer"
        >
          {open ? <LuX className="w-4 h-4" /> : <LuMenu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="md:hidden mt-3 pt-3 border-t border-neutral flex flex-col gap-1"
          >
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-[15px] font-medium text-body py-2.5 border-b border-neutral last:border-0"
              >
                {l.label}
              </a>
            ))}
            <div className="flex items-center gap-2 pt-3">
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={() => { setOpen(false); onLogin(); }} className="flex-1">
                Se connecter
              </Button>
              <Button variant="primary" size="sm" onClick={() => { setOpen(false); onSignup(); }} className="flex-1 btn-shimmer">
                Commencer
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

/* ─── Hero face-scan card (right visual) ───────────────────────────── */
function FaceScanCard() {
  return (
    <Card className="p-6 flex flex-col gap-5 w-full max-w-[300px]">
      {/* Camera frame */}
      <div className="relative w-full aspect-square rounded-xl bg-section-alt flex items-center justify-center border border-neutral overflow-hidden">
        {/* Corner scan brackets */}
        {[
          "top-3 left-3 border-t-2 border-l-2 rounded-tl",
          "top-3 right-3 border-t-2 border-r-2 rounded-tr",
          "bottom-3 left-3 border-b-2 border-l-2 rounded-bl",
          "bottom-3 right-3 border-b-2 border-r-2 rounded-br",
        ].map((cls, i) => (
          <span
            key={i}
            className={`absolute w-5 h-5 border-tech-violet/50 dark:border-biometric-glow/60 ${cls}`}
          />
        ))}
        <LuScanFace
          className="w-20 h-20 text-tech-violet/25 dark:text-biometric-glow/30"
          strokeWidth={1}
        />
      </div>

      {/* Capture dots */}
      <div className="flex justify-center gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.span
            key={i}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.8 + i * 0.12, duration: 0.3, ease: EASE }}
            className="w-2.5 h-2.5 rounded-full bg-signal-teal"
          />
        ))}
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 justify-center">
        <span className="w-2 h-2 rounded-full bg-signal-teal shrink-0" />
        <span className="text-[13px] font-medium text-signal-teal">Visage reconnu</span>
      </div>
    </Card>
  );
}

/* ─── Hero ──────────────────────────────────────────────────────────── */
function Hero({ onSignup, onLogin }) {
  return (
    <section
      id="top"
      className="hero-radial-bg pt-32 pb-24 px-6 min-h-[92vh] flex items-center relative overflow-hidden"
    >
      <div aria-hidden="true" className="absolute inset-0 hero-mesh pointer-events-none" />

      <div className="relative z-1 w-full max-w-[1140px] mx-auto grid lg:grid-cols-[1fr_auto] gap-16 items-center">
        {/* Copy */}
        <div className="flex flex-col gap-7 max-w-[600px]">
          <motion.h1
            className="font-extrabold tracking-[-0.03em] leading-[1.08] text-[clamp(2.4rem,5.5vw,3.75rem)] text-title m-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {["Vos notes.", "Verrouillées par votre visage."].map((line, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: EASE, delay: i * 0.1 }}
                className="block"
              >
                {line}
              </motion.span>
            ))}
          </motion.h1>

          <motion.p
            {...fadeIn(0.35)}
            className="text-[1.0625rem] leading-[1.72] text-body m-0 max-w-[480px]"
          >
            Aucun mot de passe. Authentification biométrique locale, chiffrement de bout en bout.
          </motion.p>

          <motion.div {...fadeIn(0.45)} className="flex flex-wrap gap-3">
            <Button variant="primary" size="md" onClick={onSignup} className="btn-shimmer">
              Commencer gratuitement
              <LuArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="md" onClick={onLogin}>
              Se connecter
            </Button>
          </motion.div>
        </div>

        {/* Right: face scan card */}
        <motion.div
          {...fadeIn(0.5)}
          className="hidden lg:flex items-center justify-end"
        >
          <FaceScanCard />
        </motion.div>
      </div>
    </section>
  );
}

/* ─── SectionHead ───────────────────────────────────────────────────── */
function SectionHead({ eyebrow, title, sub }) {
  return (
    <motion.header
      {...fadeUp()}
      className="max-w-[680px] mx-auto mb-12 text-center flex flex-col items-center gap-2.5"
    >
      {eyebrow && (
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-tech-violet dark:text-biometric-glow">
          {eyebrow}
        </span>
      )}
      <h2 className="text-[clamp(1.75rem,3.4vw,2.375rem)] font-bold tracking-[-0.02em] leading-[1.18] text-title m-0">
        {title}
      </h2>
      {sub && (
        <p className="text-[1rem] leading-[1.72] text-body m-0 max-w-[540px]">{sub}</p>
      )}
    </motion.header>
  );
}

/* ─── FeatureCard ───────────────────────────────────────────────────── */
function FeatureCard({ icon: Icon, title, desc, index }) {
  return (
    <motion.div
      {...cardAnim(index)}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Card className="h-full p-6 flex flex-col gap-3.5">
        <span className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-tech-violet/10 dark:bg-biometric-glow/10 text-tech-violet dark:text-biometric-glow shrink-0">
          <Icon className="w-[17px] h-[17px]" />
        </span>
        <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-title m-0">{title}</h3>
        <p className="text-[14px] leading-[1.7] text-body m-0">{desc}</p>
      </Card>
    </motion.div>
  );
}

/* ─── Features ──────────────────────────────────────────────────────── */
function Features() {
  const items = [
    {
      icon: LuScanFace,
      title: "Reconnaissance faciale",
      desc: "Un regard suffit. Votre visage est votre mot de passe, traité localement sur votre appareil.",
    },
    {
      icon: LuFolderLock,
      title: "Dossiers privés",
      desc: "Journal, projets, notes sensibles — organisés en dossiers que vous seul pouvez ouvrir.",
    },
    {
      icon: LuWifiOff,
      title: "Mode hors-ligne",
      desc: "Vos notes restent accessibles sans connexion et se synchronisent à votre retour en ligne.",
    },
  ];

  return (
    <section id="features" className="bg-page py-24 px-6 border-t border-neutral">
      <div className="max-w-[1140px] mx-auto">
        <SectionHead eyebrow="Fonctionnalités" title="Pensé pour écrire en confiance" />
        <div className="grid md:grid-cols-3 gap-5">
          {items.map((it, i) => (
            <FeatureCard key={it.title} {...it} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── HowItWorks ────────────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      n: "1",
      title: "Capturez votre visage",
      desc: "Un court scan biométrique enregistre vos traits directement sur votre appareil.",
    },
    {
      n: "2",
      title: "Créez votre espace",
      desc: "Votre identité devient votre clé. Aucun mot de passe à inventer.",
    },
    {
      n: "3",
      title: "Écrivez en sécurité",
      desc: "Regardez la caméra, déverrouillez, et écrivez en toute liberté.",
    },
  ];

  return (
    <section id="how" className="bg-section-alt py-24 px-6">
      <div className="max-w-[1140px] mx-auto">
        <SectionHead eyebrow="Comment ça marche" title="Trois étapes, c'est tout" />

        <ol className="grid md:grid-cols-3 gap-8 list-none m-0 p-0">
          {steps.map((s, i) => (
            <motion.li key={s.n} {...cardAnim(i)} className="relative flex flex-col gap-4">
              <div className="w-11 h-11 rounded-full bg-tech-violet inline-flex items-center justify-center shrink-0">
                <span className="text-[1.125rem] font-bold text-zinc-50 leading-none">{s.n}</span>
              </div>
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="hidden md:block absolute top-5 left-[calc(44px+1rem)] right-4 h-px"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, var(--connector-color) 0,var(--connector-color) 6px,transparent 6px,transparent 12px)",
                    backgroundSize: "12px 1px",
                    backgroundRepeat: "repeat-x",
                  }}
                />
              )}
              <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-title m-0">{s.title}</h3>
              <p className="text-[14px] leading-[1.7] text-body m-0">{s.desc}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ─── Security ──────────────────────────────────────────────────────── */
function Security() {
  const items = [
    {
      icon: LuServerOff,
      title: "Aucun stockage cloud",
      desc: "Votre empreinte faciale ne quitte jamais votre appareil. Rien n'est transmis à distance.",
    },
    {
      icon: LuKeyRound,
      title: "Chiffrement AES-256",
      desc: "Notes chiffrées au repos et en transit avec une norme militaire éprouvée.",
    },
    {
      icon: LuFileCheck2,
      title: "Code open-source",
      desc: "Le code de sécurité est public et auditable. La confidentialité se vérifie.",
    },
  ];

  return (
    <section id="security" className="bg-page py-24 px-6 border-t border-neutral">
      <div className="max-w-[1140px] mx-auto">
        <SectionHead
          eyebrow="Sécurité"
          title="Architecture zéro-confiance"
          sub="Ni nos serveurs, ni nos ingénieurs ne peuvent accéder à vos contenus."
        />
        <div className="grid md:grid-cols-3 gap-5">
          {items.map((it, i) => (
            <FeatureCard key={it.title} {...it} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FinalCTA ──────────────────────────────────────────────────────── */
function FinalCTA({ onSignup }) {
  return (
    <section className="px-6 py-24 bg-section-alt border-t border-neutral">
      <motion.div
        {...fadeUp()}
        className="final-cta-radial-bg max-w-[760px] mx-auto rounded-2xl px-8 py-16 md:px-14 md:py-20 text-center flex flex-col items-center gap-5"
      >
        <h2 className="text-[clamp(1.75rem,4vw,2.625rem)] font-extrabold tracking-[-0.02em] leading-[1.15] m-0 text-zinc-50">
          Prêt à sécuriser vos notes&nbsp;?
        </h2>

        <p className="text-[1rem] leading-[1.7] m-0 text-zinc-50/75 max-w-[420px]">
          Créez votre espace privé en 30 secondes. Votre visage est la seule clé dont vous avez besoin.
        </p>

        <Button
          variant="primary"
          size="md"
          onClick={onSignup}
          className="btn-shimmer mt-2 !bg-zinc-50 !text-vault !border-zinc-50 hover:!bg-zinc-50/90"
        >
          Commencer maintenant
          <LuArrowRight className="w-4 h-4" />
        </Button>

        <div className="flex flex-wrap items-center justify-center gap-5 mt-1 text-zinc-50/60 text-[13px]">
          <span className="inline-flex items-center gap-1.5">
            <LuCheck className="w-3.5 h-3.5 text-signal-teal" /> Gratuit
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LuCheck className="w-3.5 h-3.5 text-signal-teal" /> Open-source
          </span>
          <span className="inline-flex items-center gap-1.5">
            <LuShieldCheck className="w-3.5 h-3.5 text-signal-teal" /> RGPD natif
          </span>
        </div>
      </motion.div>
    </section>
  );
}

/* ─── Footer ────────────────────────────────────────────────────────── */
function FooterLink({ href = "#", children }) {
  return (
    <a
      href={href}
      className="text-[14px] text-body no-underline hover:text-title transition-colors duration-150"
    >
      {children}
    </a>
  );
}

function FooterSocial({ href, label, children }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-neutral text-body hover:text-title hover:border-neutral/80 transition-colors duration-150"
    >
      {React.cloneElement(children, { className: "w-3.5 h-3.5" })}
    </a>
  );
}

function Footer() {
  const { isDarkMode } = useTheme();
  const cols = [
    { title: "Produit",    links: ["Fonctionnalités", "Sécurité", "Nouveautés"] },
    { title: "Ressources", links: ["Documentation", "API", "Statut"] },
    { title: "Légal",      links: ["Confidentialité", "Conditions", "Licences"] },
  ];

  return (
    <footer className="bg-vault border-t border-neutral px-6 pt-14 pb-6">
      <div className="max-w-[1140px] mx-auto grid lg:grid-cols-[1.2fr_2fr] gap-10 pb-10 border-b border-neutral">
        {/* Brand */}
        <div className="flex flex-col gap-3 max-w-[260px]">
          <a href="#top" className="inline-flex items-center" aria-label="PrivyNote">
            <img
              src={isDarkMode ? "/logodark.png" : "/logolight.png"}
              alt="PrivyNote"
              style={{ height: 28, width: "auto", objectFit: "contain", maxWidth: 130 }}
            />
          </a>
          <p className="text-[14px] leading-[1.65] text-body m-0">
            Vos notes. Verrouillées par votre visage.
          </p>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-[12px] uppercase tracking-[0.12em] text-title font-semibold mb-3 m-0">
                {c.title}
              </h4>
              <ul className="list-none m-0 p-0 flex flex-col gap-2">
                {c.links.map((l) => (
                  <li key={l}>
                    <FooterLink>{l}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-[1140px] mx-auto pt-6 flex flex-wrap items-center justify-between gap-4">
        <span className="text-[13px] text-muted-token">
          © {new Date().getFullYear()} PrivyNote
        </span>
        <div className="flex gap-1.5">
          <FooterSocial label="GitHub" href="#"><LuGithub /></FooterSocial>
          <FooterSocial label="Twitter" href="#"><LuTwitter /></FooterSocial>
          <FooterSocial label="LinkedIn" href="#"><LuLinkedin /></FooterSocial>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LandingPage
   ═══════════════════════════════════════════════════════════════════ */
function LandingPage() {
  const navigate = useNavigate();
  const onSignup = () => navigate("/signup");
  const onLogin = () => navigate("/login");

  return (
    <div>
      <Navbar onLogin={onLogin} onSignup={onSignup} />
      <main>
        <Hero onSignup={onSignup} onLogin={onLogin} />
        <Features />
        <HowItWorks />
        <Security />
        <FinalCTA onSignup={onSignup} />
      </main>
      <Footer />
    </div>
  );
}

export default LandingPage;
export { fadeUp };
