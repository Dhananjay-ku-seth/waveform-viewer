// ============================================================================
// Timing-diagram engine. Time is modeled in discrete cells (0..N-1); one clock
// cycle is two cells (low, then high). Every signal holds one value per cell.
// Registered signals only change at rising clock edges (start of odd cells),
// capturing the value the input had just before the edge: classic
// positive-edge-triggered behaviour.
// ============================================================================

export type Bit = 0 | 1;

// The clock is low in even cells and high in odd cells, so a rising edge happens at the start of every odd cell.
// Registers may only change there; in every other cell they hold their value.
const isRising = (i: number) => i % 2 === 1;
export type Signal = { name: string; bits: Bit[]; editable?: boolean; group?: "input" | "output" | "clock" | "custom" };

export type Preset = {
  id: string;
  name: string;
  description: string;
  controlName: string;       // the editable input row's name (e.g. "D", "SIN", "RESET")
  controlLabel: string;      // helper text shown near the control row
  compute: (control: Bit[], cycles: number) => Signal[];
};

export const PRESETS: Preset[] = [
  {
    id: "dff",
    name: "D Flip-Flop",
    description: "Positive-edge-triggered D flip-flop. Q captures D at every rising clock edge.",
    controlName: "D",
    controlLabel: "Click a cell to set D high/low. Q samples D at each rising clock edge (every other cell).",
    compute: (control, n) => {
      const q: Bit[] = Array(n).fill(0);
      for (let i = 1; i < n; i++) q[i] = isRising(i) ? control[i - 1] : q[i - 1];
      const qn: Bit[] = q.map((b) => (b ? 0 : 1)) as Bit[];
      return [
        { name: "D", bits: control, editable: true, group: "input" },
        { name: "Q", bits: q, group: "output" },
        { name: "Q'", bits: qn, group: "output" },
      ];
    },
  },
  {
    id: "tff",
    name: "Clock Divider (T Flip-Flop)",
    description: "Q toggles on every rising edge, dividing the clock frequency by 2. RESET forces Q low.",
    controlName: "RESET",
    controlLabel: "Click a cell to assert synchronous RESET. It takes effect at the next rising clock edge.",
    compute: (control, n) => {
      const q: Bit[] = Array(n).fill(0);
      for (let i = 1; i < n; i++) q[i] = !isRising(i) ? q[i - 1] : control[i - 1] ? 0 : ((q[i - 1] ? 0 : 1) as Bit);
      return [
        { name: "RESET", bits: control, editable: true, group: "input" },
        { name: "Q (÷2)", bits: q, group: "output" },
      ];
    },
  },
  {
    id: "counter",
    name: "4-Bit Synchronous Counter",
    description: "Q3..Q0 count 0000→1111 in binary, one increment per rising edge. RESET clears the count.",
    controlName: "RESET",
    controlLabel: "Click a cell to reset the counter to 0000 at the next rising clock edge.",
    compute: (control, n) => {
      const count: number[] = Array(n).fill(0);
      for (let i = 1; i < n; i++) count[i] = !isRising(i) ? count[i - 1] : control[i - 1] ? 0 : (count[i - 1] + 1) % 16;
      const bitOf = (v: number, b: number): Bit => (((v >> b) & 1) as Bit);
      return [
        { name: "RESET", bits: control, editable: true, group: "input" },
        { name: "Q3", bits: count.map((v) => bitOf(v, 3)), group: "output" },
        { name: "Q2", bits: count.map((v) => bitOf(v, 2)), group: "output" },
        { name: "Q1", bits: count.map((v) => bitOf(v, 1)), group: "output" },
        { name: "Q0", bits: count.map((v) => bitOf(v, 0)), group: "output" },
      ];
    },
  },
  {
    id: "shift",
    name: "4-Bit Shift Register",
    description: "Serial-in, parallel-out. SIN shifts into Q0, then Q1, Q2, Q3 on each successive edge.",
    controlName: "SIN",
    controlLabel: "Click a cell to set the serial input. It shifts in at each rising clock edge (every other cell).",
    compute: (control, n) => {
      const q0: Bit[] = Array(n).fill(0);
      const q1: Bit[] = Array(n).fill(0);
      const q2: Bit[] = Array(n).fill(0);
      const q3: Bit[] = Array(n).fill(0);
      for (let i = 1; i < n; i++) {
        if (!isRising(i)) { q0[i] = q0[i - 1]; q1[i] = q1[i - 1]; q2[i] = q2[i - 1]; q3[i] = q3[i - 1]; continue; }
        q0[i] = control[i - 1];
        q1[i] = q0[i - 1];
        q2[i] = q1[i - 1];
        q3[i] = q2[i - 1];
      }
      return [
        { name: "SIN", bits: control, editable: true, group: "input" },
        { name: "Q0", bits: q0, group: "output" },
        { name: "Q1", bits: q1, group: "output" },
        { name: "Q2", bits: q2, group: "output" },
        { name: "Q3", bits: q3, group: "output" },
      ];
    },
  },
];

export function clockSignal(cycles: number): Signal {
  const bits: Bit[] = Array.from({ length: cycles }, (_, i) => (i % 2 === 0 ? 0 : 1)) as Bit[];
  return { name: "CLK", bits, group: "clock" };
}
