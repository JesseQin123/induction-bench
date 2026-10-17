import { linkage, type Params, type Reading, signed, clamp } from "./model";
export function Meter({ current }: { current: number }) {
  const value = clamp(current, -2, 2),
    angle = (value / 2) * 55;
  const ticks = Array.from({ length: 41 }, (_, i) => {
    const a = ((-145 + i * 2.75) * Math.PI) / 180;
    const major = i % 5 === 0;
    return (
      <line
        key={i}
        x1={130 + 105 * Math.cos(a)}
        y1={154 + 105 * Math.sin(a)}
        x2={130 + (major ? 94 : 100) * Math.cos(a)}
        y2={154 + (major ? 94 : 100) * Math.sin(a)}
      />
    );
  });
  return (
    <div className="meter">
      <div className="meter-title">
        Galvanometer <span>coil current</span>
      </div>
      <svg
        viewBox="0 0 260 180"
        role="img"
        aria-label={`Galvanometer ${current.toFixed(3)} amperes`}
      >
        <path d="M44 94 A105 105 0 0 1 216 94" fill="none" stroke="#55594e" />
        <g stroke="#575b51" strokeWidth=".8">
          {ticks}
        </g>
        <text x="130" y="36" textAnchor="middle">
          0
        </text>
        <text x="36" y="153">
          −2 A
        </text>
        <text x="205" y="153">
          2 A
        </text>
        <text x="130" y="103" className="meter-a" textAnchor="middle">
          A
        </text>
        <g transform={`rotate(${angle},130,154)`}>
          <line
            x1="130"
            y1="154"
            x2="130"
            y2="50"
            stroke="#aa653d"
            strokeWidth="2"
          />
          <line
            x1="130"
            y1="153"
            x2="130"
            y2="166"
            stroke="#252b22"
            strokeWidth="2"
          />
        </g>
        <circle cx="130" cy="154" r="5" fill="#242a22" />
      </svg>
      {Math.abs(current) > 2 && (
        <span className="overrange">OVER RANGE · see digital reading</span>
      )}
    </div>
  );
}
export function Scope({
  history,
  paused,
}: {
  history: Reading[];
  paused: boolean;
}) {
  const w = 620,
    h = 188,
    pad = 35,
    end = history.at(-1)?.time ?? 0;
  const recent = history.filter((r) => r.time >= end - 8);
  const maxE = Math.max(0.025, ...recent.map((r) => Math.abs(r.emf))) * 1.15;
  const maxI = Math.max(0.01, ...recent.map((r) => Math.abs(r.induced))) * 1.15;
  const path = (key: "emf" | "induced", scale: number) =>
    recent
      .map(
        (r, i) =>
          `${i ? "L" : "M"}${pad + ((r.time - end + 8) / 8) * (w - pad * 2)},${h / 2 - (r[key] / scale) * (h / 2 - 22)}`,
      )
      .join(" ");
  return (
    <div className="graph-panel scope-panel">
      <div className="panel-heading">
        <strong>
          <b>02</b> Oscilloscope
        </strong>
        <span>
          <i className="key green" /> EMF <i className="key amber" /> induced
          current
        </span>
      </div>
      <svg
        className="scope"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label="Live induced voltage and current over the last eight simulation seconds"
      >
        <defs>
          <pattern
            id="scope-grid"
            width="34.375"
            height="23.5"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M34.375 0H0V23.5"
              fill="none"
              stroke="#2a382d"
              strokeWidth=".6"
            />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>
        <rect x="35" y="10" width="550" height="168" fill="#0d1510" />
        <rect x="35" y="10" width="550" height="168" fill="url(#scope-grid)" />
        <line
          x1="35"
          y1="94"
          x2="585"
          y2="94"
          stroke="#506044"
          strokeWidth=".7"
        />
        <text x="30" y="21" textAnchor="end" fill="#318365">
          {Math.round(maxE * 1000)}
        </text>
        <text x="30" y="174" textAnchor="end" fill="#318365">
          −{Math.round(maxE * 1000)}
        </text>
        <text x="591" y="21" fill="#ab6c38">
          {Math.round(maxI * 1000)}
        </text>
        <text x="591" y="174" fill="#ab6c38">
          −{Math.round(maxI * 1000)}
        </text>
        <path
          d={path("emf", maxE)}
          fill="none"
          stroke="#68e0a5"
          strokeWidth="3"
          opacity=".35"
          filter="url(#glow)"
        />
        <path
          d={path("emf", maxE)}
          fill="none"
          stroke="#64b992"
          strokeWidth="1.4"
        />
        <path
          d={path("induced", maxI)}
          fill="none"
          stroke="#c08449"
          strokeWidth="1.1"
          opacity=".85"
        />
        {history.length < 2 && (
          <text x="310" y="98" textAnchor="middle" fill="#91a397">
            Move the magnet to trace a signal
          </text>
        )}
      </svg>
      <div className="graph-footer">
        <span>mV / mA · independent scales</span>
        <span>{paused ? "HOLD" : "ROLL"} · 1 s / div · 8 s window</span>
      </div>
    </div>
  );
}
export function FluxChart({ p, r }: { p: Params; r: Reading }) {
  const w = 620,
    h = 188,
    left = 44,
    right = 600,
    mid = 100;
  const max = Math.max(0.001, Math.abs(linkage(p, 0)) * 1.3);
  const X = (x: number) => left + ((x + 0.15) / 0.3) * (right - left),
    Y = (v: number) => mid - (v / max) * 66;
  const path = Array.from({ length: 151 }, (_, i) => {
    const x = -0.15 + i * 0.002;
    return `${i ? "L" : "M"}${X(x)},${Y(linkage(p, x))}`;
  }).join(" ");
  const tx = X(r.x),
    ty = Y(r.flux),
    delta = 0.027;
  return (
    <div className="graph-panel">
      <div className="panel-heading">
        <strong>
          <b>03</b> Flux linkage <i>Λ</i>
        </strong>
        <span>EMF = −slope × velocity</span>
      </div>
      <svg
        className="flux-chart"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label="Flux linkage against magnet position, with a live tangent and position marker"
      >
        <defs>
          <clipPath id="flux-clip">
            <rect x="44" y="10" width="556" height="165" />
          </clipPath>
        </defs>
        {[-15, -10, -5, 0, 5, 10, 15].map((v) => (
          <g key={v}>
            <line
              x1={X(v / 100)}
              y1="14"
              x2={X(v / 100)}
              y2="165"
              stroke="#c5c7bb"
              strokeWidth=".8"
            />
            <text x={X(v / 100)} y="182" textAnchor="middle">
              {v}
            </text>
          </g>
        ))}
        <line x1="44" x2="600" y1={mid} y2={mid} stroke="#a6ab9c" />
        <text x="37" y="20" textAnchor="end">
          {(max * 1000).toFixed(1)}
        </text>
        <text x="37" y="161" textAnchor="end">
          −{(max * 1000).toFixed(1)}
        </text>
        <g clipPath="url(#flux-clip)">
          <path d={path} fill="none" stroke="#a79837" strokeWidth="1.7" />
          <line
            x1={X(r.x - delta)}
            y1={Y(r.flux - r.slope * delta)}
            x2={X(r.x + delta)}
            y2={Y(r.flux + r.slope * delta)}
            stroke="#278268"
            strokeWidth="2"
          />
          <line
            x1={tx}
            x2={tx}
            y1={ty}
            y2="167"
            stroke="#646e5a"
            strokeDasharray="2 3"
          />
          <circle
            cx={tx}
            cy={ty}
            r="4"
            fill="#274b3b"
            stroke="#f4f1e7"
            strokeWidth="1.5"
          />
        </g>
        <text x="57" y="29" fill="#32745c">
          slope {signed(r.slope * 1000, 1)} mWb/m
        </text>
        <text x="57" y="45">
          v {signed(r.velocity, 2)} m/s
        </text>
      </svg>
      <div className="graph-footer">
        <span>mWb · turns included</span>
        <span>magnet position · cm</span>
      </div>
    </div>
  );
}
