import type { ReactNode } from "react";

// Small original line icons shared across the app. Every icon is decorative
// by default (aria-hidden); the control that contains it carries the label.
type IconProps = { className?: string };

function Icon({
  className = "size-4",
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

export function LogoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 11.5 12 4l8 7.5V20H4z" />
      <path d="m9 14.5 2.2 2.2 4-4.2" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Icon>
  );
}

export function StarIcon({
  filled = false,
  className = "size-4",
}: IconProps & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
    </svg>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </Icon>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </Icon>
  );
}

export function WalkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="13" cy="4.5" r="1.5" />
      <path d="m9.5 21 2.5-6-2.5-2.5 1-4.5 3 .5 2 3 2.5 1" />
      <path d="m7.5 12 3-4M14.5 21l-1-5" />
    </Icon>
  );
}

export function PrinterIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 8V4h10v4" />
      <path d="M7 17H5a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2" />
      <path d="M7 14h10v6H7z" />
    </Icon>
  );
}

export function CarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m3 12 2-5a2 2 0 0 1 1.9-1.3h10.2A2 2 0 0 1 19 7l2 5v5H3z" />
      <path d="M3 12h18M7 14.5h.01M17 14.5h.01M6 17v2M18 17v2" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Icon>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </Icon>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Icon>
  );
}

export function EyeIcon({
  off = false,
  className,
}: IconProps & { off?: boolean }) {
  return (
    <Icon className={className}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
      {off ? <path d="M4 4l16 16" /> : null}
    </Icon>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
    </Icon>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20.4 15.2A8.5 8.5 0 0 1 8.8 3.6 8.5 8.5 0 1 0 20.4 15.2Z" />
    </Icon>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
    </Icon>
  );
}

export function SpinnerIcon({ className = "size-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
      className={`shrink-0 motion-safe:animate-spin ${className}`}
    >
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

function BagIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 8h12l1 12H5z" />
      <path d="M9 8V7a3 3 0 0 1 6 0v1" />
    </Icon>
  );
}

function BasketIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 10h16l-1.5 9h-13z" />
      <path d="m8 10 3-5M16 10l-3-5M9.5 13v3M14.5 13v3" />
    </Icon>
  );
}

function CupIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" />
      <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v2M12 3v2" />
    </Icon>
  );
}

export function BusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="4" width="14" height="13" rx="2" />
      <path d="M5 11h14M8 17v2.5M16 17v2.5M8.5 14h.01M15.5 14h.01" />
    </Icon>
  );
}

export function TrainIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="6" y="3" width="12" height="14" rx="3" />
      <path d="M6 11h12M9 17l-2 4M15 17l2 4M9.5 14h.01M14.5 14h.01" />
    </Icon>
  );
}

function HealthIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z" />
    </Icon>
  );
}

function DumbbellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12" />
    </Icon>
  );
}

function FuelIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 20V6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v14M4 20h11" />
      <path d="M7 8h5v4H7zM14 10h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V9l-3-3" />
    </Icon>
  );
}

function WrenchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.5 6.5a4 4 0 0 0-5.2 5.2L4 17l3 3 5.3-5.3a4 4 0 0 0 5.2-5.2l-2.7 2.7-2.3-.6-.6-2.3z" />
    </Icon>
  );
}

const categoryIcons: Record<string, (props: IconProps) => ReactNode> = {
  shopping_centres: BagIcon,
  groceries: BasketIcon,
  food: CupIcon,
  transport: BusIcon,
  health: HealthIcon,
  fitness: DumbbellIcon,
  fuel: FuelIcon,
  services: WrenchIcon,
};

export function CategoryIcon({
  categoryId,
  className,
}: IconProps & { categoryId: string }) {
  const CategoryGlyph = categoryIcons[categoryId] ?? MapPinIcon;

  return <CategoryGlyph className={className} />;
}

// Icon on a soft tile tinted with the category hue; links rows to map markers.
export function CategoryTile({
  categoryId,
  color,
}: {
  categoryId: string;
  color: string;
}) {
  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: `${color}26`, color }}
    >
      <CategoryIcon categoryId={categoryId} className="size-[18px]" />
    </span>
  );
}
