import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import {
  LuArrowRight,
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
  LuQuote,
  LuGithub,
  LuTwitter,
  LuLinkedin,
  LuShieldCheck,
  LuLock,
} from "react-icons/lu";
import { useTheme } from "../../theme";
import { Button, Card } from "../../components/ui";

const EASE = [0.16, 1, 0.3, 1];

const sectionTitle = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: EASE },
};

const cardReveal = (i) => ({
  initial: { opacity: 0, y: 24, scale: 0.97 },
  whileInView: { opacity: 1, y: 0, scale: 1 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5, delay: i * 0.08, ease: EASE },
});

export const fadeInUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, ease: EASE },
};

/* ─── Theme Toggle ───────────────────────────────────────────────────── */
function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme();
  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      aria-label={isDarkMode ? "Mode clair" : "Mode sombre"}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-neutral text-title hover:bg-section-alt transition-colors duration-200"
    >
      {isDarkMode
        ? <LuSun className="w-4 h-4" />
        : <LuMoon className="w-4 h-4" />}
    </motion.button>
  );
}

/* ─── NAVBAR ─────────────────────────────────────────────────────────── */
function Navbar({ onLogin, onSignup }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { isDarkMode } = useTheme();

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 40));

  const links = [
    { href: "#features", label: "Fonctionnalités" },
    { href: "#how",      label: "Comment ça marche" },
    { href: "#testimonials", label: "Témoignages" },
    { href: "#security", label: "Sécurité" },
  ];

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className={`fixed top-0 left-0 right-0 z-100 px-6 py-3.5 transition-all duration-300 ${
        scrolled || open ? "nav-scrolled" : "bg-transparent"
      } border-b ${scrolled || open ? "" : "border-transparent"}`}
    >
      <div className="max-w-[1180px] mx-auto flex items-center gap-8">
        <a href="#top" className="inline-flex items-center gap-2.5 shrink-0" aria-label="PrivyNote — accueil">
          <img
            src={isDarkMode ? "/logodark.png" : "/logolight.png"}
            alt="" aria-hidden="true"
            style={{ height: 32, width: "auto", objectFit: "contain" }}
          />
          <span className="text-[17px] font-bold text-title tracking-[-0.02em] leading-none" style={{ fontFamily: '"Syne", sans-serif' }}>
            PrivyNote
          </span>
        </a>

        <nav aria-label="Navigation principale" className="hidden md:flex items-center gap-7 ml-auto">
          {links.map((l) => (
            <a key={l.href} href={l.href}
              className="relative text-[14px] font-medium text-body hover:text-title transition-colors duration-200 pb-1
                         after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px]
                         after:bg-tech-violet after:scale-x-0 after:origin-left after:transition-transform after:duration-200
                         hover:after:scale-x-100"
            >{l.label}</a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2 ml-auto md:ml-0">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={onLogin}>Se connecter</Button>
          <Button variant="primary" size="sm" onClick={onSignup} className="btn-shimmer">Commencer</Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          className="md:hidden ml-auto w-9 h-9 inline-flex items-center justify-center rounded-md border border-neutral text-title cursor-pointer"
        >
          {open ? <LuX className="w-4 h-4" /> : <LuMenu className="w-4 h-4" />}
        </button>
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="md:hidden mt-3 pt-4 border-t border-neutral flex flex-col gap-2"
        >
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="text-[15px] font-medium text-body py-2.5 border-b border-neutral last:border-b-0"
            >{l.label}</a>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => { setOpen(false); onLogin(); }} className="flex-1">Se connecter</Button>
            <Button variant="primary" size="sm" onClick={() => { setOpen(false); onSignup(); }} className="flex-1 btn-shimmer">Commencer</Button>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}

/* ─── HERO — centered typographic layout ────────────────────────────── */
function Hero({ onSignup, onLogin }) {
  const pillItems = [
    { icon: LuScanFace,    label: "Biométrie locale" },
    { icon: LuLock,        label: "Chiffrement AES-256" },
    { icon: LuShieldCheck, label: "Zéro transmission cloud" },
  ];

  return (
    <section
      id="top"
      className="hero-radial-bg text-title relative overflow-hidden flex items-center justify-center"
      style={{ minHeight: "100svh", paddingTop: "96px", paddingBottom: "80px" }}
    >
      {/* Mesh grid */}
      <div aria-hidden="true" className="absolute inset-0 hero-mesh pointer-events-none" />

      {/* Decorative blobs */}
      <div aria-hidden="true"
        className="absolute top-1/4 left-[8%] w-72 h-72 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(122,53,242,0.09) 0%, transparent 70%)" }}
      />
      <div aria-hidden="true"
        className="absolute bottom-[15%] right-[6%] w-56 h-56 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(155,112,229,0.08) 0%, transparent 70%)" }}
      />

      <div className="relative z-1 w-full max-w-[860px] mx-auto px-6 flex flex-col items-center text-center gap-7">
        {/* Eyebrow chip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neutral bg-white/60 dark:bg-vault/40"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-tech-violet" />
          <span className="text-[12px] font-semibold tracking-[0.1em] uppercase text-muted-token">
            Reconnaissance faciale · Chiffrement local
          </span>
        </motion.div>

        {/* Headline */}
        <h1
          className="font-extrabold tracking-[-0.035em] leading-[1.06] text-[clamp(2.75rem,7vw,5.5rem)] text-title m-0 text-balance"
          style={{ fontFamily: '"Syne", sans-serif' }}
        >
          {["Vos notes, ouvertes", "d'un seul regard."].map((line, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.75, ease: EASE, delay: 0.2 + i * 0.12 }}
              className="block"
            >{line}</motion.span>
          ))}
        </h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.48 }}
          className="text-[1.125rem] leading-[1.8] text-body max-w-[560px] m-0"
        >
          Plus de mots de passe à mémoriser. PrivyNote reconnaît votre visage
          en moins d'une seconde et garde vos notes hors de portée de tout le monde — y compris de nous.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <Button variant="primary" size="lg" onClick={onSignup} className="btn-shimmer">
            Créer mon espace privé
            <LuArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="lg" onClick={onLogin}>
            Se connecter
          </Button>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.75 }}
          className="flex flex-wrap items-center justify-center gap-3 pt-2"
        >
          {pillItems.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neutral bg-white/50 dark:bg-vault/30"
            >
              <Icon className="w-3.5 h-3.5 text-tech-violet dark:text-biometric-glow shrink-0" />
              <span className="text-[13px] font-medium text-body">{label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Section Head ───────────────────────────────────────────────────── */
function SectionHead({ eyebrow, title, sub }) {
  return (
    <motion.header
      {...sectionTitle}
      className="max-w-[720px] mx-auto mb-12 text-center flex flex-col items-center gap-3"
    >
      <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-spicy-paprika">
        {eyebrow}
      </span>
      <h2
        className="text-[clamp(1.875rem,3.6vw,2.5rem)] font-bold tracking-[-0.02em] leading-[1.15] text-title m-0 text-balance"
        style={{ fontFamily: '"Syne", sans-serif' }}
      >
        {title}
      </h2>
      {sub && (
        <p className="text-[1.0625rem] leading-[1.75] text-body m-0 max-w-[560px]">
          {sub}
        </p>
      )}
    </motion.header>
  );
}

/* ─── Feature Card ───────────────────────────────────────────────────── */
function FeatureCard({ item, index }) {
  const Icon = item.icon;
  return (
    <motion.div
      {...cardReveal(index)}
      whileHover={{ y: -5, scale: 1.012, boxShadow: "0 20px 40px rgba(122,53,242,0.13)" }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="rounded-xl"
      style={{ willChange: "transform" }}
    >
      <Card className="h-full p-7 flex flex-col gap-3.5">
        <div className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-tech-violet/10 text-tech-violet dark:text-biometric-glow shrink-0">
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-title m-0">{item.title}</h3>
        <p className="text-[14.5px] leading-[1.7] text-body m-0">{item.desc}</p>
      </Card>
    </motion.div>
  );
}

/* ─── Features ───────────────────────────────────────────────────────── */
function Features() {
  const items = [
    {
      icon: LuScanFace,
      title: "Déverrouillage instantané",
      desc: "Un regard suffit. Votre identité biométrique est vérifiée localement — aucun serveur, aucun délai, aucune trace.",
    },
    {
      icon: LuFolderLock,
      title: "Dossiers privés et organisés",
      desc: "Journal, projets, idées confidentielles — chaque note à sa place, dans des espaces que vous seul pouvez ouvrir.",
    },
    {
      icon: LuWifiOff,
      title: "Fonctionne hors connexion",
      desc: "Vos notes vous appartiennent, même sans internet. Tout reste disponible sur votre appareil, tout le temps.",
    },
  ];

  return (
    <section id="features" className="bg-page py-24 px-6">
      <div className="max-w-[1180px] mx-auto">
        <SectionHead
          eyebrow="Fonctionnalités"
          title="Conçu pour écrire sans compromis"
          sub="Une interface épurée, des actions rapides, et la garantie que vos pensées ne quitteront jamais votre appareil."
        />
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((it, i) => <FeatureCard key={it.title} item={it} index={i} />)}
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ───────────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      n: "1",
      title: "Scannez votre visage",
      desc: "Un scan biométrique de quelques secondes enregistre vos traits uniques, directement et uniquement sur votre appareil.",
    },
    {
      n: "2",
      title: "Votre visage devient votre clé",
      desc: "Aucun mot de passe à créer. Votre signature faciale chiffrée remplace tous vos identifiants.",
    },
    {
      n: "3",
      title: "Écrivez en toute liberté",
      desc: "Regardez la caméra, accédez à votre espace privé instantanément, et écrivez sans contrainte.",
    },
  ];

  return (
    <section id="how" className="bg-page py-24 px-6 border-t border-neutral">
      <div className="max-w-[1180px] mx-auto">
        <SectionHead eyebrow="Comment ça marche" title="Prêt en trois étapes" />
        <ol className="grid md:grid-cols-3 gap-10 list-none m-0 p-0">
          {steps.map((s, i) => (
            <motion.li key={s.n} {...cardReveal(i)} className="relative flex flex-col gap-4 pr-4">
              <div className="w-12 h-12 rounded-full bg-tech-violet inline-flex items-center justify-center shrink-0">
                <span className="text-[1.25rem] font-bold text-zinc-50" style={{ fontFamily: '"Syne", sans-serif' }}>
                  {s.n}
                </span>
              </div>
              <h3 className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-title m-0">{s.title}</h3>
              <p className="text-[14.5px] leading-[1.7] text-body m-0">{s.desc}</p>
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="hidden md:block absolute top-6 left-[calc(48px+0.875rem)] right-3.5 h-px"
                  style={{
                    backgroundImage: "linear-gradient(to right, var(--connector-color) 0, var(--connector-color) 6px, transparent 6px, transparent 12px)",
                    backgroundSize: "12px 1px",
                    backgroundRepeat: "repeat-x",
                  }}
                />
              )}
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ─── Security ───────────────────────────────────────────────────────── */
function Security() {
  const items = [
    {
      icon: LuServerOff,
      title: "Aucun stockage distant",
      desc: "Votre empreinte faciale ne quitte jamais votre appareil. Rien n'est transmis, rien ne peut être compromis à distance.",
    },
    {
      icon: LuKeyRound,
      title: "Chiffrement AES-256",
      desc: "Vos notes sont chiffrées au repos et en transit avec la même norme utilisée par les gouvernements et les banques.",
    },
    {
      icon: LuFileCheck2,
      title: "Code source public",
      desc: "Notre code de sécurité est ouvert et auditable par tous. La confidentialité se prouve, elle ne se promet pas.",
    },
  ];

  return (
    <section id="security" className="bg-section-alt py-24 px-6">
      <div className="max-w-[1180px] mx-auto">
        <SectionHead
          eyebrow="Sécurité"
          title="Une architecture zéro-confiance, de bout en bout"
          sub="Nos serveurs ne peuvent pas lire vos notes. Nos ingénieurs non plus. C'est une garantie technique, pas une promesse marketing."
        />
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((it, i) => <FeatureCard key={it.title} item={it} index={i} />)}
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ───────────────────────────────────────────────────── */
function Testimonials() {
  const items = [
    {
      quote: "Je tenais un journal depuis des années avec des mots de passe que j'oubliais sans cesse. Avec PrivyNote, un regard suffit. C'est devenu un réflexe.",
      author: "Camille D.",
      role: "Journaliste indépendante",
    },
    {
      quote: "Le déverrouillage par le visage est d'une fluidité déconcertante. Mes notes confidentielles client sont enfin vraiment en sécurité.",
      author: "Mehdi T.",
      role: "Consultant en stratégie",
    },
    {
      quote: "Architecture propre, code auditable, biométrie 100% locale. Tout ce qu'on attend d'un produit qui prend la vie privée au sérieux.",
      author: "Léa B.",
      role: "Responsable sécurité",
    },
  ];

  return (
    <section id="testimonials" className="bg-page py-24 px-6 border-t border-neutral">
      <div className="max-w-[1180px] mx-auto">
        <SectionHead eyebrow="Témoignages" title="Ceux qui écrivent sans se retourner" />
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((t, i) => (
            <motion.figure
              key={t.author}
              {...cardReveal(i)}
              whileHover={{ y: -5, scale: 1.012, boxShadow: "0 20px 40px rgba(122,53,242,0.13)" }}
              className="m-0 rounded-xl"
              style={{ willChange: "transform" }}
            >
              <Card className="h-full p-7 flex flex-col gap-4 relative">
                <LuQuote aria-hidden="true" className="w-12 h-12 absolute top-5 right-5 text-tech-violet/12 dark:text-biometric-glow/15" />
                <blockquote className="text-[15px] leading-[1.75] text-title m-0 font-normal relative z-1">
                  {t.quote}
                </blockquote>
                <figcaption className="flex flex-col gap-0.5 pt-3 border-t border-neutral mt-auto">
                  <span className="text-[14px] font-semibold text-title">{t.author}</span>
                  <span className="text-[13px] text-muted-token">{t.role}</span>
                </figcaption>
              </Card>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Final CTA ──────────────────────────────────────────────────────── */
function FinalCTA({ onSignup }) {
  return (
    <section className="px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: EASE }}
        className="final-cta-radial-bg max-w-[800px] mx-auto rounded-2xl px-8 py-16 md:px-14 md:py-20 text-center flex flex-col items-center gap-5"
      >
        <motion.h2
          initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: EASE }}
          className="text-[clamp(1.875rem,4.2vw,2.75rem)] font-extrabold tracking-[-0.025em] leading-[1.12] m-0 text-balance text-zinc-50"
          style={{ fontFamily: '"Syne", sans-serif' }}
        >
          Vos notes méritent mieux qu'un mot de passe.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
          className="text-[1.0625rem] leading-[1.75] m-0 max-w-[480px] text-zinc-50/75"
        >
          Créez votre espace privé en moins de 30 secondes.
          Votre visage est la seule clé dont vous aurez jamais besoin.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
          className="mt-1"
        >
          <Button variant="primary" size="lg" onClick={onSignup} className="btn-shimmer">
            Créer mon espace privé
            <LuArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>

        <ul className="flex flex-wrap items-center justify-center gap-5 text-zinc-50/60 text-[13px] list-none m-0 p-0">
          {["Gratuit pour commencer", "Open-source", "RGPD natif"].map((item) => (
            <li key={item} className="inline-flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-biometric-glow shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────── */
function FooterSocial({ href, label, children }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="w-9 h-9 inline-flex items-center justify-center rounded-md border border-neutral text-body hover:text-tech-violet dark:hover:text-biometric-glow hover:border-tech-violet dark:hover:border-biometric-glow transition-all duration-200"
    >
      {React.cloneElement(children, { className: "w-4 h-4" })}
    </a>
  );
}

function Footer() {
  const { isDarkMode } = useTheme();

  const cols = [
    {
      title: "Produit",
      links: [
        { label: "Fonctionnalités", href: "#features" },
        { label: "Sécurité",        href: "#security" },
        { label: "Comment ça marche", href: "#how" },
      ],
    },
    {
      title: "Légal",
      links: [
        { label: "Confidentialité", href: "#" },
        { label: "Conditions d'utilisation", href: "#" },
      ],
    },
  ];

  return (
    <footer className="bg-vault border-t border-neutral px-6 pt-14 pb-7">
      <div className="max-w-[1180px] mx-auto grid sm:grid-cols-[1fr_auto_auto] gap-10 pb-10 border-b border-neutral items-start">
        {/* Brand */}
        <div className="flex flex-col gap-3 max-w-[260px]">
          <a href="#top" className="inline-flex items-center gap-2.5" aria-label="PrivyNote — accueil">
            <img
              src={isDarkMode ? "/logodark.png" : "/logolight.png"}
              alt="" aria-hidden="true"
              style={{ height: 28, width: "auto", objectFit: "contain" }}
            />
            <span className="text-[16px] font-bold text-title tracking-[-0.02em]" style={{ fontFamily: '"Syne", sans-serif' }}>
              PrivyNote
            </span>
          </a>
          <p className="text-[14px] leading-[1.7] text-muted-token m-0">
            Vos notes, protégées par votre visage.
            Toujours locales, jamais compromises.
          </p>
        </div>

        {/* Link columns */}
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="text-[12px] uppercase tracking-[0.12em] text-title font-semibold mb-3.5 m-0">
              {c.title}
            </h4>
            <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
              {c.links.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-[14px] text-body no-underline hover:text-tech-violet dark:hover:text-biometric-glow transition-colors duration-200"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="max-w-[1180px] mx-auto pt-6 flex flex-wrap items-center justify-between gap-4">
        <span className="text-[13px] text-muted-token">
          © {new Date().getFullYear()} PrivyNote — Tous droits réservés.
        </span>
        <div aria-label="Réseaux sociaux" className="flex gap-2">
          <FooterSocial label="GitHub" href="#"><LuGithub /></FooterSocial>
          <FooterSocial label="Twitter" href="#"><LuTwitter /></FooterSocial>
          <FooterSocial label="LinkedIn" href="#"><LuLinkedin /></FooterSocial>
        </div>
      </div>
    </footer>
  );
}

/* ─── LandingPage ────────────────────────────────────────────────────── */
function LandingPage() {
  const navigate = useNavigate();
  const onSignup = () => navigate("/signup");
  const onLogin  = () => navigate("/login");

  return (
    <div>
      <Navbar onLogin={onLogin} onSignup={onSignup} />
      <main className="bg-page">
        <Hero onSignup={onSignup} onLogin={onLogin} />
        <Features />
        <HowItWorks />
        <Security />
        <Testimonials />
        <FinalCTA onSignup={onSignup} />
      </main>
      <Footer />
    </div>
  );
}

export default LandingPage;
