import Plate from "@/components/Plate";

export function PageHead({
  title,
  sub,
}: {
  title: string;
  sub?: string;
}) {
  return (
    <div>
      <h1
        style={{
          fontSize: "clamp(28px, 3.4vw, 44px)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          color: "var(--ink)",
        }}
      >
        {title}
      </h1>
      {sub && (
        <p
          style={{
            marginTop: 10,
            fontSize: 15,
            lineHeight: 1.65,
            color: "var(--ink-soft)",
            maxWidth: 640,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

export function StatRow({
  stats,
}: {
  stats: { value: string; label: string }[];
}) {
  return (
    <div
      style={{
        marginTop: 26,
        paddingTop: 22,
        borderTop: "1.5px solid var(--rule)",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
        gap: "20px 28px",
      }}
    >
      {stats.map((s) => (
        <div key={s.label}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1 }}>
            {s.value}
          </div>
          <div
            className="sc"
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "var(--ink-soft)",
            }}
          >
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Panel({
  title,
  children,
  style,
}: {
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <Plate caption={title} style={style}>
      {children}
    </Plate>
  );
}

export const th: React.CSSProperties = {
  textAlign: "left",
  fontSize: 12,
  fontVariant: "small-caps",
  letterSpacing: "0.1em",
  color: "var(--ink-faint)",
  fontWeight: 400,
  padding: "0 12px 12px 0",
  whiteSpace: "nowrap",
};

export const td: React.CSSProperties = {
  fontSize: 13,
  color: "var(--ink-soft)",
  padding: "12px 12px 12px 0",
  borderTop: "1px solid var(--rule-faint)",
  verticalAlign: "top",
};

export function DecisionTag({ d }: { d: string }) {
  const filled = d === "ALLOW";
  return (
    <span
      className="mono"
      style={{
        display: "inline-block",
        fontSize: 10,
        letterSpacing: "0.12em",
        padding: "4px 10px",
        border: `1px solid ${filled ? "var(--emerald)" : "var(--rule-soft)"}`,
        color: filled ? "var(--emerald)" : "var(--ink-soft)",
        whiteSpace: "nowrap",
      }}
    >
      {d}
    </span>
  );
}

export function Skeleton({
  height = 14,
  width = "100%",
  style,
}: {
  height?: number;
  width?: number | string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      style={{
        height,
        width,
        background: "var(--paper-sunk)",
        animation: "blink 1.6s steps(2, start) infinite",
        ...style,
      }}
    />
  );
}

export function ErrorWindow({
  code,
  message,
  title = "Error",
}: {
  code: string;
  message: string;
  title?: string;
}) {
  return (
    <Plate caption={title}>
      <div
        className="mono"
        style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--madder)" }}
      >
        {code}
      </div>
      <p style={{ marginTop: 10, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-soft)" }}>
        {message}
      </p>
    </Plate>
  );
}

export function EmptyState({ children }: { children?: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px dashed var(--rule-soft)",
        padding: "30px 24px",
        textAlign: "center",
        fontSize: 14.5,
        fontStyle: "italic",
        lineHeight: 1.7,
        color: "var(--ink-faint)",
      }}
    >
      {children ?? "No live events yet — submit a paper to start a council."}
    </div>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="chip">{children}</span>;
}
