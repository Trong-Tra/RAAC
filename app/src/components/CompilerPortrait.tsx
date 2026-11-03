"use client";

import { useEffect, useState } from "react";

/**
 * CompilerPortrait — a framed portrait in the plate style. Falls back to
 * an ink monogram until the portrait file lands in app/public/team/.
 * The probe runs post-hydration so a 404 never flashes a broken image.
 */
export default function CompilerPortrait({ name, image, ink }: { name: string; image: string; ink: string }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const probe = new Image();
    probe.onload = () => setLoaded(true);
    probe.src = image;
  }, [image]);

  return (
    <div style={{ border: "1.5px solid var(--rule)", padding: 4, background: "var(--paper-raised)" }}>
      <div
        style={{
          border: "1px solid var(--rule-soft)",
          aspectRatio: "4 / 5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--paper-sunk)",
          overflow: "hidden",
        }}
      >
        {loaded ? (
          // eslint-disable-next-line @next/next/no-img-element -- public asset with a probed monogram fallback
          <img
            src={image}
            alt={name}
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: "sepia(0.18) saturate(0.92)" }}
          />
        ) : (
          <span aria-hidden style={{ fontSize: 72, fontWeight: 700, color: ink, lineHeight: 1 }}>
            {name[0]}
          </span>
        )}
      </div>
    </div>
  );
}
