import type { Signal } from "./waveforms";

const CELL_W = 46;
const LANE_H = 44;
const LABEL_W = 74;
const HIGH_Y = 10;
const LOW_Y = 32;
const RULER_H = 24;
const BG = "#0a0908";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function colorFor(sig: Signal): string {
  if (sig.group === "clock") return "#94a3b8";
  if (sig.group === "input") return "#fb923c";
  if (sig.group === "output") return "#818cf8";
  return "#34d399"; // custom
}

function stepPath(bits: Signal["bits"], xOff: number, yOff: number): string {
  if (bits.length === 0) return "";
  const y0 = yOff + (bits[0] ? HIGH_Y : LOW_Y);
  let d = `M ${xOff} ${y0}`;
  for (let i = 1; i < bits.length; i++) {
    const x = xOff + i * CELL_W;
    const prevY = yOff + (bits[i - 1] ? HIGH_Y : LOW_Y);
    const y = yOff + (bits[i] ? HIGH_Y : LOW_Y);
    d += ` L ${x} ${prevY}`;
    if (y !== prevY) d += ` L ${x} ${y}`;
  }
  d += ` L ${xOff + bits.length * CELL_W} ${yOff + (bits[bits.length - 1] ? HIGH_Y : LOW_Y)}`;
  return d;
}

function buildCompositeSvgString(allSignals: Signal[], cycles: number): string {
  const width = LABEL_W + cycles * CELL_W + 8;
  const height = allSignals.length * LANE_H + RULER_H + 8;

  let body = "";
  allSignals.forEach((sig, idx) => {
    const yTop = idx * LANE_H;
    body += `<text x="4" y="${yTop + LANE_H / 2 + 4}" fill="#e2ddd6" font-family="ui-monospace,SFMono-Regular,monospace" font-size="12">${escapeXml(sig.name)}</text>`;
    for (let i = 0; i <= sig.bits.length; i++) {
      const x = LABEL_W + i * CELL_W;
      body += `<line x1="${x}" y1="${yTop}" x2="${x}" y2="${yTop + LANE_H}" stroke="#2a2420" stroke-width="1"/>`;
    }
    body += `<path d="${stepPath(sig.bits, LABEL_W, yTop)}" fill="none" stroke="${colorFor(sig)}" stroke-width="2.5" stroke-linejoin="round"/>`;
  });

  const rulerY = allSignals.length * LANE_H + 16;
  for (let i = 0; i < cycles; i++) {
    const x = LABEL_W + i * CELL_W + CELL_W / 2;
    body += `<text x="${x}" y="${rulerY}" fill="#8a8177" font-family="ui-monospace,monospace" font-size="10" text-anchor="middle">${i}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="${BG}"/>${body}</svg>`;
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportSvg(allSignals: Signal[], cycles: number) {
  download("labbench-waveform.svg", buildCompositeSvgString(allSignals, cycles), "image/svg+xml");
}

export function exportPng(allSignals: Signal[], cycles: number) {
  const svgStr = buildCompositeSvgString(allSignals, cycles);
  const svgBlob = new Blob([svgStr], { type: "image/svg+xml" });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth * scale;
    canvas.height = img.naturalHeight * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const durl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = durl;
      a.download = "labbench-waveform.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(durl);
    }, "image/png");
  };
  img.src = url;
}

const VCD_IDS = "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";

function vcdSafeName(name: string): string {
  return name.replace(/[^A-Za-z0-9_]/g, "_");
}

export function exportVcd(allSignals: Signal[], cycles: number) {
  const ids = allSignals.map((_, i) => VCD_IDS[i % VCD_IDS.length]);
  let out = `$timescale 10ns $end\n$scope module labbench $end\n`;
  allSignals.forEach((sig, i) => {
    out += `$var wire 1 ${ids[i]} ${vcdSafeName(sig.name)} $end\n`;
  });
  out += `$upscope $end\n$enddefinitions $end\n$dumpvars\n`;
  allSignals.forEach((sig, i) => { out += `${sig.bits[0]}${ids[i]}\n`; });
  out += `$end\n`;

  for (let t = 1; t < cycles; t++) {
    let changes = "";
    allSignals.forEach((sig, i) => {
      if (sig.bits[t] !== sig.bits[t - 1]) changes += `${sig.bits[t]}${ids[i]}\n`;
    });
    if (changes) out += `#${t * 10}\n${changes}`;
  }
  download("labbench-waveform.vcd", out, "text/plain");
}
