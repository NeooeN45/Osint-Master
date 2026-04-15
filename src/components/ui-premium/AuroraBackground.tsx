// ============================================================================
// AURORA BACKGROUND - Effet de fond dynamique type SaaS premium
// Inspiration: Linear, Vercel, Raycast
// ============================================================================

import { useEffect, useRef } from "react";
import { cn } from "../../lib/utils.ts";

interface AuroraBackgroundProps {
  children: React.ReactNode;
  className?: string;
  showRadialGradient?: boolean;
  colors?: string[];
}

export function AuroraBackground({
  children,
  className,
  showRadialGradient = true,
  colors = ["#0ea5e9", "#8b5cf6", "#ec4899"], // cyan, violet, pink
}: AuroraBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const drawAurora = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create gradient animation
      const gradient = ctx.createLinearGradient(
        0,
        Math.sin(time * 0.001) * 100,
        canvas.width,
        canvas.height + Math.cos(time * 0.001) * 100
      );

      colors.forEach((color, i) => {
        gradient.addColorStop(i / (colors.length - 1), color + Math.round(Math.sin(time * 0.0005 + i) * 20 + 20).toString(16).padStart(2, "0"));
      });

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add blur effect
      ctx.filter = "blur(120px)";

      time += 16;
      animationFrameId = requestAnimationFrame(drawAurora);
    };

    resize();
    window.addEventListener("resize", resize);
    drawAurora();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [colors]);

  return (
    <div className={cn("relative min-h-screen w-full overflow-hidden", className)}>
      {/* Aurora Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.4 }}
      />

      {/* Radial gradient overlay */}
      {showRadialGradient && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 50%, transparent 0%, #09090b 70%)",
          }}
        />
      )}

      {/* Noise texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
