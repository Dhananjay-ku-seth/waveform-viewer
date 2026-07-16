import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Waveform Viewer — Verilog-style timing diagrams (LabBench, portfolio demo)
export default defineConfig({
  server: { host: "::", port: 5186 },
  plugins: [react()],
});
