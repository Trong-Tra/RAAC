import type { ReactNode } from "react";

/**
 * Plate — the lexicon world's framed figure. Double rule outside,
 * hairline inside, small-caps caption across the top.
 */
export default function Plate({
  caption,
  plateNo,
  children,
  style,
  innerStyle,
}: {
  caption?: string;
  plateNo?: string;
  children: ReactNode;
  style?: React.CSSProperties;
  innerStyle?: React.CSSProperties;
}) {
  return (
    <div className="plate" style={style}>
      <div className="plate-inner" style={innerStyle}>
        {(caption || plateNo) && (
          <div className="plate-caption">
            <span>{caption}</span>
            {plateNo && <span style={{ color: "var(--ink-faint)" }}>{plateNo}</span>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
