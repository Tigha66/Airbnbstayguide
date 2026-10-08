import {
  ArrowUpRight,
  Car,
  Coffee,
  Heart,
  KeyRound,
  Leaf,
  MapPin,
  ShieldCheck,
  Sun,
  Wifi,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
export const iconMap: Record<string, LucideIcon> = {
  key: KeyRound,
  wifi: Wifi,
  heart: Heart,
  coffee: Coffee,
  car: Car,
  leaf: Leaf,
  sun: Sun,
  shield: ShieldCheck,
  map: MapPin,
  book: BookOpen,
};
export function GuideIcon({
  name,
  size = 20,
}: {
  name: string;
  size?: number;
}) {
  const Icon = iconMap[name] || BookOpen;
  return <Icon size={size} />;
}
export function Logo({ light = false, href = "/" }: { light?: boolean; href?: string }) {
  return (
    <Link
      href={href}
      className={`logo ${light ? "logo-light" : ""}`}
      aria-label="StayGuide home"
    >
      <span className="logo-symbol">
        <BookOpen size={23} strokeWidth={1.8} />
        <span />
      </span>
      stayguide<span className="logo-dot">.</span>
    </Link>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <BookOpen size={32} />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function ArrowLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="text-link">
      {children}
      <ArrowUpRight size={15} />
    </Link>
  );
}
