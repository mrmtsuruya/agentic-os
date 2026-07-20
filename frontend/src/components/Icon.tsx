// Minimal inline SVG icon set — replaces emoji. One stroke style, currentColor.
// Usage: <Icon name="brief" className="..." />
import type { SVGProps } from "react";

const P = (props: SVGProps<SVGSVGElement>) => ({
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  const C = paths[name];
  return (
    <svg {...P(props)}>
      {C.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

type IconName = keyof typeof paths;

const paths = {
  brief: ["M3 13l9-8 9 8", "M5 12v7h14v-7", "M12 5v14"],
  missions: ["M12 3v18", "M5 8l7-5 7 5", "M5 8v8l7 5 7-5V8"],
  intel: ["M5 3v18", "M5 7h11", "M5 12h8", "M5 17h11"],
  agents: ["M12 8a4 4 0 100-8 4 4 0 000 8z", "M4 21v-2a4 4 0 014-4h8a4 4 0 014 4v2"],
  trail: ["M9 6h11", "M9 12h11", "M9 18h11", "M4 6h.01", "M4 12h.01", "M4 18h.01"],
  tools: ["M4 6h16", "M4 12h16", "M4 18h16"],
  plus: ["M12 5v14", "M5 12h14"],
  refresh: ["M21 12a9 9 0 11-3-6.7", "M21 4v5h-5"],
  close: ["M6 6l12 12", "M18 6L6 18"],
  chat: ["M21 12a8 8 0 01-11.6 7.1L4 20l1-5.4A8 8 0 1121 12z"],
  dashboard: ["M4 4h7v7H4z", "M13 4h7v4h-7z", "M13 10h7v10h-7z", "M4 13h7v7H4z"],
  skills: ["M13 2L4 14h7l-1 8 9-12h-7z"],
  memory: ["M9 3h6v2h3v16H6V5h3z", "M9 8h6", "M9 12h6", "M9 16h4"],
  brainstorm: ["M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z", "M9 21h6", "M10 21v-2", "M14 21v-2"],
  ide: ["M4 4h16v16H4z", "M9 9l-3 3 3 3", "M15 9l3 3-3 3"],
  studio: ["M4 5h16v14H4z", "M10 9l5 3-5 3z"],
  scheduler: ["M12 7v5l3 2", "M4 5h16v14H4z", "M8 3v4", "M16 3v4"],
  kanban: ["M4 4h5v16H4z", "M10 4h5v10h-5z", "M16 4h4v13h-4z"],
  goals: ["M12 3a9 9 0 100 18 9 9 0 000-18z", "M12 8v4l3 2"],
  journal: ["M6 3h12v18H6z", "M9 7h6", "M9 11h6", "M9 15h4"],
  health: ["M12 8a4 4 0 100-8 4 4 0 000 8z", "M4 21v-2a4 4 0 014-4h8a4 4 0 014 4v2", "M12 12v4"],
  router: ["M12 4a3 3 0 100 6 3 3 0 000-6z", "M5 20a3 3 0 100-6 3 3 0 000 6z", "M19 20a3 3 0 100-6 3 3 0 000 6z", "M12 10v4", "M9 17h6"],
  analytics: ["M4 20V10", "M10 20V4", "M16 20v-7", "M22 20H2"],
  replay: ["M3 12a9 9 0 109-9", "M3 4v5h5", "M21 12a9 9 0 01-9 9", "M21 20v-5h-5"],
  errors: ["M12 3l10 18H2z", "M12 10v5", "M12 18h.01"],
  cost: ["M12 3v18", "M16 7H9a3 3 0 000 6h6a3 3 0 010 6H8"],
  plugins: ["M9 3v4", "M15 3v4", "M9 17v4", "M15 17v4", "M3 9h4", "M3 15h4", "M17 9h4", "M17 15h4", "M9 12h6"],
  backups: ["M5 4h11l3 3v13H5z", "M8 4v5h7", "M8 14h8v6H8z"],
  prompts: ["M5 4h14v12H9l-4 4z", "M8 9h8", "M8 12h5"],
  standards: ["M12 3l8 4v6c0 5-3.5 7.5-8 8-4.5-.5-8-3-8-8V7z", "M9 12l2 2 4-4"],
  settings: ["M12 9a3 3 0 100 6 3 3 0 000-6z", "M4 12h2", "M18 12h2", "M12 4v2", "M12 18v2", "M6 6l1.5 1.5", "M16.5 16.5L18 18", "M6 18l1.5-1.5", "M16.5 7.5L18 6"],
  wizard: ["M12 3l2 4 4 2-4 2-2 4-2-4-4-2 4-2z", "M19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"],
  search: ["M11 4a7 7 0 105 12 7 7 0 00-5-12z", "M20 20l-4-4"],
  sun: ["M12 4V2", "M12 22v-2", "M4 12H2", "M22 12h-2", "M6 6l-1.5-1.5", "M19.5 19.5L18 18", "M6 18l-1.5 1.5", "M19.5 4.5L18 6", "M12 8a4 4 0 100 8 4 4 0 000-8z"],
  target: ["M12 3a9 9 0 100 18 9 9 0 000-18z", "M12 8a4 4 0 100 8 4 4 0 000-8z", "M12 11a1 1 0 100 2 1 1 0 000-2z"],
};
