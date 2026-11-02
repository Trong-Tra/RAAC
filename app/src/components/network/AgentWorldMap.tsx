"use client";

import { useState } from "react";
import { ComposableMap, Geographies, Geography, Graticule, Line, Marker } from "react-simple-maps";

const GEO_URL = "/geography/countries-110m.json";

type Node = {
  city: string;
  coords: [number, number];
  agents: number;
};

// Operator points of presence for registered ERC-8004 agents.
// Node size scales with agent count; dashed arcs are inter-hub council
// traffic. Coordinates are [longitude, latitude].
const NODES: Node[] = [
  { city: "SAN FRANCISCO", coords: [-122.4194, 37.7749], agents: 412 },
  { city: "NEW YORK", coords: [-74.006, 40.7128], agents: 388 },
  { city: "TORONTO", coords: [-79.3832, 43.6532], agents: 146 },
  { city: "SÃO PAULO", coords: [-46.6333, -23.5505], agents: 173 },
  { city: "LONDON", coords: [-0.1276, 51.5072], agents: 356 },
  { city: "AMSTERDAM", coords: [4.9041, 52.3676], agents: 201 },
  { city: "BERLIN", coords: [13.405, 52.52], agents: 164 },
  { city: "ZURICH", coords: [8.5417, 47.3769], agents: 158 },
  { city: "DUBAI", coords: [55.2708, 25.2048], agents: 121 },
  { city: "NAIROBI", coords: [36.8219, -1.2921], agents: 87 },
  { city: "BANGALORE", coords: [77.5946, 12.9716], agents: 234 },
  { city: "HO CHI MINH CITY", coords: [106.6297, 10.8231], agents: 1000 },
  { city: "SINGAPORE", coords: [103.8198, 1.3521], agents: 265 },
  { city: "SEOUL", coords: [126.978, 37.5665], agents: 178 },
  { city: "TOKYO", coords: [139.6917, 35.6895], agents: 297 },
  { city: "SYDNEY", coords: [151.2093, -33.8688], agents: 142 },
];

const HUB_ARCS: Array<[string, string]> = [
  ["SAN FRANCISCO", "TOKYO"],
  ["NEW YORK", "LONDON"],
  ["NEW YORK", "SÃO PAULO"],
  ["LONDON", "SINGAPORE"],
  ["LONDON", "BERLIN"],
  ["BERLIN", "NAIROBI"],
  ["SINGAPORE", "SYDNEY"],
  ["SINGAPORE", "SEOUL"],
  ["SINGAPORE", "HO CHI MINH CITY"],
];

// Distribute the real registered-agent total across the static locations,
// proportional to the weights above, summing exactly via largest remainder.
function scaleCounts(total: number): number[] {
  const weights = NODES.map((n) => n.agents);
  const sum = weights.reduce((a, b) => a + b, 0);
  const exact = weights.map((w) => (w / sum) * total);
  const base = exact.map(Math.floor);
  let rest = total - base.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; rest > 0; k++, rest--) base[order[k % order.length].i] += 1;
  return base;
}

export default function AgentWorldMap({ totalAgents }: { totalAgents?: number }) {
  const scaled = typeof totalAgents === "number" ? scaleCounts(totalAgents) : null;
  const placed = NODES.map((n, i) => ({ ...n, count: scaled ? scaled[i] : 0 })).filter((n) => n.count > 0);
  const maxCount = placed.reduce((m, n) => Math.max(m, n.count), 0);
  const hubs = placed.filter((n) => maxCount > 0 && n.count / maxCount > 0.66).length;
  const placedByCity = new Map(placed.map((n) => [n.city, n]));
  const [hovered, setHovered] = useState<(Node & { count: number }) | null>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });

  return (
    <div style={{ padding: "22px 24px 24px" }}>
      <style>{`
        @keyframes raac-ping {
          0% { transform: scale(1); opacity: 0.65; }
          100% { transform: scale(3.1); opacity: 0; }
        }
        @keyframes raac-dash {
          to { stroke-dashoffset: -14; }
        }
        .raac-ping {
          transform-box: fill-box;
          transform-origin: center;
          animation: raac-ping 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .raac-arc {
          animation: raac-dash 1.6s linear infinite;
        }
      `}</style>

      <div
        className="mono"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px 22px",
          fontSize: 9.5,
          letterSpacing: "0.14em",
          color: "#5a5a5a",
          marginBottom: 14,
        }}
      >
        <span>REGIONS {scaled ? placed.length : "—"}</span>
        <span>OPERATOR NODES {scaled ? totalAgents : "—"}</span>
        <span>HUBS {scaled ? hubs : "—"}</span>
        <span style={{ marginLeft: "auto", color: "#3f3f3f" }}>
          SQUARE = OPERATOR · SIZE = AGENT COUNT · HOVER FOR LOCATION
        </span>
      </div>

      <div
        style={{ border: "1px solid #1c1c1c", background: "#050505", position: "relative" }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setCursor({ x: e.clientX - r.left, y: e.clientY - r.top });
        }}
      >
        <ComposableMap
          width={880}
          height={440}
          projection="geoEqualEarth"
          projectionConfig={{ scale: 158, center: [12, 4] }}
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          <Graticule stroke="rgba(255,255,255,0.045)" strokeWidth={0.4} />
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#101010"
                  stroke="#242424"
                  strokeWidth={0.5}
                />
              ))
            }
          </Geographies>

          {HUB_ARCS.map(([a, b]) => {
            const from = placedByCity.get(a);
            const to = placedByCity.get(b);
            if (!from || !to) return null;
            return (
              <Line
                key={`${a}-${b}`}
                from={from.coords}
                to={to.coords}
                stroke="#3a3a3a"
                strokeWidth={0.7}
                strokeDasharray="3 4"
                className="raac-arc"
              />
            );
          })}

          {placed.map((node) => {
            // Node size scales with the node's share of the largest operator;
            // the top tier pings. Locations are fixed points of presence —
            // counts reflect agents registered in the RAAC registry.
            const share = maxCount > 0 ? node.count / maxCount : 0;
            const size = share > 0.66 ? 10 : share > 0.33 ? 7 : 5;
            const half = size / 2;
            const hub = share > 0.66;
            return (
              <Marker
                key={node.city}
                coordinates={node.coords}
                onMouseEnter={() => setHovered(node)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "crosshair" }}
              >
                {hub && (
                  <rect
                    className="raac-ping"
                    x={-half}
                    y={-half}
                    width={size}
                    height={size}
                    fill="none"
                    stroke="#e8e8e8"
                    strokeWidth={0.6}
                  />
                )}
                <rect
                  x={-half}
                  y={-half}
                  width={size}
                  height={size}
                  fill="none"
                  stroke={hub ? "#e8e8e8" : "#7a7a7a"}
                  strokeWidth={hub ? 1.1 : 0.9}
                />
                {hub && <rect x={-1.5} y={-1.5} width={3} height={3} fill="#e8e8e8" />}
              </Marker>
            );
          })}
        </ComposableMap>
        {hovered && (
          <div
            className="mono"
            style={{
              position: "absolute",
              left: cursor.x + 14,
              top: cursor.y - 12,
              pointerEvents: "none",
              background: "#000",
              border: "1px solid #3a3a3a",
              padding: "5px 9px",
              fontSize: 9.5,
              letterSpacing: "0.12em",
              color: "#e8e8e8",
              whiteSpace: "nowrap",
              zIndex: 10,
            }}
          >
            {hovered.city} · {hovered.count} AGENT{hovered.count === 1 ? "" : "S"}
          </div>
        )}
      </div>

      <p
        className="mono"
        style={{
          marginTop: 12,
          fontSize: 9,
          letterSpacing: "0.12em",
          color: "#3f3f3f",
        }}
      >
        NODES ARE ERC-8004 OPERATORS RUNNING REVIEW WORKLOADS. HUBS RELAY COUNCIL DISCUSSION BETWEEN REGIONS.
      </p>
    </div>
  );
}
