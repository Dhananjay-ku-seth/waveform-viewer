# Waveform Viewer

**Verilog-style timing diagrams — click a cell, watch every register update live.**

Part of the [LabBench](https://labbench-hub.vercel.app/) suite of interactive engineering tools.

**Live demo:** _add your Vercel URL here_

## What it does

Pick a classic sequential circuit — a D flip-flop, a clock-divider (T flip-flop), a 4-bit synchronous
counter, or a 4-bit shift register — and drive its input by clicking directly on the timing diagram.
Every derived register (Q, Q3..Q0, etc.) recomputes instantly, modeled as genuine positive-edge-triggered
logic: a register's output changes exactly one clock period after the input that caused it, exactly like
real hardware.

- **D Flip-Flop** — Q captures D at the next rising edge.
- **Clock Divider** — Q toggles every rising edge (÷2), with a synchronous RESET input.
- **4-Bit Counter** — Q3..Q0 count 0000→1111 in proper binary ripple order.
- **4-Bit Shift Register** — SIN shifts serially through Q0→Q1→Q2→Q3.

## Tech

React + TypeScript + Vite. The register/timing model and the SVG waveform renderer are both written from
scratch — no EDA or waveform libraries.

## Run locally
```sh
npm install
npm run dev
```

_Built by Dhananjay Kumar Seth — part of [LabBench](https://labbench-hub.vercel.app/)._
