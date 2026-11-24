import React, { useState } from 'react';
import {
  Heart,
  Flower2,
  ChevronDown,
  Mail,
  MessageCircle,
  Linkedin,
  MessageSquareHeart,
  ShieldCheck,
  Lock,
  BookHeart,
  CalendarDays,
  Users,
  PenTool,
  Smartphone,
} from 'lucide-react';
import MalaIcon from '../components/MalaIcon';

// @ts-ignore
import versionData from '../version.json';
// @ts-ignore
import paramGuruImage from '../utils/Radhanath-Swami-Bhakti-Yoga.jpg';
// @ts-ignore
import guruImage from '../utils/Images/HGPranavanandaDas Prabhuji.jpg';

const FEEDBACK_URL =
  'https://forms.zohopublic.in/jashwanthjashu684gm1/form/SadhanaTracerFeedbackForm/formperma/KOoeajQ20c3B6YQ6Bmmy76hxc3xkOC9-BAc-Lu7GEjU';

const FEATURES = [
  { icon: MalaIcon, title: 'Japa counter', text: 'Count rounds; each full round saves by itself.' },
  { icon: PenTool, title: 'Weekly planner', text: 'Keep your daily sadhana in one place.' },
  { icon: Heart, title: 'Journal', text: 'A quiet space for your reflections.' },
  { icon: BookHeart, title: 'Mantras & kirtans', text: 'Read in English, Hindi, Telugu and more.' },
  { icon: CalendarDays, title: 'Vaishnava calendar', text: 'Festivals and Ekadashi dates.' },
  { icon: Users, title: 'Sangha', text: 'Connect with devotees, chat and ask questions.' },
];

const FAQ = [
  { q: 'Is my spiritual data private?', a: 'Yes. Your planner, journal and japa are only visible to you. Other devotees see only the profile details you choose to share in Settings.' },
  { q: 'Who can see that I am online?', a: 'Only devotees you are connected with, and only if you leave "Show last seen" on in Settings.' },
  { q: 'Can I use it on my phone like an app?', a: 'Yes. On Android choose "Install app" from the browser menu. On iPhone tap Share, then "Add to Home Screen".' },
  { q: 'How do I add a mantra or a new language?', a: 'Open Mantras and tap "Add a mantra". For a language, open any mantra\'s language list and tap "Request a language". An admin reviews each request.' },
  { q: 'Can I take my data with me?', a: 'Yes. In Settings, use the data options to download everything you have saved.' },
  { q: 'How do I share an idea or report a problem?', a: 'Use "Send feedback" from the account menu, or the button at the bottom of this page.' },
];

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section>
    <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-[0.1em] text-maroon-900/45">{title}</h2>
    {children}
  </section>
);

/** A guru card with a gentle flower offering */
const GuruCard: React.FC<{ image: string; name: string; role: string }> = ({ image, name, role }) => {
  const [offered, setOffered] = useState(false);
  const offer = () => {
    setOffered(true);
    setTimeout(() => setOffered(false), 6000);
  };
  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-3xl bg-white p-5 text-center shadow-soft ring-1 ring-sandal-200">
      {offered && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="absolute animate-float-flower text-2xl"
              style={{ left: `${(i * 7 + 5) % 95}%`, animationDelay: `${(i % 5) * 0.15}s`, animationDuration: `${2 + (i % 4) * 0.4}s` }}
            >
              {['🌸', '🌺', '🌼', '🌷'][i % 4]}
            </span>
          ))}
        </div>
      )}
      <img src={image} alt={name} className="h-28 w-28 rounded-full object-cover object-top ring-4 ring-amber-100" />
      <h3 className="mt-3 text-base font-semibold text-maroon-900">{name}</h3>
      <p className="text-sm text-maroon-900/55">{role}</p>
      <button onClick={offer} className="btn-secondary btn-sm mt-3">
        <Flower2 size={15} className="text-rose-500" /> Offer flowers
      </button>
    </div>
  );
};

const About: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-2xl animate-fadeIn space-y-8 pb-10">
      <style>{`
        @keyframes floatFlower { 0% { transform: translateY(-10%) rotate(0deg); opacity: 1 } 100% { transform: translateY(420%) rotate(540deg); opacity: 0 } }
        .animate-float-flower { animation: floatFlower linear forwards; }
      `}</style>

      {/* Intro */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 text-center ring-1 ring-amber-200/70 sm:p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-soft ring-1 ring-amber-100">
          <MalaIcon size={28} />
        </span>
        <h2 className="mt-4 font-elegant text-2xl font-semibold text-maroon-900">Sadhana Sang</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-maroon-900/65">
          A small companion for devotees: keep your daily sadhana, chant with focus, and stay close to the sangha.
        </p>
        <p className="mt-4 inline-block rounded-full bg-white px-3 py-1 text-xs font-medium text-maroon-900/55 ring-1 ring-sandal-200">
          Version {versionData.version}
        </p>
      </div>

      {/* Features */}
      <Section title="What you can do">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-sandal-200">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-brand-600 ring-1 ring-amber-100">
                <Icon size={19} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-maroon-900">{title}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-maroon-900/55">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Dedication */}
      <Section title="Offered with gratitude">
        <div className="rounded-3xl bg-white p-6 text-center shadow-soft ring-1 ring-sandal-200">
          <p className="font-elegant text-xl font-semibold text-brand-700">Om Sri Gurave Namah</p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-maroon-900/70">
            This app is placed at the lotus feet of my spiritual masters. Whatever good comes from it is their mercy; every fault is mine alone.
          </p>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <GuruCard image={paramGuruImage} name="HH Radhanath Swami" role="Param Gurumaharaj" />
          <GuruCard image={guruImage} name="HG Pranavananda Das" role="My spiritual master" />
        </div>
      </Section>

      {/* Privacy */}
      <Section title="Your privacy">
        <div className="space-y-2.5 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-sandal-200">
          {[
            { icon: Lock, text: 'Chats are private and encrypted.' },
            { icon: ShieldCheck, text: 'You decide what other devotees see — guide, temple and last seen.' },
            { icon: Smartphone, text: 'Your planner, journal and japa are visible only to you.' },
          ].map(({ icon: Icon, text }) => (
            <p key={text} className="flex items-start gap-3 text-sm text-maroon-900/75">
              <Icon size={17} className="mt-0.5 shrink-0 text-emerald-600" />
              {text}
            </p>
          ))}
          <a href="/PRIVACY_POLICY.md" className="inline-block pt-1 text-sm font-semibold text-brand-700 hover:underline">
            Read the privacy policy
          </a>
        </div>
      </Section>

      {/* FAQ */}
      <Section title="Questions">
        <div className="divide-y divide-sandal-200/70 overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-sandal-200">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left"
                  style={{ minHeight: 0 }}
                >
                  <span className="flex-1 text-[15px] font-medium text-maroon-900">{item.q}</span>
                  <ChevronDown size={18} className={`shrink-0 text-maroon-900/40 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="min-h-0 overflow-hidden">
                    <p className="px-5 pb-4 text-sm leading-relaxed text-maroon-900/65">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Contact */}
      <Section title="Get in touch">
        <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-sandal-200">
          <p className="text-sm text-maroon-900/70">
            Built by <span className="font-semibold text-maroon-900">Javili Jashwanth</span>, an aspiring servant of the Guru.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { href: 'mailto:jashwanthjavili7@gmail.com', icon: Mail, label: 'Email' },
              { href: 'https://wa.me/919160125245', icon: MessageCircle, label: 'WhatsApp' },
              { href: 'https://www.linkedin.com/in/javili-jashwanth-0936ab268/', icon: Linkedin, label: 'LinkedIn' },
            ].map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-sandal-50 py-3 text-xs font-semibold text-maroon-800 ring-1 ring-sandal-200 transition hover:bg-amber-50"
              >
                <Icon size={19} className="text-brand-600" />
                {label}
              </a>
            ))}
          </div>
          <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" className="btn-primary mt-4 w-full">
            <MessageSquareHeart size={17} /> Share your feedback
          </a>
        </div>
      </Section>

      <p className="text-center text-xs text-maroon-900/40">Hare Krishna 🙏 · Sadhana Sang v{versionData.version}</p>
    </div>
  );
};

export default About;
