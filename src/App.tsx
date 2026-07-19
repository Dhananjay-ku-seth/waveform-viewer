import { useMemo, useState } from "react";
import { PRESETS, clockSignal, type Bit, type Signal } from "./waveforms";
import AuthPanel from "./AuthPanel";
import SavePreset, { type WaveformConfig } from "./SavePreset";
import { useProfile } from "./useProfile";
import { exportPng, exportSvg, exportVcd } from "./export";

const CELL_W = 46;
const LANE_H = 44;
const HIGH_Y = 10;
const LOW_Y = 32;

function stepPath(bits: Bit[]): string {
  if (bits.length === 0) return "";
  const y0 = bits[0] ? HIGH_Y : LOW_Y;
  let d = `M 0 ${y0}`;
  for (let i = 1; i < bits.length; i++) {
    const x = i * CELL_W;
    const prevY = bits[i - 1] ? HIGH_Y : LOW_Y;
    const y = bits[i] ? HIGH_Y : LOW_Y;
    d += ` L ${x} ${prevY}`;
    if (y !== prevY) d += ` L ${x} ${y}`;
  }
  d += ` L ${bits.length * CELL_W} ${bits[bits.length - 1] ? HIGH_Y : LOW_Y}`;
  return d;
}

function Lane({ sig, editable, onToggle, onRemove }: {
  sig: Signal; editable?: boolean; onToggle?: (i: number) => void; onRemove?: () => void;
}) {
  const w = sig.bits.length * CELL_W;
  const color = sig.group === "clock" ? "#94a3b8" : sig.group === "input" ? "#fb923c"
    : sig.group === "custom" ? "#34d399" : "#818cf8";
  return (
    <div className="lane">
      <span className={"lane-name" + (editable ? " editable" : "")}>
        {sig.name}
        {onRemove && <button className="lane-del" onClick={onRemove} title="Remove signal">✕</button>}
      </span>
      <svg width={w} height={LANE_H} className="lane-svg">
        {sig.bits.map((_, i) => (
          <line key={i} x1={i * CELL_W} y1={0} x2={i * CELL_W} y2={LANE_H} className="gridline" />
        ))}
        <path d={stepPath(sig.bits)} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
        {editable &&
          sig.bits.map((_, i) => (
            <rect key={i} x={i * CELL_W} y={0} width={CELL_W} height={LANE_H}
              fill="transparent" className="hit" onClick={() => onToggle?.(i)} />
          ))}
      </svg>
    </div>
  );
}

type CustomSignal = { id: string; name: string; bits: Bit[] };
let customCounter = 1;

export default function App() {
  const { isPro } = useProfile();
  const [presetId, setPresetId] = useState("dff");
  const [cycles, setCycles] = useState(12);
  const [control, setControl] = useState<Bit[]>(() => Array(12).fill(0) as Bit[]);
  const [customSignals, setCustomSignals] = useState<CustomSignal[]>([]);
  const [addingSignal, setAddingSignal] = useState(false);
  const [newSignalName, setNewSignalName] = useState("");

  const preset = PRESETS.find((p) => p.id === presetId)!;
  const clk = useMemo(() => clockSignal(cycles), [cycles]);
  const signals = useMemo(() => preset.compute(control, cycles), [preset, control, cycles]);
  const allSignals: Signal[] = useMemo(
    () => [clk, ...signals, ...customSignals.map((c) => ({ name: c.name, bits: c.bits, group: "custom" as const }))],
    [clk, signals, customSignals]
  );

  function selectPreset(id: string) {
    setPresetId(id);
    setControl(Array(cycles).fill(0) as Bit[]);
  }
  function setCycleCount(n: number) {
    setCycles(n);
    setControl((c) => {
      const next = c.slice(0, n);
      while (next.length < n) next.push(0);
      return next as Bit[];
    });
    setCustomSignals((cs) => cs.map((c) => {
      const next = c.bits.slice(0, n);
      while (next.length < n) next.push(0 as Bit);
      return { ...c, bits: next };
    }));
  }
  function toggle(i: number) {
    setControl((c) => { const next = [...c]; next[i] = next[i] ? 0 : 1; return next as Bit[]; });
  }
  function toggleCustom(id: string, i: number) {
    setCustomSignals((cs) => cs.map((c) => {
      if (c.id !== id) return c;
      const next = [...c.bits];
      next[i] = next[i] ? 0 : 1;
      return { ...c, bits: next as Bit[] };
    }));
  }
  function randomize() {
    setControl(Array.from({ length: cycles }, () => (Math.random() > 0.5 ? 1 : 0)) as Bit[]);
  }
  function clearAll() {
    setControl(Array(cycles).fill(0) as Bit[]);
  }
  function addCustomSignal(e?: React.FormEvent) {
    e?.preventDefault();
    const name = newSignalName.trim() || `SIG${customCounter}`;
    customCounter += 1;
    setCustomSignals((cs) => [...cs, { id: `cs${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name, bits: Array(cycles).fill(0) as Bit[] }]);
    setNewSignalName("");
    setAddingSignal(false);
  }
  function removeCustomSignal(id: string) {
    setCustomSignals((cs) => cs.filter((c) => c.id !== id));
  }

  const width = cycles * CELL_W;

  return (
    <div className="app">
      <header>
        <div className="mark">⧉</div>
        <div>
          <h1>WAVEFORM VIEWER</h1>
          <p>Verilog-style timing diagrams · click cells to drive the input · every register updates live</p>
        </div>
        <div className="badges">
          <AuthPanel />
          <div className="badge-links">
            <a className="labbench-badge" href="https://labbench-hub.vercel.app/" target="_blank" rel="noopener noreferrer">⚡ LabBench</a>
            <a className="src" href="https://dhananjay-kumar-seth.vercel.app/" target="_blank" rel="noopener noreferrer">ECE Portfolio · Dhananjay Seth</a>
          </div>
        </div>
      </header>

      <div className="savebar">
        <SavePreset
          config={{ presetId, cycles, control, customSignals }}
          onLoad={(c: WaveformConfig) => {
            setPresetId(c.presetId); setCycles(c.cycles); setControl(c.control);
            setCustomSignals(c.customSignals ?? []);
          }}
        />
      </div>

      <div className="panel">
        <div className="seg">
          {PRESETS.map((p) => (
            <button key={p.id} className={p.id === presetId ? "on" : ""} onClick={() => selectPreset(p.id)}>{p.name}</button>
          ))}
        </div>
        <p className="desc">{preset.description}</p>

        <div className="row">
          <label className="cycles">
            Cycles
            <input type="range" min={6} max={20} value={cycles} onChange={(e) => setCycleCount(parseInt(e.target.value))} />
            <span>{cycles}</span>
          </label>
          <button className="ghost" onClick={randomize}>🎲 Randomize {preset.controlName}</button>
          <button className="ghost" onClick={clearAll}>↺ Clear</button>
        </div>

        <p className="hint-line">{preset.controlLabel}</p>

        <div className="scope-wrap">
          <div className="scope" style={{ width }}>
            <Lane sig={clk} />
            {signals.map((s) => (
              <Lane key={s.name} sig={s} editable={s.editable} onToggle={s.editable ? toggle : undefined} />
            ))}
            {customSignals.map((c) => (
              <Lane key={c.id} sig={{ name: c.name, bits: c.bits, group: "custom", editable: true }}
                editable onToggle={(i) => toggleCustom(c.id, i)} onRemove={() => removeCustomSignal(c.id)} />
            ))}
            <div className="ruler" style={{ width }}>
              {Array.from({ length: cycles }).map((_, i) => (
                <span key={i} style={{ left: i * CELL_W + CELL_W / 2 }}>{i}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isPro ? (
        <div className="pro-strip pro-tools">
          {addingSignal ? (
            <form className="signal-name-form" onSubmit={addCustomSignal}>
              <input autoFocus value={newSignalName} onChange={(e) => setNewSignalName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setAddingSignal(false); }}
                placeholder="Signal name" />
              <button type="submit" className="ghost on">✓</button>
              <button type="button" className="ghost" onClick={() => setAddingSignal(false)}>✕</button>
            </form>
          ) : (
            <button className="ghost" onClick={() => setAddingSignal(true)}>+ Add Signal</button>
          )}
          <span className="strip-sep" />
          <button className="ghost" onClick={() => exportPng(allSignals, cycles)}>⬇ PNG</button>
          <button className="ghost" onClick={() => exportSvg(allSignals, cycles)}>⬇ SVG</button>
          <button className="ghost" onClick={() => exportVcd(allSignals, cycles)}>⬇ VCD</button>
        </div>
      ) : (
        <div className="pro-strip">
          <span>🔒 Export as PNG / SVG / VCD, add custom signals — <b>LabBench Pro</b> feature.</span>
          <a href="https://logic-circuit-sim.vercel.app/" target="_blank" rel="noopener noreferrer">Upgrade to Pro →</a>
        </div>
      )}

      <footer>Positive-edge-triggered register model, computed from scratch — no EDA/waveform libraries.</footer>
    </div>
  );
}
