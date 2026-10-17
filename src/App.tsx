import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Pause,
  Play,
  RotateCcw,
  ArrowLeftRight,
  Download,
  Info,
  X,
  Magnet,
  Maximize2,
  ChevronRight,
} from "lucide-react";
import {
  DEFAULTS,
  INITIAL,
  MAGNETS,
  WIRES,
  STEP,
  advance,
  sample,
  signed,
  startSwing,
  moveMagnet,
  type Params,
  type State,
  type Reading,
} from "./model";
import { Scene, type CameraView } from "./Scene";
import { Meter, Scope, FluxChart } from "./Charts";
import { createReplay, nextReplay, demoCaption, DEMO_FRAMES, DEMO_FPS } from './demo';
import "./style.css";
function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  ends,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  ends?: string[];
}) {
  return (
    <label className="slider-control">
      <span className="label-row">
        <span>{label}</span>
        <output>
          {Number(value.toFixed(2))}
          {unit}
        </output>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={
          {
            "--fill": `${((value - min) / (max - min)) * 100}%`,
          } as React.CSSProperties
        }
      />
      <span className="range-labels">
        <span>{ends?.[0] ?? min}</span>
        {ends?.[1] && <span>{ends[1]}</span>}
        <span>{ends?.[2] ?? max}</span>
      </span>
    </label>
  );
}
function Metric({
  label,
  value,
  unit,
  note,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  note: string;
  color?: string;
}) {
  return (
    <div className="metric">
      <div className="metric-label">
        {color && <i className={`key ${color}`} />} {label}
      </div>
      <div className="metric-value">
        {value}
        <span>{unit}</span>
      </div>
      <div className="metric-note">{note}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="control-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
export default function App() {
  const replayQuery = new URLSearchParams(location.search).get('replay');
  const [replayMode, setReplayMode] = useState(Boolean(replayQuery));
  const replayModeRef = useRef(replayMode);
  replayModeRef.current = replayMode;
  const replay = useRef(createReplay());
  const [demoFrame, setDemoFrame] = useState(0);
  const frameClock = replayQuery === 'frames';
  const [p, setP] = useState<Params>({ ...DEFAULTS }),
    pr = useRef(p);
  pr.current = p;
  const state = useRef<State>({ ...INITIAL }),
    history = useRef<Reading[]>([]),
    [r, setR] = useState(() => sample(p, INITIAL));
  const [running, setRunning] = useState(true),
    [swinging, setSwinging] = useState(false),
    [view, setView] = useState<CameraView>("Angled"),
    [fieldLines, setFieldLines] = useState(true),
    [resetKey, setResetKey] = useState(0),
    [about, setAbout] = useState(false),
    [notice, setNotice] = useState(""),
    [reduced, setReduced] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  const modal = useRef<HTMLDialogElement>(null),
    infoButton = useRef<HTMLButtonElement>(null);
  const patch = <K extends keyof Params>(key: K, v: Params[K]) =>
    setP((prev) => ({ ...prev, [key]: v }));
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const cb = () => setReduced(mq.matches);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  }, []);
  useEffect(() => {
    let id = 0,
      last = performance.now(),
      acc = 0,
      paint = 0,
      samples = 0;
    const loop = (now: number) => {
      if (replayModeRef.current) { last = now; acc = 0; id = requestAnimationFrame(loop); return; }
      acc += Math.min((now - last) / 1000, 0.1);
      last = now;
      while (acc >= STEP) {
        state.current = advance(pr.current, state.current);
        acc -= STEP;
        samples++;
        if (samples % 4 === 0 && state.current.running) {
          history.current.push(sample(pr.current, state.current));
          if (history.current.length > 240) history.current.shift();
        }
      }
      if (now - paint > 32) {
        setR(sample(pr.current, state.current));
        paint = now;
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);
  const move = useCallback((x: number) => {
    state.current = moveMagnet(state.current, x);
    setSwinging(false);
    setRunning(true);
  }, []);
  const stepReplay = useCallback(() => {
    const next = nextReplay(replay.current);
    replay.current = next;
    pr.current = next.p;
    state.current = next.state;
    history.current = next.history;
    setP(next.p);
    setR(sample(next.p, next.state));
    setSwinging(next.state.swinging);
    setRunning(next.state.running);
    setDemoFrame(next.frame);
  }, []);
  useEffect(() => {
    if (!replayMode || frameClock) return;
    let id = 0, last = performance.now(), acc = 0;
    const loop = (now: number) => {
      acc += Math.min((now - last) / 1000, .1); last = now;
      while (acc >= 1 / DEMO_FPS && replay.current.frame < DEMO_FRAMES) {
        stepReplay(); acc -= 1 / DEMO_FPS;
      }
      if (replay.current.frame < DEMO_FRAMES) id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [replayMode, frameClock, stepReplay]);
  const pause = () => {
    const run = !state.current.running;
    state.current = { ...state.current, running: run, velocity: 0 };
    setRunning(run);
  };
  const swing = () => {
    if (state.current.swinging) {
      state.current = {
        ...state.current,
        swinging: false,
        target: state.current.x,
        velocity: 0,
      };
      setSwinging(false);
    } else {
      state.current = startSwing(state.current);
      setSwinging(true);
      setRunning(true);
    }
  };
  const reset = () => {
    pr.current = { ...DEFAULTS };
    setP({ ...DEFAULTS });
    state.current = { ...INITIAL };
    history.current = [];
    setR(sample(DEFAULTS, INITIAL));
    setSwinging(false);
    setRunning(true);
    setView("Angled");
    setFieldLines(true);
    setResetKey((k) => k + 1);
    setNotice("Experiment reset to default settings.");
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (replayMode && frameClock && e.key === '.') { e.preventDefault(); stepReplay(); return; }
      if (replayMode && [' ', 'r', 'R', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) setReplayMode(false);
      if (
        (e.target as HTMLElement).matches("input,button,select,textarea") ||
        about
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        pause();
      }
      if (e.key.toLowerCase() === "r") reset();
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        move(state.current.target + (e.key === "ArrowRight" ? 0.01 : -0.01));
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  useEffect(() => {
    if (about) modal.current?.showModal();
    else if (modal.current?.open) {
      modal.current.close();
      infoButton.current?.focus();
    }
  }, [about]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(t);
  }, [notice]);
  const exportCSV = () => {
    const keys = [
      "time",
      "x",
      "velocity",
      "flux",
      "emf",
      "induced",
      "batteryCurrent",
      "current",
      "field",
      "force",
    ] as const;
    const csv =
      "# Induction Bench — simplified teaching model; SI units; parameter changes are quasi-static\n" +
      keys.join(",") +
      "\n" +
      history.current
        .map((row) => keys.map((key) => row[key].toPrecision(8)).join(","))
        .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "induction-bench-readings.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Exported the last 8 seconds of sampled measurements.");
  };
  const status = !running
    ? "Acquisition paused. Adjust a control or resume to continue."
    : p.battery !== 0
      ? "Electromagnet on. Battery and induced current share the same circuit."
      : Math.abs(r.velocity) > 0.003
        ? "Changing flux induces a current that opposes the motion."
        : "Move the magnet. A changing magnetic flux creates an EMF.";
  return (
    <main className="bench" data-demo-frame={replayMode ? demoFrame : undefined}
      onPointerDownCapture={(e) => {
        if (replayMode && !(e.target as HTMLElement).closest('.demo-caption')) setReplayMode(false);
      }}>
      <header className="topbar">
        <div className="brand">
          <Magnet size={20} strokeWidth={1.5} />
          <h1>Induction bench</h1>
          <span>magnet, coil & field</span>
        </div>
        <div className="status">
          <i className={running ? "status-dot" : "status-dot paused"} />
          <span>{status}</span>
        </div>
        <div className="top-actions">
          <span className="timer">t {r.time.toFixed(1)} s</span>
          <button
            onClick={pause}
            aria-label={running ? "Pause simulation" : "Resume simulation"}
            title="Space to pause / resume"
          >
            {running ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button
            onClick={reset}
            aria-label="Reset experiment"
            title="Reset experiment · R"
          >
            <RotateCcw size={15} />
          </button>
          <button
            ref={infoButton}
            onClick={() => setAbout(true)}
            aria-label="About the model and credits"
          >
            <Info size={16} />
          </button>
        </div>
      </header>
      <div className="workbench">
        <aside className="controls">
          <div className="panel-heading">
            <strong>Controls</strong>
            <span>EXPERIMENT 01</span>
          </div>
          <div className="experiment">
            <span className="selected-diamond">◆</span>
            <strong>Coil induction</strong>
            <span>FARADAY’S LAW</span>
          </div>
          <Section title="Magnet material">
            <div className="choice-grid material-grid">
              {Object.entries(MAGNETS).map(([key, m]) => (
                <button
                  key={key}
                  aria-label={`Magnet ${key}`}
                  aria-pressed={p.magnet === key}
                  className={p.magnet === key ? "chosen" : ""}
                  onClick={() => patch("magnet", key as Params["magnet"])}
                >
                  <small>{m.br.toFixed(2)} T</small>
                  <strong>{key}</strong>
                  <span>
                    {key === "SmCo"
                      ? "Sm₂Co₁₇"
                      : key === "C8"
                        ? "Ferrite"
                        : "NdFeB"}
                  </span>
                </button>
              ))}
            </div>
            <div className="micro-row">
              <span>{MAGNETS[p.magnet].name}</span>
              <span>
                Bᵣ <b>{MAGNETS[p.magnet].br.toFixed(2)} T</b>
              </span>
            </div>
            <div className="button-pair">
              <button
                className={swinging ? "active" : ""}
                aria-pressed={swinging}
                onClick={swing}
              >
                <span className="diamond">◆</span>
                {swinging ? "Swinging" : "Swing magnet"}
              </button>
              <button
                onClick={() => patch("polarity", -p.polarity)}
                aria-label="Flip magnet poles"
              >
                <ArrowLeftRight size={13} /> Flip poles
              </button>
            </div>
            <Slider
              label="Swing / drag speed"
              value={p.speed}
              min={0.1}
              max={1}
              step={0.01}
              unit=" m/s"
              onChange={(v) => patch("speed", v)}
              ends={["0.1", "", "1 m/s"]}
            />
          </Section>
          <Section title="Coil wire">
            <div className="choice-grid wire-grid">
              {Object.entries(WIRES).map(([key, m]) => (
                <button
                  key={key}
                  aria-label={`Wire ${m.name}`}
                  aria-pressed={p.wire === key}
                  className={p.wire === key ? "chosen" : ""}
                  onClick={() => patch("wire", key as Params["wire"])}
                >
                  <small>{(m.rho * 1e9).toFixed(1)} nΩm</small>
                  <strong>{key}</strong>
                  <span>{m.name}</span>
                </button>
              ))}
            </div>
            <div className="micro-row">
              <span>Wire Ø 0.5 mm</span>
              <span>
                R <b>{r.resistance.toFixed(2)} Ω</b>
              </span>
            </div>
            <Slider
              label="Turns"
              value={p.turns}
              min={50}
              max={400}
              step={10}
              onChange={(v) => patch("turns", v)}
            />
            <Slider
              label="Coil angle"
              value={p.angle}
              min={0}
              max={180}
              unit="°"
              onChange={(v) => patch("angle", v)}
              ends={["0°", "90°", "180°"]}
            />
            <div className="control-label">Core</div>
            <div className="button-pair">
              <button
                aria-pressed={!p.core}
                className={!p.core ? "active" : ""}
                onClick={() => patch("core", false)}
              >
                <span className="diamond">◆</span> Air
              </button>
              <button
                aria-pressed={p.core}
                className={p.core ? "active" : ""}
                onClick={() => patch("core", true)}
              >
                <span className="diamond">◆</span> Soft iron
              </button>
            </div>
          </Section>
          <Section title="Battery">
            <Slider
              label="Voltage"
              value={p.battery}
              min={-12}
              max={12}
              step={0.5}
              unit=" V"
              onChange={(v) => patch("battery", v)}
              ends={["−12", "0", "+12 V"]}
            />
            <div className="micro-row">
              <span>Series circuit · 1 Ω meter</span>
              <button
                className="text-button"
                onClick={() => patch("battery", 0)}
              >
                Disconnect
              </button>
            </div>
          </Section>
          <div className="control-foot">
            <span className="serial">IB—01 / FIELD NOTES</span>
            <button
              className="export-button"
              onClick={exportCSV}
              disabled={history.current.length === 0}
            >
              <Download size={13} /> Export readings
            </button>
          </div>
        </aside>
        <section className="scene-panel">
          <div className="scene-toolbar">
            <div>
              <b>01</b>
              <span> Field of the magnet & coil</span>
            </div>
            <div className="camera-buttons">
              {(["Angled", "Side", "Top", "Along axis"] as CameraView[]).map(
                (v) => (
                  <button
                    key={v}
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                  >
                    {v}
                  </button>
                ),
              )}
            </div>
          </div>
          <Scene
            p={p}
            r={r}
            fieldLines={fieldLines}
            reduced={reduced}
            view={view}
            resetKey={resetKey}
            onMove={move}
            demoFrame={replayMode ? demoFrame : undefined}
            demoDrag={replayMode && demoFrame >= 60 && demoFrame < 270}
          />
          {replayMode && <div className="demo-caption" aria-live="off">
            <span>SCRIPTED REPLAY · SHARED LIVE MODEL</span>
            <h2>{demoCaption(demoFrame)[0]}</h2>
            <p>{demoCaption(demoFrame)[1]}</p>
            <div className="demo-progress"><i style={{width: `${demoFrame / DEMO_FRAMES * 100}%`}} /></div>
            <span className="sr-only">Frame {demoFrame} of {DEMO_FRAMES}. Press period to advance in frame mode. Click any experiment control to exit replay.</span>
          </div>}
          <div className="scene-annotation">
            <span className="field-dot" /> LIVE FIELD STUDY <span>·</span>{" "}
            <span>
              {p.magnet} / {p.turns} TURNS
            </span>
          </div>
          <div className="scene-bottom">
            <div className="field-legend">
              <span>
                <b>|B|</b> relative field · schematic
              </span>
              <i />
              <div>
                <span>weak</span>
                <span>strong</span>
              </div>
            </div>
            <div className="scene-options">
              <button
                aria-pressed={fieldLines}
                onClick={() => setFieldLines((v) => !v)}
              >
                {fieldLines ? "Hide" : "Show"} field lines
              </button>
              <button
                aria-label="Reset camera"
                title="Reset camera"
                onClick={() => {
                  setView("Angled");
                  setResetKey((k) => k + 1);
                }}
              >
                <Maximize2 size={13} />
              </button>
            </div>
          </div>
          <div className="scene-hint">
            drag magnet to move <span>·</span> drag space to orbit{" "}
            <span>·</span> scroll to zoom
          </div>
          <div className="position-control">
            <label htmlFor="position">MAGNET POSITION</label>
            <input
              id="position"
              aria-label="Magnet position"
              type="range"
              min="-15"
              max="15"
              step=".5"
              value={
                state.current.swinging ? r.x * 100 : state.current.target * 100
              }
              onChange={(e) => move(Number(e.target.value) / 100)}
            />
            <output>{signed(r.x * 100, 1)} cm</output>
          </div>
        </section>
        <aside className="instruments">
          <Meter current={r.current} />
          <div className="metrics">
            <Metric
              label="Induced EMF"
              value={signed(r.emf * 1000, 2)}
              unit="mV"
              note={`flux ${(r.flux * 1e6).toFixed(1)} µWb`}
              color="green"
            />
            <Metric
              label="Current"
              value={signed(r.current * 1000, 1)}
              unit="mA"
              note={`battery ${(r.batteryCurrent * 1000).toFixed(0)} mA`}
              color="amber"
            />
            <Metric
              label="Coil field, center"
              value={signed(r.field * 1000, 2)}
              unit="mT"
              note={`${p.turns} turns · ${p.core ? "iron" : "air"} core`}
            />
            <Metric
              label="Force on magnet"
              value={(Math.abs(r.force) * 1000).toFixed(2)}
              unit="mN"
              note={
                Math.abs(r.force) < 0.00001
                  ? "No measurable force"
                  : r.force * r.x < 0
                    ? "toward the coil"
                    : "away from the coil"
              }
            />
          </div>
          <section className="apparatus">
            <div className="panel-heading">
              <strong>Apparatus</strong>
              <span>as modeled</span>
            </div>
            <dl>
              <dt>Magnet</dt>
              <dd>Ø 12 × 25 mm</dd>
              <dt>Remanence</dt>
              <dd>{MAGNETS[p.magnet].br.toFixed(2)} T</dd>
              <dt>Coil bore</dt>
              <dd>30 mm</dd>
              <dt>Winding</dt>
              <dd>
                {p.turns} turns, {r.layers} layers
              </dd>
              <dt>Wire length</dt>
              <dd>
                {WIRES[p.wire].name}, {r.length.toFixed(1)} m
              </dd>
              <dt>Resistance</dt>
              <dd>{r.resistance.toFixed(2)} Ω + 1 Ω meter</dd>
              <dt>Inductance¹</dt>
              <dd>{(r.inductance * 1000).toFixed(2)} mH</dd>
              <dt>Resistive power</dt>
              <dd>{r.power.toFixed(2)} W</dd>
            </dl>
            <div className="formula">
              <span>FARADAY’S LAW</span>
              <strong>ε = −dΛ / dt</strong>
              <p>
                The faster the flux changes,
                <br />
                the greater the induced voltage.
              </p>
            </div>
            <button className="model-link" onClick={() => setAbout(true)}>
              Explore the model <ChevronRight size={13} />
            </button>
          </section>
        </aside>
        <section className="graphs">
          <Scope history={history.current} paused={!running} />
          <FluxChart p={p} r={r} />
        </section>
      </div>
      <footer className="page-footer">
        <span>
          Independent reconstruction · inspired by{" "}
          <a
            href="https://x.com/thebuggeddev/status/2104402407358919124"
            target="_blank"
            rel="noreferrer"
          >
            The Bugged Dev ↗
          </a>
        </span>
        <span>
          <a href="?replay=1">40-second guided demo</a><span className="footer-dot">·</span>{" "}
          Simplified educational model <span className="footer-dot">·</span>{" "}
          <button onClick={() => setReduced((v) => !v)} aria-pressed={reduced}>
            {reduced ? "Reduced motion on" : "Reduce motion"}
          </button>
        </span>
      </footer>
      <div className="sr-only" role="status">
        {notice}
      </div>
      {notice && (
        <div className="toast" aria-hidden="true">
          {notice}
        </div>
      )}
      <dialog
        ref={modal}
        onCancel={() => setAbout(false)}
        onClick={(e) => {
          if (e.target === modal.current) setAbout(false);
        }}
      >
        <button
          className="dialog-close"
          aria-label="Close model notes"
          onClick={() => setAbout(false)}
        >
          <X size={20} />
        </button>
        <div className="eyebrow">INDUCTION BENCH / MODEL NOTES</div>
        <h2>
          A small experiment.
          <br />A fundamental law.
        </h2>
        <p>
          Move a magnet through a coil and watch a changing magnetic flux
          generate an electrical signal. Reverse the poles, change the winding,
          or apply a battery to explore the same circuit.
        </p>
        <h3>One deterministic model</h3>
        <p>
          Flux linkage: Λ = s · N · Bᵣ · 7 × 10⁻⁶ · k · cos(θ) / [1 + (x /
          0.038)²]³ᐟ². We calculate ε = −(∂Λ/∂x)v, I = (Vbattery + ε)/(Rwire + 1
          Ω), and F = I(∂Λ/∂x). The graphs, meter, field estimate and force
          arrow use these values.
        </p>
        <p>
          This is a simplified, quasi-static teaching model, not an engineering
          solver. Soft iron applies a fixed 3× coupling factor. Magnet motion is
          prescribed; force does not accelerate it. Parameter edits are
          quasi-static and do not add transient spikes. ¹ Inductance is an
          estimate only: RL transients, heating, saturation and eddy currents
          are omitted. Field paths illustrate dipole topology and relative
          strength; they are not a numerical field solution.
        </p>
        <h3>Controls & access</h3>
        <p>
          Drag the magnet or use its position slider. Arrow keys on sliders
          change values. With the page focused, ← / → move the magnet, Space
          pauses, and R resets. Drag empty space to rotate; scroll to zoom.
          Reduced motion stops decorative field particles; manual and requested
          swing motion stay functional.
        </p>
        <h3>Source & independence</h3>
        <p>
          Original concept and visual reference:{" "}
          <a
            href="https://x.com/thebuggeddev/status/2104402407358919124"
            target="_blank"
            rel="noreferrer"
          >
            The Bugged Dev’s Induction bench
          </a>
          , featured in{" "}
          <a
            href="https://x.com/claudeai/status/2111177840326832573"
            target="_blank"
            rel="noreferrer"
          >
            Claude’s project showcase
          </a>
          . Independently written React / Three.js implementation with
          procedural geometry. No affiliation or endorsement by the original
          creator or Anthropic.
        </p>
        <button className="dialog-done" onClick={() => setAbout(false)}>
          Back to the experiment <ChevronRight size={16} />
        </button>
      </dialog>
    </main>
  );
}
