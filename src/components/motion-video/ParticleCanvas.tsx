import React, { useEffect, useRef } from 'react';

interface ParticleCanvasProps {
  themeColor?: 'violet' | 'emerald' | 'amber' | 'indigo' | 'gold' | 'cyan';
  intensity?: number;
  showGrid?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  pulseSpeed: number;
}

const colorMaps = {
  violet: { primary: '139, 92, 246', accent: '168, 85, 247', glow: 'rgba(124, 58, 237, 0.15)' },
  emerald: { primary: '16, 185, 129', accent: '52, 211, 153', glow: 'rgba(5, 150, 105, 0.15)' },
  amber: { primary: '245, 158, 11', accent: '251, 191, 36', glow: 'rgba(217, 119, 6, 0.15)' },
  indigo: { primary: '99, 102, 241', accent: '129, 140, 248', glow: 'rgba(67, 56, 202, 0.15)' },
  gold: { primary: '234, 179, 8', accent: '250, 204, 21', glow: 'rgba(202, 138, 4, 0.18)' },
  cyan: { primary: '6, 182, 212', accent: '34, 211, 238', glow: 'rgba(8, 145, 178, 0.15)' },
};

export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({
  themeColor = 'violet',
  intensity = 1,
  showGrid = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    const count = Math.floor((width * height) / 14000) * intensity;
    const particles: Particle[] = [];

    for (let i = 0; i < Math.max(35, Math.min(count, 90)); i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.6 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      const color = colorMaps[themeColor] || colorMaps.violet;

      // Draw subtle perspective grid if enabled
      if (showGrid) {
        ctx.strokeStyle = `rgba(${color.primary}, 0.04)`;
        ctx.lineWidth = 1;
        const gridSize = 48;
        const offsetX = (time * 12) % gridSize;

        for (let x = offsetX; x < width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }

        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }

      // Draw and update particles
      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const currentAlpha = p.alpha + Math.sin(time * 3 + idx) * 0.15;
        const safeAlpha = Math.max(0.1, Math.min(currentAlpha, 0.9));

        // Draw particle
        ctx.fillStyle = `rgba(${color.accent}, ${safeAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Connect nearby particles
        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            const lineAlpha = (1 - dist / 110) * 0.25 * safeAlpha;
            ctx.strokeStyle = `rgba(${color.primary}, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [themeColor, intensity, showGrid]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none w-full h-full z-0 transition-opacity duration-1000"
    />
  );
};
