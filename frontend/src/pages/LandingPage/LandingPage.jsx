import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import {
  LuShieldCheck,
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
  LuQuote,
  LuGithub,
  LuTwitter,
  LuLinkedin,
  LuCheck,
} from "react-icons/lu";
import { useTheme } from "../../theme";
import { Button, Card, Badge } from "../../components/ui";

/* ─── Easing premium (utilisé partout) ────────────────────────────────── */
const EASE = [0.16, 1, 0.3, 1];

/* ─── Variants réutilisables ──────────────────────────────────────────── */
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

const fromLeft = {
  initial: { opacity: 0, x: -24 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.65, ease: EASE },
};

const fromRight = {
  initial: { opacity: 0, x: 24 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.65, ease: EASE },
};

/* Backwards compat for any external import */
const fadeInUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, ease: EASE },
};

/* ───────────────────────────────────────────────────────────────────────
   Theme Toggle
   ─────────────────────────────────────────────────────────────────────── */
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
      className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-neutral text-title hover:bg-section-alt transition-colors duration-200"
    >
      {isDarkMode ? (
        <LuSun className="w-[18px] h-[18px]" />
      ) : (
        <LuMoon className="w-[18px] h-[18px]" />
      )}
    </motion.button>
  );
}

/* ───────────────────────────────────────────────────────────────────────
   Stats Counter — useInView + useSpring (stiffness 60, damping 20)
   ─────────────────────────────────────────────────────────────────────── */
function SpringCounter({ value, suffix = "", decimals = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 60, damping: 20 });
  const display = useTransform(spring, (latest) => {
    if (decimals > 0) return latest.toFixed(decimals).replace(".", ",");
    return Math.round(latest).toLocaleString("fr-FR");
  });

  useEffect(() => {
    if (inView) motionValue.set(value);
  }, [inView, value, motionValue]);

  return (
    <span ref={ref}>
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  );
}

/* ───────────────────────────────────────────────────────────────────────
   NAVBAR — useScroll + scroll-aware (>40 → blur + bg)
   ─────────────────────────────────────────────────────────────────────── */
function Navbar({ onLogin, onSignup }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { isDarkMode } = useTheme();

  useMotionValueEvent(scrollY, "change", (v) => {
    setScrolled(v > 40);
  });

  const links = [
    { href: "#features", label: "Fonctionnalités" },
    { href: "#how", label: "Comment ça marche" },
    { href: "#testimonials", label: "Témoignages" },
    { href: "#security", label: "Sécurité" },
  ];

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className={`fixed top-0 left-0 right-0 z-100 px-6 py-4 transition-all duration-300 ${
        scrolled || open ? "nav-scrolled" : "bg-transparent"
      } border-b ${scrolled || open ? "" : "border-transparent"}`}
    >
      <div className="max-w-[1180px] mx-auto flex items-center gap-8">
        <a
          href="#top"
          className="inline-flex items-center"
          aria-label="PrivyNote — accueil"
        >
          <img
            src={isDarkMode ? '/logodark.png' : '/logolight.png'}
            alt="PrivyNote"
            style={{ height: 36, width: 'auto', objectFit: 'contain', maxWidth: 160 }}
          />
        </a>

        {/* Desktop menu */}
        <nav
          aria-label="Navigation principale"
          className="hidden md:flex items-center gap-7 ml-auto"
        >
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative text-[15px] font-medium text-body hover:text-title transition-colors duration-200 pb-1
                         after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px]
                         after:bg-tech-violet after:scale-x-0 after:origin-left after:transition-transform after:duration-200
                         hover:after:scale-x-100"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2.5 ml-auto md:ml-0">
          <ThemeToggle />
          <button
            type="button"
            onClick={onLogin}
            className="text-[15px] font-medium text-body hover:text-title hover:bg-section-alt px-3.5 py-2 rounded-md transition-colors duration-200 cursor-pointer"
          >
            Se connecter
          </button>
          <Button variant="primary" size="sm" onClick={onSignup} className="btn-shimmer">
            Commencer
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          className="md:hidden ml-auto w-10 h-10 inline-flex items-center justify-center rounded-md border border-neutral text-title cursor-pointer"
        >
          {open ? <LuX /> : <LuMenu />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="md:hidden mt-4 pt-4 border-t border-neutral flex flex-col gap-2"
        >
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-base font-medium text-body py-2.5 border-b divider-neutral border-b-1 last:border-b-0"
            >
              {l.label}
            </a>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setOpen(false); onLogin(); }}
              className="flex-1"
            >
              Se connecter
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => { setOpen(false); onSignup(); }}
              className="flex-1 btn-shimmer"
            >
              Commencer
            </Button>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}

/* ───────────────────────────────────────────────────────────────────────
   HERO — relief, mesh, headline blur reveal, floating mockup
   ─────────────────────────────────────────────────────────────────────── */
function HeroHeadline() {
  // "Vos notes. Verrouillées par votre visage." — split en 2 lignes
  // Chaque ligne révélée avec stagger 0.08s et blur(8px) → blur(0)
  const lines = [
    "Vos notes.",
    "Verrouillées par votre visage.",
  ];

  return (
    <h1 className="font-extrabold tracking-[-0.03em] leading-[1.1] text-[clamp(2.25rem,5.5vw,4rem)] text-title m-0 text-balance">
      {lines.map((line, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: EASE, delay: i * 0.08 }}
          className="block"
        >
          {line}
        </motion.span>
      ))}
    </h1>
  );
}

function Hero({ onSignup, onLogin }) {
  const e = (delay = 0) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: EASE, delay },
  });

  return (
    <section
      id="top"
      className="hero-radial-bg text-title pt-36 pb-24 px-6 min-h-screen flex items-center relative overflow-hidden"
    >
      {/* Mesh grid en arrière-plan */}
      <div
        aria-hidden="true"
        className="absolute inset-0 hero-mesh pointer-events-none"
      />

      <div className="relative z-1 w-full max-w-[1180px] mx-auto grid lg:grid-cols-[1.1fr_1fr] gap-16 items-center">
        {/* Copy */}
        <div className="flex flex-col gap-6 max-w-[580px]">
          <motion.div {...e(0)} className="self-start">
            <Badge variant="yellow">
              <LuShieldCheck className="w-[14px] h-[14px]" />
              Certifié ISO 27001
            </Badge>
          </motion.div>

          <HeroHeadline />

          <motion.p
            {...e(0.4)}
            className="text-[1.125rem] leading-[1.75] text-body max-w-[520px] m-0"
          >
            Aucun mot de passe. Aucune trace. Authentification biométrique
            locale et chiffrement de bout en bout.
          </motion.p>

          <motion.div {...e(0.5)} className="flex flex-wrap gap-3.5 mt-2">
            <Button
              variant="primary"
              size="md"
              onClick={onSignup}
              className="btn-shimmer"
            >
              Commencer gratuitement
              <LuArrowRight />
            </Button>
            <Button variant="ghost" size="md" onClick={onLogin}>
              Se connecter
            </Button>
          </motion.div>
        </div>

        {/* Right side visual — simple lock + security illustration, no fake-AI mockup */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, ease: EASE, delay: 0.3 }}
          aria-hidden="true"
          className="hidden lg:flex items-center justify-end"
        >
          <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center">
            {/* Concentric rings */}
            {[1, 0.75, 0.5].map((scale, i) => (
              <div
                key={i}
                className="absolute rounded-full border border-tech-violet/20 dark:border-biometric-glow/15"
                style={{
                  width: `${scale * 100}%`,
                  height: `${scale * 100}%`,
                  animationDelay: `${i * 0.4}s`,
                }}
              />
            ))}
            {/* Centre icon */}
            <div className="relative w-24 h-24 rounded-full bg-tech-violet/10 dark:bg-biometric-glow/10 flex items-center justify-center border border-tech-violet/30 dark:border-biometric-glow/25">
              <LuScanFace className="w-12 h-12 text-tech-violet dark:text-biometric-glow" strokeWidth={1.5} />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────────────────────────
   SECTION HEAD (réutilisable, scroll reveal premium)
   ─────────────────────────────────────────────────────────────────────── */
function SectionHead({ eyebrow, title, sub }) {
  return (
    <motion.header
      {...sectionTitle}
      className="max-w-[720px] mx-auto mb-12 text-center flex flex-col items-center gap-3"
    >
      <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-spicy-paprika">
        {eyebrow}
      </span>
      <h2 className="text-[clamp(1.875rem,3.6vw,2.5rem)] font-bold tracking-[-0.02em] leading-[1.15] text-title m-0 text-balance">
        {title}
      </h2>
      {sub && (
        <p className="text-[1.0625rem] leading-[1.75] text-body m-0 max-w-[580px]">
          {sub}
        </p>
      )}
    </motion.header>
  );
}

/* ───────────────────────────────────────────────────────────────────────
   SOCIAL PROOF — counters spring
   ─────────────────────────────────────────────────────────────────────── */
function SocialProof() {
  const stats = [
    { value: 50000, suffix: "+", label: "Utilisateurs actifs" },
    { value: 99.9, suffix: " %", decimals: 1, label: "Disponibilité" },
    { value: 0.4, suffix: "s", decimals: 1, label: "Déverrouillage" },
    { value: 100, suffix: " %", label: "Données locales" },
  ];

  const logos = ["NORDLINE", "AXIOM", "ATLAS", "KODA", "VERTEX"];

  return (
    <section className="bg-section-alt py-20 px-6">
      <div className="max-w-[1180px] mx-auto flex flex-col items-center gap-10">
        <motion.p
          {...sectionTitle}
          className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-token m-0"
        >
          Adopté par des équipes qui prennent la confidentialité au sérieux
        </motion.p>

        <motion.div
          {...sectionTitle}
          transition={{ ...sectionTitle.transition, delay: 0.08 }}
          className="flex flex-wrap justify-center gap-x-12 gap-y-10"
        >
          {logos.map((l) => (
            <span
              key={l}
              className="text-[17px] font-bold tracking-[0.18em] uppercase text-title opacity-35"
            >
              {l}
            </span>
          ))}
        </motion.div>

        <motion.div
          {...sectionTitle}
          transition={{ ...sectionTitle.transition, delay: 0.16 }}
          className="w-full grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-neutral"
        >
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-1.5 text-center">
              <span className="text-[clamp(1.75rem,3vw,2.25rem)] font-bold tracking-[-0.02em] text-tech-violet dark:text-biometric-glow tabular-nums">
                <SpringCounter
                  value={s.value}
                  suffix={s.suffix}
                  decimals={s.decimals || 0}
                />
              </span>
              <span className="text-[15px] font-medium text-muted-token">
                {s.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────────────────────────
   FEATURE CARD — relief premium, hover translateY + scale + shadow
   ─────────────────────────────────────────────────────────────────────── */
function FeatureCard({ item, index }) {
  const Icon = item.icon;
  return (
    <motion.div
      {...cardReveal(index)}
      whileHover={{
        y: -6,
        scale: 1.015,
        boxShadow: "0 24px 48px rgba(122, 53, 242, 0.18)",
      }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-xl group"
      style={{ willChange: "transform" }}
    >
      <Card className="h-full p-7 flex flex-col gap-3.5 transition-colors duration-200">
        <motion.span
          whileHover={{ scale: 1.15, rotate: 4 }}
          transition={{ duration: 0.2 }}
          className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-tech-violet/12 text-tech-violet dark:text-biometric-glow group-hover:text-biometric-glow transition-colors duration-200"
        >
          <Icon className="w-[18px] h-[18px]" />
        </motion.span>
        <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-title m-0">
          {item.title}
        </h3>
        <p className="text-[15px] leading-[1.7] text-body m-0">{item.desc}</p>
      </Card>
    </motion.div>
  );
}

/* ───────────────────────────────────────────────────────────────────────
   FEATURES
   ─────────────────────────────────────────────────────────────────────── */
function Features() {
  const items = [
    {
      icon: LuScanFace,
      title: "Reconnaissance faciale en 0,4s",
      desc: "Un regard suffit. Notre moteur biométrique vérifie vos traits localement et déverrouille votre espace en moins d'une demi-seconde.",
    },
    {
      icon: LuFolderLock,
      title: "Dossiers privés organisés",
      desc: "Journal, projets, secrets — chaque pensée à sa place, dans des dossiers protégés que vous seul pouvez ouvrir.",
    },
    {
      icon: LuWifiOff,
      title: "Mode hors-ligne intégral",
      desc: "Écrivez où que vous soyez. Vos notes restent accessibles sans connexion et se synchronisent dès votre retour en ligne.",
    },
  ];

  return (
    <section id="features" className="bg-page py-24 px-6">
      <div className="max-w-[1180px] mx-auto">
        <SectionHead
          eyebrow="Fonctionnalités"
          title="Pensé pour écrire en confiance"
          sub="Une interface sobre, des actions rapides, et la certitude que vos mots ne quitteront jamais votre périmètre."
        />

        <div className="grid md:grid-cols-3 gap-6">
          {items.map((it, i) => (
            <FeatureCard key={it.title} item={it} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────────────────────────
   HOW IT WORKS — texte gauche / steps droite cards reveal
   ─────────────────────────────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      n: "1",
      title: "Capturez votre visage",
      desc: "Un court scan biométrique enregistre vos traits uniques, directement sur votre appareil.",
    },
    {
      n: "2",
      title: "Créez votre espace",
      desc: "Aucun mot de passe à inventer. Votre identité devient votre signature biométrique chiffrée.",
    },
    {
      n: "3",
      title: "Écrivez en sécurité",
      desc: "Regardez la caméra, déverrouillez votre espace privé, et écrivez en toute liberté.",
    },
  ];

  return (
    <section id="how" className="bg-page py-24 px-6 border-t border-neutral">
      <div className="max-w-[1180px] mx-auto">
        <SectionHead
          eyebrow="Comment ça marche"
          title="Trois étapes pour une confidentialité totale"
        />

        <ol className="grid md:grid-cols-3 gap-10 list-none m-0 p-0">
          {steps.map((s, i) => (
            <motion.li
              key={s.n}
              {...cardReveal(i)}
              className="relative flex flex-col gap-4 pr-4"
            >
              <div className="w-14 h-14 rounded-full bg-tech-violet inline-flex items-center justify-center">
                <span className="text-[1.5rem] font-bold text-zinc-50 tracking-[-0.02em]">
                  {s.n}
                </span>
              </div>
              <h3 className="text-[1.125rem] font-semibold tracking-[-0.01em] text-title m-0">
                {s.title}
              </h3>
              <p className="text-[15px] leading-[1.7] text-body m-0">
                {s.desc}
              </p>
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="hidden md:block absolute top-7 left-[calc(56px+0.875rem)] right-3.5 h-px"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, var(--connector-color) 0, var(--connector-color) 6px, transparent 6px, transparent 12px)",
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

/* ───────────────────────────────────────────────────────────────────────
   SECURITY (features dark)
   ─────────────────────────────────────────────────────────────────────── */
function Security() {
  const items = [
    {
      icon: LuServerOff,
      title: "Aucun stockage cloud",
      desc: "Votre empreinte faciale ne quitte jamais votre appareil. Rien n'est transmis, rien n'est stocké à distance.",
    },
    {
      icon: LuKeyRound,
      title: "Chiffrement AES-256",
      desc: "Vos notes sont chiffrées au repos et en transit avec une norme militaire éprouvée.",
    },
    {
      icon: LuFileCheck2,
      title: "Audit open-source",
      desc: "Le code de sécurité est public et auditable. La confidentialité ne se promet pas, elle se vérifie.",
    },
  ];

  return (
    <section id="security" className="bg-section-alt py-24 px-6">
      <div className="max-w-[1180px] mx-auto">
        <SectionHead
          eyebrow="Sécurité"
          title="Pensé pour protéger ce qui compte"
          sub="Une architecture zéro-confiance où ni nos serveurs, ni nos ingénieurs ne peuvent accéder à vos contenus."
        />

        <div className="grid md:grid-cols-3 gap-6">
          {items.map((it, i) => (
            <FeatureCard key={it.title} item={it} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────────────────────────
   TESTIMONIALS
   ─────────────────────────────────────────────────────────────────────── */
function Testimonials() {
  const items = [
    {
      quote:
        "Enfin une appli de notes où je n'ai plus à inventer un mot de passe complexe. Tout est instantané, tout reste privé.",
      author: "Camille D.",
      role: "Journaliste indépendante",
    },
    {
      quote:
        "Le déverrouillage par le visage est bluffant de fluidité. C'est devenu mon outil quotidien pour mes notes confidentielles.",
      author: "Mehdi T.",
      role: "Consultant stratégie",
    },
    {
      quote:
        "Architecture limpide, code auditable, biométrie locale. Exactement ce qu'on attend d'un produit qui respecte la vie privée.",
      author: "Léa B.",
      role: "Responsable sécurité",
    },
  ];

  return (
    <section id="testimonials" className="bg-page py-24 px-6 border-t border-neutral">
      <div className="max-w-[1180px] mx-auto">
        <SectionHead
          eyebrow="Témoignages"
          title="Adopté par celles et ceux qui écrivent au calme"
        />

        <div className="grid md:grid-cols-3 gap-6">
          {items.map((t, i) => (
            <motion.figure
              key={t.author}
              {...cardReveal(i)}
              whileHover={{
                y: -6,
                scale: 1.015,
                boxShadow: "0 24px 48px rgba(122, 53, 242, 0.18)",
              }}
              className="m-0 rounded-xl"
              style={{ willChange: "transform" }}
            >
              <Card className="h-full p-7 flex flex-col gap-4 relative">
                <LuQuote
                  aria-hidden="true"
                  className="w-14 h-14 absolute top-5 right-5 text-tech-violet/15 dark:text-biometric-glow/20"
                />
                <blockquote className="text-base leading-[1.7] text-title m-0 font-normal relative z-1">
                  {t.quote}
                </blockquote>
                <figcaption className="flex flex-col gap-0.5 pt-2 border-t border-neutral mt-auto">
                  <span className="text-[15px] font-semibold text-title">
                    {t.author}
                  </span>
                  <span className="text-sm text-muted-token">{t.role}</span>
                </figcaption>
              </Card>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────────────────────────
   FINAL CTA — relief radial central + headline blur reveal
   ─────────────────────────────────────────────────────────────────────── */
function FinalCTAHeadline() {
  return (
    <h2 className="text-[clamp(1.875rem,4.2vw,2.75rem)] font-extrabold tracking-[-0.02em] leading-[1.15] m-0 text-balance text-zinc-50">
      <motion.span
        initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: EASE }}
        className="block"
      >
        Prêt à sécuriser vos notes&nbsp;?
      </motion.span>
    </h2>
  );
}

function FinalCTA({ onSignup }) {
  return (
    <section className="px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: EASE }}
        className="final-cta-radial-bg max-w-[820px] mx-auto rounded-2xl px-8 py-16 md:px-14 md:py-20 text-center flex flex-col items-center gap-4"
      >
        <FinalCTAHeadline />

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
          className="text-[1.0625rem] leading-[1.7] m-0 max-w-[520px] text-zinc-50/80"
        >
          Créez votre espace privé en moins de 30 secondes. Votre visage est la
          seule clé dont vous aurez besoin.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
          type="button"
          onClick={onSignup}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="btn-shimmer mt-3 inline-flex items-center gap-2 px-7 h-12 rounded-lg font-semibold text-[15px] cursor-pointer
                     bg-tech-violet text-zinc-50 hover:bg-biometric-glow transition-colors duration-200"
        >
          <span className="inline-flex items-center gap-2">
            Commencer maintenant
            <LuArrowRight className="w-4 h-4" />
          </span>
        </motion.button>

        <ul className="flex flex-wrap items-center justify-center gap-5 mt-3 text-zinc-50/70 text-sm">
          <li className="inline-flex items-center gap-1.5">
            <LuCheck className="w-3.5 h-3.5 text-signal-teal" /> Sans carte bancaire
          </li>
          <li className="inline-flex items-center gap-1.5">
            <LuCheck className="w-3.5 h-3.5 text-signal-teal" /> Open-source
          </li>
          <li className="inline-flex items-center gap-1.5">
            <LuCheck className="w-3.5 h-3.5" /> RGPD natif
          </li>
        </ul>
      </motion.div>
    </section>
  );
}

/* ───────────────────────────────────────────────────────────────────────
   FOOTER — toujours vault-bg-dark, structure inchangée
   ─────────────────────────────────────────────────────────────────────── */
function Footer() {
  const { isDarkMode } = useTheme();
  const cols = [
    { title: "Produit",     links: ["Fonctionnalités", "Sécurité", "Tarifs", "Nouveautés"] },
    { title: "Ressources",  links: ["Documentation", "API", "Statut", "Changelog"] },
    { title: "Entreprise",  links: ["À propos", "Carrières", "Presse", "Contact"] },
    { title: "Légal",       links: ["Confidentialité", "Conditions", "Cookies", "Licences"] },
  ];

  return (
    <footer className="bg-vault border-t border-neutral px-6 pt-16 pb-7">
      <div className="max-w-[1180px] mx-auto grid lg:grid-cols-[1.2fr_3fr] gap-12 pb-12 border-b border-neutral">
        <div className="flex flex-col gap-3 max-w-[300px]">
          <a href="#top" className="inline-flex items-center" aria-label="PrivyNote">
            <img src="/logo.png" alt="PrivyNote" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          </a>
          <p className="text-[15px] leading-[1.65] text-muted-token m-0">
            Vos notes. Verrouillées par votre visage.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-[13px] uppercase tracking-[0.12em] text-title font-semibold mb-3.5 m-0">
                {c.title}
              </h4>
              <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
                {c.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-[15px] text-body no-underline hover:text-tech-violet dark:hover:text-biometric-glow transition-colors duration-200"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-[1180px] mx-auto pt-7 flex flex-wrap items-center justify-between gap-4">
        <span className="text-sm text-muted-token">
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

/* ───────────────────────────────────────────────────────────────────────
   LandingPage
   ─────────────────────────────────────────────────────────────────────── */
function LandingPage() {
  const navigate = useNavigate();
  const onSignup = () => navigate("/signup");
  const onLogin = () => navigate("/login");

  return (
    <div>
      <Navbar onLogin={onLogin} onSignup={onSignup} />
      <main className="bg-page">
        <Hero onSignup={onSignup} onLogin={onLogin} />
        <SocialProof />
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
export { fadeInUp };
