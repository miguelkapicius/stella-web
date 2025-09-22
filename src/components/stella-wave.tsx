import React, { useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Mic2 } from "lucide-react";

export interface StellaWaveOptions {
  amplitude?: number;
  speed?: number;
  frequency?: number;
  color?: string;
  lineWidth?: number;
  numberOfWaves?: number;
  peak?: number;
}

class StellaWaveCore {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private opts: Required<StellaWaveOptions>;
  private phase = 0;
  private rafId: number | null = null;
  private dpr =
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  private width = 0;
  private height = 0;

  constructor(canvas: HTMLCanvasElement, options?: StellaWaveOptions) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");

    this.canvas = canvas;
    this.ctx = ctx;
    this.opts = Object.assign(
      {
        amplitude: 0.6,
        speed: 0.02,
        frequency: 0.01,
        color: "#1e90ff",
        lineWidth: 2,
        numberOfWaves: 10,
        peak: 0.95,
      },
      options || {}
    );

    this.resize();
    window.addEventListener("resize", this.resizeBound);
  }

  private resizeBound = () => this.resize();

  private resize() {
    const { canvas, dpr } = this;
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width || canvas.clientWidth || 300;
    const cssH = rect.height || canvas.clientHeight || 100;
    this.width = Math.max(1, Math.floor(cssW * dpr));
    this.height = Math.max(1, Math.floor(cssH * dpr));
    canvas.width = this.width;
    canvas.height = this.height;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    this.ctx.scale(dpr, dpr);
  }

  start() {
    if (this.rafId != null) return;
    const loop = () => {
      this.phase += this.opts.speed;
      this.draw();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  setOptions(options: Partial<StellaWaveOptions>) {
    Object.assign(this.opts, options);
  }

  private clear() {
    const cssW = this.canvas.width / this.dpr;
    const cssH = this.canvas.height / this.dpr;
    this.ctx.clearRect(0, 0, cssW, cssH);
  }

  private draw() {
    const ctx = this.ctx;
    const { amplitude, frequency, color, lineWidth, numberOfWaves, peak } =
      this.opts;
    const cssW = this.canvas.width / this.dpr;
    const cssH = this.canvas.height / this.dpr;

    this.clear();
    const centerY = cssH / 2;

    for (let i = 0; i < numberOfWaves; i++) {
      const progress = 1 - i / numberOfWaves;
      const normAmplitude = amplitude * progress;
      const omega = frequency * (1 + i * 0.3);
      const lineAlpha = Math.max(0.08, 0.6 * progress);
      const offset = i * 0.5;

      ctx.beginPath();
      ctx.lineWidth = lineWidth * (1 + (1 - progress) * 0.5);
      ctx.lineCap = "round";

      if (i === 0) {
        const g = ctx.createLinearGradient(0, 0, cssW, 0);
        g.addColorStop(0, color);
        g.addColorStop(1, this.adjustAlpha(color, 0.65));
        ctx.strokeStyle = g as unknown as string;
      } else {
        ctx.strokeStyle = this.adjustAlpha(color, lineAlpha);
      }

      const step = Math.max(1, Math.round(cssW / 200));

      for (let x = 0; x <= cssW; x += step) {
        const relativeX = (x / cssW) * 2 - 1;
        const envelope =
          Math.pow(Math.max(0, 1 - Math.abs(relativeX)), 2) * peak;

        const y =
          centerY +
          ((normAmplitude * cssH) / 2) *
            envelope *
            Math.sin(x * omega + this.phase + offset);

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
    }
  }

  private adjustAlpha(color: string, alpha: number) {
    if (color[0] === "#") {
      let hex = color.slice(1);
      if (hex.length === 3)
        hex = hex
          .split("")
          .map((c) => c + c)
          .join("");
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    if (color.startsWith("rgb("))
      return color.replace("rgb(", "rgba(").replace(")", `,${alpha})`);
    return color;
  }

  destroy() {
    this.stop();
    window.removeEventListener("resize", this.resizeBound);
  }
}

// Componente React
export const StellaWave: React.FC<StellaWaveOptions> = (props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveRef = useRef<StellaWaveCore | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      waveRef.current = new StellaWaveCore(canvasRef.current, props);
      waveRef.current.start();
    }
    return () => {
      waveRef.current?.destroy();
      waveRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (waveRef.current) {
      waveRef.current.setOptions(props);
    }
  }, [props]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute left-0 bottom-1/3 w-screen h-40 flex items-center justify-center"
    />
  );
};
