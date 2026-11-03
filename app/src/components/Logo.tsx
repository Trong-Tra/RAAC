export default function Logo({
  fontSize = 20,
  color = "var(--ink)",
}: {
  fontSize?: number | string;
  color?: string;
}) {
  return (
    <span
      style={{
        fontWeight: 700,
        fontSize,
        letterSpacing: "-0.02em",
        lineHeight: 1,
        color,
        fontFamily: "var(--serif)",
      }}
    >
      RAAC
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: "0.22em",
          height: "0.22em",
          marginLeft: "0.14em",
          background: "var(--vermilion)",
          transform: "rotate(45deg) translateY(-0.06em)",
        }}
      />
    </span>
  );
}
