import Link from "next/link";
import Logo from "@/components/Logo";

const COLS: { head: string; links: { label: string; href: string }[] }[] = [
  {
    head: "Product",
    links: [
      { label: "Console", href: "/console" },
      { label: "Catalogue", href: "/catalogue" },
      { label: "Network", href: "/network" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    head: "Protocol",
    links: [
      { label: "ERC-8004", href: "https://eips.ethereum.org/EIPS/eip-8004" },
      { label: "The Graph", href: "https://thegraph.com/docs/en/subgraphs/existing-subgraphs/agent0/" },
      { label: "Base Sepolia", href: "https://sepolia.basescan.org" },
    ],
  },
  {
    head: "Project",
    links: [
      { label: "GitHub", href: "#" },
      { label: "Docs", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <Logo fontSize={24} />
          <p
            className="sc"
            style={{ marginTop: 12, fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.8 }}
          >
            Routing, Accountability, and Auditable Councils.
          </p>
        </div>

        {COLS.map((c) => (
          <div key={c.head}>
            <p className="sc" style={{ fontSize: 14, color: "var(--ink-faint)", borderBottom: "1px solid var(--rule-soft)", paddingBottom: 4 }}>
              {c.head}
            </p>
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {c.links.map((l) =>
                l.href.startsWith("/") ? (
                  <Link key={l.label} href={l.href} className="link" style={{ fontSize: 16 }}>
                    {l.label}
                  </Link>
                ) : (
                  <a key={l.label} href={l.href} className="link" style={{ fontSize: 16 }}>
                    {l.label}
                  </a>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        className="mono"
        style={{
          marginTop: 44,
          paddingTop: 16,
          borderTop: "1px solid var(--rule-soft)",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px 20px",
          fontSize: 12,
          letterSpacing: "0.12em",
          color: "var(--ink-faint)",
        }}
      >
        <span>© 2026 RAAC</span>
        <span>Vol. 84532 · Base Sepolia</span>
      </div>
    </footer>
  );
}
