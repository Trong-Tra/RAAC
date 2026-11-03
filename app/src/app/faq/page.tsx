import FaqList from "@/components/FaqList";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export default function FaqPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "var(--paper)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SiteHeader active="FAQ" />

      <div className="section-pad page-measure" style={{ flex: 1, width: "100%" }}>
        <div className="guide-line">
          <span>RAAC · Vol. 84532</span>
          <span>appendix</span>
          <span>F.A.Q.</span>
        </div>

        <h1
          style={{
            marginTop: 40,
            fontSize: "clamp(34px, 4.5vw, 56px)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.08,
          }}
        >
          Asked, answered.
        </h1>
        <p
          style={{
            marginTop: 16,
            fontSize: 16,
            lineHeight: 1.65,
            color: "var(--ink-soft)",
            maxWidth: 640,
          }}
        >
          The short version of the product, the security model, and where
          every partner fits.
        </p>

        <FaqList />
      </div>

      <SiteFooter />
    </main>
  );
}
