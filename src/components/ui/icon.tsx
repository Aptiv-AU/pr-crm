"use client";

import { type CSSProperties } from "react";

type IconName =
  | "contacts" | "campaigns" | "outreach" | "events" | "coverage"
  | "search" | "plus" | "back" | "check" | "edit" | "sparkle" | "mail"
  | "chevronR" | "chevronL" | "chevronD" | "filter" | "sun" | "moon" | "menu" | "close"
  | "workspace" | "settings" | "tag" | "suppliers" | "upload" | "file" | "bell";

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

const paths: Record<IconName, (c: string) => React.ReactNode> = {
  contacts: (c) => (<><circle cx="8" cy="5.5" r="2.8" stroke={c} strokeWidth="1.35" fill="none" /><path d="M2 14c0-3 2.5-4.8 6-4.8s6 1.8 6 4.8" stroke={c} strokeWidth="1.35" fill="none" strokeLinecap="round" /></>),
  campaigns: (c) => (<path d="M3 4h10M3 8h7M3 12h4.5" stroke={c} strokeWidth="1.35" strokeLinecap="round" />),
  outreach: (c) => (<path d="M14 2L2 7l5 1.8L8.5 14 14 2z" stroke={c} strokeWidth="1.35" fill="none" strokeLinejoin="round" />),
  events: (c) => (<><rect x="2" y="3" width="12" height="11" rx="2" stroke={c} strokeWidth="1.35" fill="none" /><path d="M5 1.5v3M11 1.5v3M2 7h12" stroke={c} strokeWidth="1.35" strokeLinecap="round" /></>),
  coverage: (c) => (<polyline points="2,12 5,7.5 8,9.5 11,5 14,7" stroke={c} strokeWidth="1.35" fill="none" strokeLinecap="round" strokeLinejoin="round" />),
  search: (c) => (<><circle cx="7" cy="7" r="4" stroke={c} strokeWidth="1.35" fill="none" /><path d="M11 11l2.5 2.5" stroke={c} strokeWidth="1.35" strokeLinecap="round" /></>),
  plus: (c) => (<path d="M8 3v10M3 8h10" stroke={c} strokeWidth="1.5" strokeLinecap="round" />),
  back: (c) => (<path d="M10 4L6 8l4 4" stroke={c} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />),
  check: (c) => (<path d="M3 8l3.5 3.5L13 5" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />),
  edit: (c) => (<path d="M11 3l2 2-8 8H3v-2L11 3z" stroke={c} strokeWidth="1.35" fill="none" strokeLinejoin="round" />),
  sparkle: (c) => (<path d="M8 2l1.4 3.6L13 7l-3.6 1.4L8 12l-1.4-3.6L3 7l3.6-1.4L8 2z" stroke={c} strokeWidth="1.2" fill="none" strokeLinejoin="round" />),
  mail: (c) => (<><rect x="2" y="4" width="12" height="9" rx="1.5" stroke={c} strokeWidth="1.35" fill="none" /><path d="M2 5.5l6 4 6-4" stroke={c} strokeWidth="1.35" fill="none" /></>),
  chevronR: (c) => (<path d="M6 4l4 4-4 4" stroke={c} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />),
  chevronL: (c) => (<path d="M10 4l-4 4 4 4" stroke={c} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />),
  chevronD: (c) => (<path d="M4 6l4 4 4-4" stroke={c} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />),
  filter: (c) => (<path d="M2 4h12M5 8h6M7 12h2" stroke={c} strokeWidth="1.35" strokeLinecap="round" />),
  sun: (c) => (<><circle cx="8" cy="8" r="2.8" stroke={c} strokeWidth="1.35" fill="none" /><path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.9 3.9l1 1M11.1 11.1l1 1M11.1 3.9l-1 1M4.9 11.1l-1 1" stroke={c} strokeWidth="1.35" strokeLinecap="round" /></>),
  moon: (c) => (<path d="M13 10A5 5 0 0 1 6 3 6 6 0 1 0 13 10z" stroke={c} strokeWidth="1.35" fill="none" />),
  menu: (c) => (<path d="M3 5h10M3 8h10M3 11h10" stroke={c} strokeWidth="1.5" strokeLinecap="round" />),
  close: (c) => (<path d="M4 4l8 8M12 4l-8 8" stroke={c} strokeWidth="1.5" strokeLinecap="round" />),
  workspace: (c) => (<><rect x="2" y="2" width="5" height="5" rx="1.2" stroke={c} strokeWidth="1.35" fill="none" /><rect x="9" y="2" width="5" height="5" rx="1.2" stroke={c} strokeWidth="1.35" fill="none" /><rect x="2" y="9" width="5" height="5" rx="1.2" stroke={c} strokeWidth="1.35" fill="none" /><rect x="9" y="9" width="5" height="5" rx="1.2" stroke={c} strokeWidth="1.35" fill="none" /></>),
  settings: (c) => (<><circle cx="8" cy="8" r="2.3" stroke={c} strokeWidth="1.35" fill="none" /><path d="M8 2.5V4M8 12v1.5M2.5 8H4M12 8h1.5M4.1 4.1l1 1M10.9 10.9l1 1M11 4.1l-1 1M5 10.9l-1 1" stroke={c} strokeWidth="1.35" strokeLinecap="round" /></>),
  tag: (c) => (<><path d="M9 2H13V6L7 12a1.5 1.5 0 01-2.1 0L2.8 9.9A1.5 1.5 0 012.8 7.8L9 2z" stroke={c} strokeWidth="1.35" fill="none" strokeLinejoin="round" /><circle cx="11" cy="4.5" r="0.8" fill={c} /></>),
  suppliers: (c) => (<><rect x="2" y="6" width="12" height="8" rx="1.5" stroke={c} strokeWidth="1.35" fill="none" /><path d="M5 6V4a3 3 0 016 0v2" stroke={c} strokeWidth="1.35" fill="none" strokeLinecap="round" /><circle cx="8" cy="10" r="1.5" stroke={c} strokeWidth="1.2" fill="none" /></>),
  upload: (c) => (<><path d="M8 10V2.5M5 5.5L8 2.5l3 3" stroke={c} strokeWidth="1.35" fill="none" strokeLinecap="round" strokeLinejoin="round" /><path d="M2.5 10.5V13a1 1 0 001 1h9a1 1 0 001-1v-2.5" stroke={c} strokeWidth="1.35" fill="none" strokeLinecap="round" /></>),
  file: (c) => (<><path d="M4 2h5l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke={c} strokeWidth="1.35" fill="none" strokeLinejoin="round" /><path d="M9 2v3h3" stroke={c} strokeWidth="1.35" fill="none" strokeLinejoin="round" /></>),
  bell: (c) => (<><path d="M4 11V7.5a4 4 0 018 0V11l1.2 1.4a0.6 0.6 0 01-.46 1H3.26a0.6 0.6 0 01-.46-1L4 11z" stroke={c} strokeWidth="1.35" fill="none" strokeLinejoin="round" /><path d="M6.5 13.8a1.5 1.5 0 003 0" stroke={c} strokeWidth="1.35" fill="none" strokeLinecap="round" /></>),
};

export function Icon({ name, size = 14, color = "currentColor", className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} style={{ flexShrink: 0, display: "block", ...style }}>
      {paths[name]?.(color)}
    </svg>
  );
}

export type { IconName, IconProps };
