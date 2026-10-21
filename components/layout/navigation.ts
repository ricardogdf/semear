import {
  BookOpen,
  ClipboardList,
  Compass,
  IdCard,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Library,
  Sparkles,
  UserCheck,
  UserRound,
  UserRoundSearch,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
  adminOnly?: boolean;
}

export const navigationSections: NavSection[] = [
  {
    title: "Estudos",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/subjects", label: "Matérias", icon: BookOpen },
      { href: "/simulations", label: "Simulados", icon: ClipboardList },
    ],
  },
  {
    title: "Comunidade",
    items: [
      { href: "/profile", label: "Meu perfil", icon: UserRound },
      { href: "/people", label: "Pesquisar usuários", icon: UserRoundSearch },
      { href: "/following", label: "Seguindo", icon: UserCheck },
      { href: "/discover", label: "Conheça", icon: Compass },
      { href: "/library", label: "Biblioteca pública", icon: Library },
    ],
  },
  {
    title: "Conta",
    items: [
      { href: "/settings/profile", label: "Perfil público", icon: IdCard },
      { href: "/settings/ai", label: "Provedores de IA", icon: Sparkles },
      { href: "/settings/account", label: "Senha e acesso", icon: KeyRound },
    ],
  },
  {
    title: "Administração",
    adminOnly: true,
    items: [
      { href: "/admin/users", label: "Usuários", icon: Users },
      { href: "/admin/access-requests", label: "Solicitações", icon: Inbox },
    ],
  },
];

export const SIDEBAR_COOKIE = "semear_sidebar";
