import { useEffect, useRef, useState, useCallback } from 'react';
import { animate, createTimeline, set, Timeline } from 'animejs';
import { FileText, ShieldCheck } from 'lucide-react';
import { DOCUMENTS } from '../constants/mockData';
import { calculateStackLayerTransform, STACK_CONSTRAINTS } from '../utils/layoutConstraints';

// Helper to calculate 3D transformation matrices per stack layer depth (0 = top, 4 = bottom)
const getLayerTransform = calculateStackLayerTransform;

export default function PaperStack() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stackWrapperRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shadowRef = useRef<HTMLDivElement>(null);

  // Maintain the virtual order of cards (indices 0..4)
  const [order, setOrder] = useState<number[]>([0, 1, 2, 3, 4]);
  const isShufflingRef = useRef(false);
  const animeTimelineRef = useRef<Timeline | null>(null);
  const shuffleTimerRef = useRef<number | null>(null);

  // 1. Autonomous Page Shuffle Loop (Self-running, No Controls)
  const triggerShuffle = useCallback(() => {
    if (isShufflingRef.current) return;
    isShufflingRef.current = true;

    setOrder((prevOrder) => {
      const currentCards = cardRefs.current;
      const topCardIndex = prevOrder[0];
      const topCardEl = currentCards[topCardIndex];

      if (!topCardEl) {
        isShufflingRef.current = false;
        return prevOrder;
      }

      // Rest of the cards
      const nextOrder = [...prevOrder.slice(1), prevOrder[0]];
      const tl = createTimeline({
        defaults: {
          ease: 'cubicBezier(0.05, 0.7, 0.1, 1)',
        },
        onComplete: () => {
          isShufflingRef.current = false;
        },
      });

      animeTimelineRef.current = tl;

      // Step 1: Top card peels up, elevates, slides gracefully within bounds
      tl.add(topCardEl, {
        translateX: 24,
        translateY: -40,
        translateZ: 85,
        rotateX: 14,
        rotateY: -10,
        rotateZ: 4,
        scale: 1.02,
        duration: 750,
        ease: 'cubicBezier(0.05, 0.7, 0.1, 1)',
      });

      // Step 2: Concurrently promote remaining cards forward in the stack
      nextOrder.slice(0, 4).forEach((idx, pos) => {
        const cardEl = currentCards[idx];
        if (cardEl) {
          const t = getLayerTransform(pos);
          tl.add(cardEl, {
            translateX: t.translateX,
            translateY: t.translateY,
            translateZ: t.translateZ,
            rotateX: t.rotateX,
            rotateY: t.rotateY,
            rotateZ: t.rotateZ,
            scale: t.scale,
            opacity: t.opacity,
            duration: 650,
            ease: 'cubicBezier(0.2, 0, 0, 1)',
          }, pos === 0 ? '-=500' : '<');
        }
      });

      // Step 3: Top card glides back and tucks behind the bottom of the stack
      const bottomTransform = getLayerTransform(4);
      tl.add(topCardEl, {
        translateX: bottomTransform.translateX,
        translateY: bottomTransform.translateY,
        translateZ: bottomTransform.translateZ,
        rotateX: bottomTransform.rotateX,
        rotateY: bottomTransform.rotateY,
        rotateZ: bottomTransform.rotateZ,
        scale: bottomTransform.scale,
        opacity: bottomTransform.opacity,
        duration: 700,
        ease: 'cubicBezier(0.05, 0.7, 0.1, 1)',
      }, '-=300');

      // Sync the ground shadow swell
      if (shadowRef.current) {
        animate(shadowRef.current, {
          scale: [1, 1.15, 1],
          opacity: [0.65, 0.45, 0.65],
          duration: 1200,
          ease: 'cubicBezier(0.2, 0, 0, 1)',
        });
      }

      return nextOrder;
    });
  }, []);

  const startAutonomousShuffle = useCallback(() => {
    if (shuffleTimerRef.current) clearInterval(shuffleTimerRef.current);
    // Shuffle automatically every 3.8 seconds with no user controls
    shuffleTimerRef.current = window.setInterval(() => {
      triggerShuffle();
    }, 3800);
  }, [triggerShuffle]);

  // 2. Initial Cascade Entrance & Ambient Float Setup
  useEffect(() => {
    const cards = cardRefs.current.filter(Boolean) as HTMLElement[];
    
    // Set initial 3D transform origin
    cards.forEach((card, idx) => {
      const transform = getLayerTransform(idx);
      set(card, {
        translateX: transform.translateX + 80,
        translateY: transform.translateY - 140,
        translateZ: transform.translateZ + 200,
        rotateX: transform.rotateX - 25,
        rotateY: transform.rotateY + 30,
        rotateZ: transform.rotateZ + 15,
        scale: 0.85,
        opacity: 0,
      });
    });

    if (shadowRef.current) {
      set(shadowRef.current, {
        opacity: 0,
        scale: 0.7,
      });
    }

    // Cascade entrance with anime.js v4
    cards.forEach((card, idx) => {
      const transform = getLayerTransform(idx);
      animate(card, {
        translateX: transform.translateX,
        translateY: transform.translateY,
        translateZ: transform.translateZ,
        rotateX: transform.rotateX,
        rotateY: transform.rotateY,
        rotateZ: transform.rotateZ,
        scale: transform.scale,
        opacity: transform.opacity,
        delay: idx * 120 + 200,
        duration: 1200,
        ease: 'cubicBezier(0.05, 0.7, 0.1, 1)',
        onComplete: idx === cards.length - 1 ? () => {
          startAutonomousShuffle();
        } : () => {},
      });
    });

    if (shadowRef.current) {
      animate(shadowRef.current, {
        opacity: 0.65,
        scale: 1,
        duration: 1400,
        delay: 300,
        ease: 'cubicBezier(0.05, 0.7, 0.1, 1)',
      });
    }

    // Ambient floating oscillation (continuous breathing motion)
    let floatAnim: ReturnType<typeof animate> | null = null;
    if (stackWrapperRef.current) {
      floatAnim = animate(stackWrapperRef.current, {
        translateY: ['-6px', '6px'],
        rotateZ: ['-0.5deg', '0.5deg'],
        duration: 3800,
        alternate: true,
        loop: true,
        ease: 'inOutSine',
      });
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (shuffleTimerRef.current) {
          clearInterval(shuffleTimerRef.current);
          shuffleTimerRef.current = null;
        }
        if (floatAnim) floatAnim.pause();
      } else {
        startAutonomousShuffle();
        if (floatAnim) floatAnim.play();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (floatAnim) floatAnim.pause();
      if (shuffleTimerRef.current) clearInterval(shuffleTimerRef.current);
    };
  }, [startAutonomousShuffle]);

  // 3. Smooth Mouse Ambient Parallax (Pure CSS/Anime spring responsiveness)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    animate(containerRef.current, {
      rotateY: x * 14,
      rotateX: -y * 12,
      duration: 600,
      ease: 'cubicBezier(0.05, 0.7, 0.1, 1)',
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!containerRef.current) return;
    animate(containerRef.current, {
      rotateY: 0,
      rotateX: 0,
      duration: 1000,
      ease: 'cubicBezier(0.175, 0.885, 0.32, 1.275)',
    });
  }, []);

  return (
    <div 
      className="relative w-full max-w-[380px] sm:max-w-[430px] lg:max-w-[460px] h-[410px] sm:h-[450px] lg:h-[480px] flex items-center justify-center select-none transform scale-[0.78] sm:scale-[0.86] md:scale-[0.92] lg:scale-[0.96] xl:scale-100 transition-transform origin-center"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: `${STACK_CONSTRAINTS.PERSPECTIVE_PX}px` }}
    >
      {/* Dynamic Ground Shadow */}
      <div
        ref={shadowRef}
        style={{ width: `${STACK_CONSTRAINTS.SHADOW_WIDTH_PX}px`, height: `${STACK_CONSTRAINTS.SHADOW_HEIGHT_PX}px` }}
        className="absolute bottom-6 rounded-full bg-black/35 dark:bg-black/70 blur-2xl pointer-events-none transform -rotate-6 preserve-3d"
      />

      {/* 3D Stack Container */}
      <div
        ref={containerRef}
        style={{ maxWidth: `${STACK_CONSTRAINTS.CARD_MAX_WIDTH_PX}px`, height: `${STACK_CONSTRAINTS.CARD_HEIGHT_PX}px` }}
        className="relative w-[min(88vw,350px)] preserve-3d"
      >
        <div 
          ref={stackWrapperRef} 
          className="relative w-full h-full preserve-3d"
        >
          {DOCUMENTS.map((doc, index) => {
            const currentPositionInStack = order.indexOf(index);
            const zIndex = 50 - currentPositionInStack * 10;

            return (
              <div
                key={doc.id}
                ref={(el) => { cardRefs.current[index] = el; }}
                className={`absolute inset-0 rounded-3xl bg-card dark:bg-[#181c1d] text-zinc-900 dark:text-zinc-100 border flex flex-col justify-between p-6 overflow-hidden backface-visible preserve-3d cursor-default transition-all duration-300 ${
                  currentPositionInStack === 0
                    ? 'border-accent/50 ring-1 ring-accent/30 shadow-[0_20px_50px_rgba(0,0,0,0.2),0_0_35px_rgba(129,211,224,0.18)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(129,211,224,0.18)]'
                    : 'border-border shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)]'
                }`}
                style={{
                  zIndex,
                  willChange: 'transform, opacity',
                  backgroundImage: 'radial-gradient(rgba(129, 211, 224, 0.05) 1px, transparent 0)',
                  backgroundSize: '16px 16px',
                }}
              >
                {/* Paper Top Bar / Header */}
                <div className="flex items-start justify-between border-b border-border pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-xl bg-accent text-[#00363d] flex items-center justify-center font-bold text-xs shadow-sm">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono font-bold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
                        {doc.type}
                      </div>
                      <div className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">
                        PAGES 01–{doc.pages.toString().padStart(2, '0')} • {doc.size}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[9px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${doc.badgeColor} flex items-center gap-1`}>
                    <ShieldCheck className="h-2.5 w-2.5" />
                    {doc.badge}
                  </span>
                </div>

                {/* Paper Body: Render Document Specific Mockup Elements */}
                <div className="flex-1 py-4 flex flex-col justify-between">
                  {/* Document Title Header */}
                  <div>
                    <h3 className="text-xs font-mono font-bold leading-snug tracking-tight text-zinc-900 dark:text-zinc-100 line-clamp-2">
                      {doc.title}
                    </h3>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
                      AUTHOR: {doc.author.toUpperCase()} • {doc.date}
                    </p>
                  </div>

                  {/* Document Custom Graphic Body depending on index */}
                  {index === 0 && (
                    <div className="my-2 p-2.5 rounded-xl bg-surface dark:bg-surface-container border border-border flex flex-col gap-2 font-mono">
                      <div className="flex items-center justify-between text-[9px] text-zinc-500">
                        <span>PIPELINE RENDER STATUS</span>
                        <span className="text-emerald-500 font-semibold">100% COMPILED</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-lowest dark:bg-surface-lowest rounded-full overflow-hidden border border-border/50">
                        <div className="h-full bg-emerald-500 rounded-full w-[88%]" />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[8.5px] text-zinc-600 dark:text-zinc-300">
                        <div className="p-1 rounded-lg bg-card dark:bg-[#181c1d] border border-border">
                          MEMORY: <strong className="text-zinc-900 dark:text-zinc-100">42.8 MB</strong>
                        </div>
                        <div className="p-1 rounded-lg bg-card dark:bg-[#181c1d] border border-border">
                          LAYERS: <strong className="text-zinc-900 dark:text-zinc-100">8 VECTORS</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {index === 1 && (
                    <div className="my-2 p-2.5 rounded-xl bg-surface dark:bg-surface-container border border-border flex flex-col gap-2 font-mono">
                      <div className="flex items-center justify-between text-[9px] text-zinc-500">
                        <span>AUDIT METRICS</span>
                        <span className="text-accent font-semibold">BALANCED</span>
                      </div>
                      <div className="flex items-end gap-1.5 h-10 pt-2 px-1">
                        <div className="flex-1 bg-accent/20 rounded-t h-[40%]" />
                        <div className="flex-1 bg-accent/40 rounded-t h-[65%]" />
                        <div className="flex-1 bg-accent/60 rounded-t h-[50%]" />
                        <div className="flex-1 bg-accent/80 rounded-t h-[85%]" />
                        <div className="flex-1 bg-accent rounded-t h-[100%]" />
                      </div>
                    </div>
                  )}

                  {index === 2 && (
                    <div className="my-2 p-2.5 rounded-xl bg-surface dark:bg-surface-container border border-border flex flex-col gap-1.5 font-mono text-[9px]">
                      <div className="flex items-center justify-between text-zinc-500">
                        <span>LEGAL JURISDICTION</span>
                        <span className="font-semibold text-rose-500">STRICT PRIVACY</span>
                      </div>
                      <div className="space-y-1 text-zinc-600 dark:text-zinc-400">
                        <p className="line-clamp-2 italic text-[8.5px] leading-tight">
                          "All in-memory vectors are executed in zero-telemetry hardware sandbox without external egress."
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <div className="h-4 w-12 bg-rose-500/20 rounded border border-rose-500/30 flex items-center justify-center text-[7px] text-rose-400 font-bold">
                          SEALED
                        </div>
                        <span className="text-[8px] text-zinc-400">SIGNATURE ID: 0x9F41E</span>
                      </div>
                    </div>
                  )}

                  {index === 3 && (
                    <div className="my-2 p-2.5 rounded-xl bg-surface dark:bg-surface-container border border-border flex flex-col gap-1 font-mono text-[9px]">
                      <div className="flex items-center justify-between text-zinc-500">
                        <span>CAD VECTOR GRID</span>
                        <span className="font-semibold text-accent">X: 1920 / Y: 1080</span>
                      </div>
                      <div className="h-9 w-full rounded-lg border border-dashed border-accent/40 relative flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-accent/5" />
                        <div className="h-6 w-6 rounded-full border border-accent/60 flex items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
                          <div className="h-1.5 w-1.5 rounded-full bg-accent absolute" />
                        </div>
                      </div>
                    </div>
                  )}

                  {index === 4 && (
                    <div className="my-2 p-2.5 rounded-xl bg-surface dark:bg-surface-container border border-border flex flex-col gap-1.5 font-mono text-[9px]">
                      <div className="flex items-center justify-between text-zinc-500">
                        <span>TYPOGRAPHY SYSTEM</span>
                        <span className="text-tertiary font-semibold">GEIST / PLUS JAKARTA</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-5 flex-1 rounded-lg bg-tertiary/20 border border-tertiary/30 flex items-center justify-center text-[8px] font-bold text-tertiary">
                          H1 (24PX)
                        </div>
                        <div className="h-5 flex-1 rounded-lg bg-tertiary/10 border border-tertiary/20 flex items-center justify-center text-[8px] text-tertiary">
                          BODY (13PX)
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Document Simulated Lines */}
                  <div className="space-y-1.5">
                    <div className="h-1.5 bg-surface-high dark:bg-[#272b2b] rounded-full w-full" />
                    <div className="h-1.5 bg-surface-high dark:bg-[#272b2b] rounded-full w-[85%]" />
                    <div className="h-1.5 bg-surface-high dark:bg-[#272b2b] rounded-full w-[60%]" />
                  </div>
                </div>

                {/* Paper Footer Bar: Barcode, Stamp, Page Number */}
                <div className="border-t border-border pt-3 flex items-center justify-between font-mono text-[9px] text-zinc-400">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 h-3 opacity-60">
                      <div className="w-[1px] h-full bg-current" />
                      <div className="w-[2px] h-full bg-current" />
                      <div className="w-[1px] h-full bg-current" />
                      <div className="w-[3px] h-full bg-current" />
                      <div className="w-[1px] h-full bg-current" />
                      <div className="w-[2px] h-full bg-current" />
                      <div className="w-[1px] h-full bg-current" />
                    </div>
                    <span className="text-[8px] tracking-widest uppercase">DOC_{doc.id.toUpperCase()}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-[8.5px] font-semibold text-zinc-600 dark:text-zinc-300">LOCAL VAULT</span>
                  </div>
                </div>

                {/* Subtle paper texture overlay */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-black/[0.02] via-transparent to-white/[0.04] dark:from-white/[0.01] dark:to-transparent" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
