import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 16, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M5 24.5c4.4 0 5.3-13 9.9-13 4 0 3.4 8.2 7.1 8.2 2.1 0 3.6-2.7 5-5.9"
        stroke="url(#logo-stroke)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="22" cy="13.8" r="2.4" fill="#C9A227" />
      <circle cx="22" cy="13.8" r="4.6" stroke="#C9A227" strokeOpacity=".35" />
      <defs>
        <linearGradient
          id="logo-stroke"
          x1="5"
          y1="24"
          x2="27"
          y2="11"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#3E9C8F" />
          <stop offset="1" stopColor="#E3C052" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export const ShieldIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3 5 6v5.3c0 4.3 2.8 7.6 7 9.7 4.2-2.1 7-5.4 7-9.7V6l-7-3Z" />
    <path d="m9.2 12 1.9 1.9 3.8-3.9" />
  </Icon>
);

export const PrintIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 9V3h12v6" />
    <path d="M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2" />
    <path d="M6 14h12v7H6z" />
  </Icon>
);

export const DownloadIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M4 19h16" />
  </Icon>
);

export const PlusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const TrashIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" />
  </Icon>
);

export const PencilIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
    <path d="m14.5 6.5 3 3" />
  </Icon>
);

export const ArrowRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 12h15" />
    <path d="m13 6 6 6-6 6" />
  </Icon>
);

export const ArrowUpRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M7 17 17 7" />
    <path d="M8 7h9v9" />
  </Icon>
);

export const InfoIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.5v.5" />
  </Icon>
);

export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m4 12 5 5L20 6" />
  </Icon>
);

export const AlertIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3 2.5 20h19L12 3Z" />
    <path d="M12 9v5M12 17.5v.5" />
  </Icon>
);

export const XIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
);

export const GithubIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 19c-4.3 1.4-4.3-2.2-6-2.8M15 21v-3.6a3 3 0 0 0-.8-2.4c2.7-.3 5.5-1.3 5.5-6a4.7 4.7 0 0 0-1.3-3.2 4.4 4.4 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.4 11.4 0 0 0-6 0C6.5 2.3 5.5 2.6 5.5 2.6a4.4 4.4 0 0 0-.1 3.2A4.7 4.7 0 0 0 4 9c0 4.6 2.8 5.7 5.5 6a3 3 0 0 0-.8 2.3V21" />
  </Icon>
);

export const RefreshIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20 6v5h-5" />
    <path d="M4 18v-5h5" />
    <path d="M6.1 9a7 7 0 0 1 11.6-2.6L20 11M4 13l2.3 2.6A7 7 0 0 0 17.9 15" />
  </Icon>
);

export const SparkIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m12 2 1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2Z" />
    <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
  </Icon>
);

export const TrendDownIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m3 7 6 6 4-4 8 8" />
    <path d="M21 11v6h-6" />
  </Icon>
);

export const TrendUpIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m3 17 6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </Icon>
);

export const CalendarIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 10h18" />
  </Icon>
);

export const WalletIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6" />
    <path d="M16 12h4v4h-4a2 2 0 0 1 0-4Z" />
  </Icon>
);

export const TargetIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <path d="M12 4V2M12 22v-2M4 12H2M22 12h-2" />
  </Icon>
);

export const LayersIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
  </Icon>
);

export const PercentIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M19 5 5 19" />
    <circle cx="7" cy="7" r="2.2" />
    <circle cx="17" cy="17" r="2.2" />
  </Icon>
);

export const ChartIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Icon>
);

export const LockIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="4" y="10" width="16" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </Icon>
);

export const ExternalIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
  </Icon>
);

export const SwapIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 8h13l-3-3M20 16H7l3 3" />
  </Icon>
);

export const ScalesIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3v18M7 21h10M4 7h16" />
    <path d="M7 7 4 13h6L7 7ZM17 7l-3 6h6l-3-6Z" />
  </Icon>
);

export const TableIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9h18M9 9v11M15 9v11" />
  </Icon>
);
