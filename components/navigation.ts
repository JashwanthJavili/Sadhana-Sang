import {
  Home,
  PenTool,
  BarChart3,
  History,
  Settings,
  Info,
  Heart,
  Users,
  MessageCircle,
  MessagesSquare,
  Shield,
  BookHeart,
  CalendarDays,
  UserPlus,
} from 'lucide-react';
import type React from 'react';
import MalaIcon from './MalaIcon';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NavIcon = React.ComponentType<any>;

export const ADMIN_EMAIL = 'jashwanthjavili7@gmail.com';

export interface NavItem {
  to: string;
  label: string;
  description: string;
  icon: NavIcon;
  /** Tailwind classes for the coloured icon tile (search palette, dashboard) */
  tone: string;
  guestAllowed: boolean;
  adminOnly?: boolean;
  /** Reachable via search / links but not listed in the sidebar */
  hidden?: boolean;
}

export interface NavGroup {
  /** Empty title = no section heading (e.g. the pinned Home link) */
  title: string;
  items: NavItem[];
}

/**
 * Sidebar structure — modules grouped by what the devotee is doing:
 *   Sadhana  → daily practice
 *   Progress → looking back at that practice
 *   Library  → learning resources
 *   Sangha   → people & conversations
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: '',
    items: [
      { to: '/', label: 'Home', description: 'Your daily overview', icon: Home, tone: 'bg-brand-50 text-brand-600', guestAllowed: true, hidden: true },
    ],
  },
  {
    title: 'Sadhana',
    items: [
      { to: '/planner', label: 'Weekly Planner', description: 'Your sadhana card for the week', icon: PenTool, tone: 'bg-amber-50 text-amber-600', guestAllowed: true },
      { to: '/chanting', label: 'Japa Counter', description: 'Count your rounds', icon: MalaIcon, tone: 'bg-rose-50 text-rose-600', guestAllowed: true },
      { to: '/journal', label: 'Journal', description: 'Devotional reflections', icon: Heart, tone: 'bg-pink-50 text-pink-600', guestAllowed: false },
    ],
  },
  {
    title: 'Progress',
    items: [
      { to: '/analytics', label: 'Analytics', description: 'Trends and charts', icon: BarChart3, tone: 'bg-cyan-50 text-cyan-600', guestAllowed: true },
      { to: '/history', label: 'History', description: 'All past entries', icon: History, tone: 'bg-stone-100 text-stone-600', guestAllowed: true },
    ],
  },
  {
    title: 'Library',
    items: [
      { to: '/slokas', label: 'Mantras & Kirtans', description: 'Prayers and songs', icon: BookHeart, tone: 'bg-amber-50 text-brand-600', guestAllowed: true },
      { to: '/festivals', label: 'Vaishnava Calendar', description: 'Festivals and Ekadasis', icon: CalendarDays, tone: 'bg-sky-50 text-sky-600', guestAllowed: true },
    ],
  },
  {
    title: 'Sangha',
    items: [
      { to: '/community', label: 'Devotees', description: 'Find and connect with devotees', icon: Users, tone: 'bg-indigo-50 text-indigo-600', guestAllowed: false },
      { to: '/chats', label: 'Messages', description: 'Your conversations', icon: MessageCircle, tone: 'bg-emerald-50 text-emerald-600', guestAllowed: false },
      { to: '/questions', label: 'Forum', description: 'Ask and answer spiritual questions', icon: MessagesSquare, tone: 'bg-teal-50 text-teal-600', guestAllowed: false },
      { to: '/connection-requests', label: 'Connection Requests', description: 'Pending requests', icon: UserPlus, tone: 'bg-blue-50 text-blue-600', guestAllowed: false, hidden: true },
    ],
  },
  {
    title: 'Manage',
    items: [
      { to: '/admin', label: 'Admin Panel', description: 'Manage the platform', icon: Shield, tone: 'bg-red-50 text-red-600', guestAllowed: false, adminOnly: true },
    ],
  },
];

/** Account-level pages — live in the profile menu (sidebar footer), not the main list */
export const ACCOUNT_ITEMS: NavItem[] = [
  { to: '/settings', label: 'Settings', description: 'Profile and preferences', icon: Settings, tone: 'bg-stone-100 text-stone-600', guestAllowed: true },
  { to: '/about', label: 'About', description: 'About Sadhana Sang', icon: Info, tone: 'bg-stone-100 text-stone-600', guestAllowed: true },
];

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_GROUPS.flatMap((g) => g.items), ...ACCOUNT_ITEMS];

/** Section + title shown in the top bar for a given pathname */
export function getPageMeta(pathname: string): { title: string; section: string } {
  for (const g of NAV_GROUPS) {
    const hit = g.items.find((i) => i.to === pathname);
    if (hit) return { title: hit.label, section: g.title };
  }
  const acct = ACCOUNT_ITEMS.find((i) => i.to === pathname);
  if (acct) return { title: acct.label, section: 'Account' };
  if (pathname.startsWith('/chat/')) return { title: 'Messages', section: 'Sangha' };
  if (pathname === '/questions/ask') return { title: 'Ask a Question', section: 'Sangha' };
  if (pathname.startsWith('/questions/')) return { title: 'Forum', section: 'Sangha' };
  if (pathname.startsWith('/festival/')) return { title: 'Vaishnava Calendar', section: 'Library' };
  if (pathname.startsWith('/ekadashi/')) return { title: 'Ekadashi', section: 'Library' };
  return { title: 'Sadhana Sang', section: '' };
}
