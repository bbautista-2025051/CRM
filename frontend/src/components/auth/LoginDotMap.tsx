import { useEffect, useRef } from 'react';
import { useTheme } from '@/providers/ThemeProvider';

type Dot = { x: number; y: number; radius: number; opacity: number };

const LANDMASSES = [
  { cx: 0.17, cy: 0.29, rx: 0.105, ry: 0.135 },
  { cx: 0.11, cy: 0.16, rx: 0.06, ry: 0.05 },
  { cx: 0.23, cy: 0.44, rx: 0.035, ry: 0.055 },
  { cx: 0.29, cy: 0.65, rx: 0.06, ry: 0.16 },
  { cx: 0.32, cy: 0.12, rx: 0.055, ry: 0.05 },
  { cx: 0.48, cy: 0.28, rx: 0.065, ry: 0.075 },
  { cx: 0.53, cy: 0.55, rx: 0.085, ry: 0.17 },
  { cx: 0.6, cy: 0.39, rx: 0.05, ry: 0.05 },
  { cx: 0.68, cy: 0.32, rx: 0.15, ry: 0.135 },
  { cx: 0.76, cy: 0.47, rx: 0.05, ry: 0.04 },
  { cx: 0.83, cy: 0.7, rx: 0.07, ry: 0.06 },
] as const;

const ROUTES = [
  { from: [0.2, 0.36], to: [0.47, 0.29], delay: 0, duration: 2.4 },
  { from: [0.47, 0.29], to: [0.68, 0.31], delay: 1.5, duration: 2.6 },
  { from: [0.12, 0.22], to: [0.29, 0.64], delay: 0.6, duration: 3 },
  { from: [0.78, 0.31], to: [0.53, 0.56], delay: 1.1, duration: 2.8 },
  { from: [0.83, 0.7], to: [0.68, 0.32], delay: 2.4, duration: 2.8 },
] as const;

const isLand = (x: number, y: number) =>
  LANDMASSES.some(({ cx, cy, rx, ry }) => {
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    return dx * dx + dy * dy <= 1;
  });

const generateDots = (width: number, height: number): Dot[] => {
  const dots: Dot[] = [];
  const gap = width < 360 ? 10 : 13;
  const radius = width < 360 ? 0.9 : 1.05;

  for (let x = gap / 2; x < width; x += gap) {
    for (let y = gap / 2; y < height; y += gap) {
      if (!isLand(x / width, y / height) || Math.random() < 0.22) continue;
      dots.push({ x, y, radius, opacity: 0.22 + Math.random() * 0.55 });
    }
  }
  return dots;
};

export const LoginDotMap = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolved } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !host || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const palette =
      resolved === 'dark'
        ? { dot: '96, 165, 250', line: '#60a5fa', start: '#93c5fd' }
        : { dot: '37, 99, 235', line: '#2563eb', start: '#1d4ed8' };

    let frame = 0;
    let startTime = performance.now();
    let width = 0;
    let height = 0;
    let dotsLayer: HTMLCanvasElement | null = null;
    let disposed = false;

    const build = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const layer = document.createElement('canvas');
      layer.width = canvas.width;
      layer.height = canvas.height;
      const layerCtx = layer.getContext('2d');
      if (!layerCtx) return;
      layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      for (const dot of generateDots(width, height)) {
        layerCtx.beginPath();
        layerCtx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        layerCtx.fillStyle = `rgba(${palette.dot}, ${dot.opacity})`;
        layerCtx.fill();
      }
      dotsLayer = layer;
    };

    const paint = (elapsed: number) => {
      ctx.clearRect(0, 0, width, height);
      if (dotsLayer) ctx.drawImage(dotsLayer, 0, 0, width, height);

      for (const route of ROUTES) {
        const progress = reduceMotion
          ? 1
          : Math.min(Math.max((elapsed - route.delay) / route.duration, 0), 1);
        if (progress <= 0) continue;

        const startX = route.from[0] * width;
        const startY = route.from[1] * height;
        const endX = route.to[0] * width;
        const endY = route.to[1] * height;
        const x = startX + (endX - startX) * progress;
        const y = startY + (endY - startY) * progress;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = palette.line;
        ctx.globalAlpha = 0.75;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.beginPath();
        ctx.arc(startX, startY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = palette.start;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${palette.dot}, 0.18)`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 2.8, 0, Math.PI * 2);
        ctx.fillStyle = palette.line;
        ctx.fill();

        if (progress === 1) {
          ctx.beginPath();
          ctx.arc(endX, endY, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = palette.start;
          ctx.fill();
        }
      }
    };

    const loop = () => {
      if (disposed) return;
      const elapsed = (performance.now() - startTime) / 1000;
      paint(elapsed);
      if (elapsed > 11) startTime = performance.now();
      frame = requestAnimationFrame(loop);
    };

    build();
    paint(0);
    if (!reduceMotion) frame = requestAnimationFrame(loop);

    const observer = new ResizeObserver(() => {
      build();
      paint(reduceMotion ? 1 : (performance.now() - startTime) / 1000);
    });
    observer.observe(host);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [resolved]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />;
};
