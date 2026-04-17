/**
 * Hero Section - Phase 2 UI v2
 * Design Google Dark Minimalist avec effet "wow"
 * 
 * Features:
 * - Gradient text animé (cyan → purple → rose)
 * - Particles subtiles en arrière-plan
 * - Glow effect derrière le titre
 * - CTA button avec glow cyan
 * - Animations Framer Motion
 * 
 * Créé: 17 Avril 2026 - Phase 2 UI
 */

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Shield, Zap } from 'lucide-react';

// Particule simple pour l'effet de fond
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

export function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | undefined>(undefined);

  // Initialisation des particules
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Créer 50 particules
    const particles: Particle[] = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.3 + 0.1,
      });
    }
    particlesRef.current = particles;

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        // Mettre à jour la position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Rebondir sur les bords
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // Dessiner la particule
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 240, 255, ${particle.opacity})`;
        ctx.fill();
      });

      // Dessiner les connexions entre particules proches
      particlesRef.current.forEach((p1, i) => {
        particlesRef.current.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(0, 240, 255, ${0.1 * (1 - distance / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Canvas pour les particules */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 opacity-40"
        style={{ pointerEvents: 'none' }}
      />

      {/* Glow effect derrière le texte */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-rose-500/20 blur-[150px] rounded-full animate-pulse" />
      </div>

      {/* Contenu principal */}
      <motion.div
        className="relative z-10 text-center px-4 max-w-5xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Badge */}
        <motion.div variants={itemVariants} className="mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/70">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>OPSEC Active • 1000+ Outils Intégrés</span>
          </span>
        </motion.div>

        {/* Titre principal avec gradient */}
        <motion.h1
          variants={itemVariants}
          className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
        >
          <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-rose-400 bg-clip-text text-transparent animate-gradient-x">
            OSINT MASTER
          </span>
        </motion.h1>

        {/* Sous-titre */}
        <motion.p
          variants={itemVariants}
          className="text-xl md:text-2xl text-white/60 mb-4 max-w-2xl mx-auto"
        >
          La plateforme d'investigation la plus complète du monde.
          <br />
          <span className="text-cyan-400">100% Open Source.</span>{' '}
          <span className="text-purple-400">Zero limites.</span>
        </motion.p>

        {/* Description */}
        <motion.p
          variants={itemVariants}
          className="text-base text-white/40 mb-10 max-w-xl mx-auto"
        >
          Investigation numérique de niveau étatique avec Tor + VPN, 
          IA embarquée, et corrélation automatique des données.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            className="bg-cyan-400 text-black hover:bg-cyan-300 px-8 py-4 text-lg font-semibold rounded-full transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,240,255,0.5)] group inline-flex items-center gap-2"
          >
            <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Lancer une Investigation
          </button>

          <button
            className="border border-white/20 text-white hover:bg-white/5 hover:border-white/40 px-8 py-4 text-lg rounded-full transition-all duration-300 inline-flex items-center gap-2"
          >
            <Zap className="w-5 h-5" />
            Explorer les Outils
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={itemVariants}
          className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto"
        >
          {[
            { value: '1000+', label: 'Outils', color: 'text-cyan-400' },
            { value: '500+', label: 'Sources', color: 'text-purple-400' },
            { value: '100%', label: 'Open Source', color: 'text-emerald-400' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className={`text-3xl md:text-4xl font-bold ${stat.color} mb-1`}>
                {stat.value}
              </div>
              <div className="text-sm text-white/40">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="flex flex-col items-center gap-2 text-white/30">
            <span className="text-xs uppercase tracking-widest">Scroll</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-5 h-8 border border-white/20 rounded-full flex justify-center pt-2"
            >
              <div className="w-1 h-2 bg-white/40 rounded-full" />
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* Gradient overlay bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </section>
  );
}

export default HeroSection;
