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
  const orderRef = useRef<number[]>([0, 1, 2, 3, 4]);
  const isShufflingRef = useRef(false);
  const animeTimelineRef = useRef<Timeline | null>(null);
  const shuffleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  // 1. Autonomous Page Shuffle Loop (Self-running, No Controls)
  const triggerShuffle = useCallback(() => {
    if (isShufflingRef.current) return;
    isShufflingRef.current = true;

    const currentCards = cardRefs.current;
    const currentOrder = orderRef.current;
    const topCardIndex = currentOrder[0];
    const topCardEl = currentCards[topCardIndex];

    if (!topCardEl) {
      isShufflingRef.current = false;
      return;
    }

    const nextOrder = [...currentOrder.slice(1), currentOrder[0]];

    // Step 0: Ensure the elevating top card sits above all cards during lift
    topCardEl.style.zIndex = '60';

    const tl = createTimeline({
      defaults: {
        ease: 'cubicBezier(0.05, 0.7, 0.1, 1)',
      },
      onComplete: () => {
        // Shuffle complete: finalize React state and release lock without flickering
        setOrder(nextOrder);
        orderRef.current = nextOrder;
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
      begin: () => {
        // As the card begins tucking behind, drop its z-index so it slides behind smoothly
        topCardEl.style.zIndex = '5';
      },
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

            // Palette mapped directly from reference theme:
            // 0: Pale Sage Green (Panel 1 & 2 left card)
            // 1: Industrial Safety Orange (Panel 2 right card)
            // 2: Deep Matte Carbon Slate (Panel 3 & 4)
            // 3: Pale Sage CAD Blueprint
            // 4: Deep Carbon Avionics Console
            const isSageCard = index === 0 || index === 3;
            const isOrangeCard = index === 1;

            return (
              <div
                key={doc.id}
                ref={(el) => { cardRefs.current[index] = el; }}
                className={`absolute inset-0 rounded-3xl border flex flex-col justify-between p-5 sm:p-6 overflow-hidden backface-visible preserve-3d cursor-default transition-[box-shadow] duration-500 ${
                  isOrangeCard
                    ? 'bg-[#ff5722] text-white border-white/30'
                    : isSageCard
                      ? 'bg-[#ccd8cc] text-[#121517] border-[#121517]/20'
                      : 'bg-[#15191b] text-zinc-100 border-white/15'
                }`}
                style={{
                  zIndex,
                  boxShadow: currentPositionInStack === 0
                    ? isOrangeCard
                      ? '0 25px 60px rgba(255,87,34,0.45), 0 0 35px rgba(255,87,34,0.3)'
                      : isSageCard
                        ? '0 25px 60px rgba(0,0,0,0.6), 0 0 25px rgba(204,216,204,0.2)'
                        : '0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(255,87,34,0.2)'
                    : '0 20px 50px rgba(0,0,0,0.5)',
                  willChange: 'transform, opacity',
                  backgroundImage: isOrangeCard
                    ? 'radial-gradient(rgba(0,0,0,0.06) 1px, transparent 0)'
                    : isSageCard
                      ? 'radial-gradient(rgba(0,0,0,0.08) 1px, transparent 0)'
                      : 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 0)',
                  backgroundSize: '16px 16px',
                }}
              >
                {/* Paper Top Bar / Header with Technical Telemetry */}
                <div className={`flex items-start justify-between pb-3 border-b ${
                  isOrangeCard
                    ? 'border-white/20'
                    : isSageCard
                      ? 'border-[#121517]/15'
                      : 'border-white/10'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm ${
                      isOrangeCard
                        ? 'bg-black/30 text-white'
                        : isSageCard
                          ? 'bg-[#121517] text-[#ccd8cc]'
                          : 'bg-[#ff5722] text-white'
                    }`}>
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className={`text-[10px] font-mono font-bold tracking-wider uppercase ${
                        isOrangeCard
                          ? 'text-white/80'
                          : isSageCard
                            ? 'text-[#121517]/70'
                            : 'text-zinc-400'
                      }`}>
                        {index === 0 ? 'ORION N5 // MARS EXPEDITION' : index === 1 ? 'TELEMETRY RESULTS // ID-350' : doc.type}
                      </div>
                      <div className={`text-[9px] font-mono ${
                        isOrangeCard
                          ? 'text-white/60'
                          : isSageCard
                            ? 'text-[#121517]/60'
                            : 'text-zinc-500'
                      }`}>
                        PAGES 01–{doc.pages.toString().padStart(2, '0')} • {doc.size}
                      </div>
                    </div>
                  </div>

                  {/* Hazard Hatch Badge */}
                  <span className={`text-[9px] font-mono font-bold px-2.5 py-0.5 rounded border flex items-center gap-1.5 ${
                    isOrangeCard
                      ? 'bg-black/25 text-white border-white/20'
                      : isSageCard
                        ? 'bg-[#121517] text-[#ccd8cc] border-[#121517]'
                        : 'bg-white/10 text-emerald-400 border-emerald-500/30'
                  }`}>
                    <span className="font-mono text-[8px] opacity-70">///////</span>
                    <ShieldCheck className="h-2.5 w-2.5" />
                    {index === 0 ? 'ID-75 // 34' : index === 1 ? 'ID-32 // 95%' : doc.badge}
                  </span>
                </div>

                {/* Paper Body: Thematic Mockups directly matching reference image */}
                <div className="flex-1 py-3 flex flex-col justify-between">
                  {/* Document Title Header */}
                  <div>
                    <h3 className={`text-xs font-mono font-bold leading-snug tracking-tight line-clamp-2 ${
                      isOrangeCard ? 'text-white' : isSageCard ? 'text-[#121517]' : 'text-zinc-100'
                    }`}>
                      {index === 0 ? 'PLANETARY TELEMETRY RESULTS' : doc.title}
                    </h3>
                    <p className={`text-[9.5px] mt-0.5 font-mono ${
                      isOrangeCard ? 'text-white/70' : isSageCard ? 'text-[#121517]/70' : 'text-zinc-400'
                    }`}>
                      AUTHOR: {doc.author.toUpperCase()} • {doc.date}
                    </p>
                  </div>

                  {/* Card 0: Pale Sage with Vertical Bar Chart Telemetry (Panel 1 of reference image) */}
                  {index === 0 && (
                    <div className="my-1.5 p-2.5 rounded-xl bg-[#121517]/5 border border-[#121517]/10 flex flex-col gap-1.5 font-mono">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <div className="text-[28px] font-black tracking-tight leading-none text-[#121517]">
                            34<span className="text-xs font-normal opacity-60 ml-1">/ 100</span>
                          </div>
                          <div className="text-[8.5px] font-bold text-[#121517]/70 mt-0.5">
                            SURFACE RECONNAISSANCE ACCURACY
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[#ff5722] bg-[#ff5722]/15 px-2 py-0.5 rounded">
                          STATUS: NOMINAL
                        </span>
                      </div>

                      {/* Technical Bar Graph: 1 Bright Orange Bar and remaining dark bars */}
                      <div className="h-11 pt-1.5 flex items-end gap-1.5 border-b border-[#121517]/20 pb-1">
                        <div className="flex-1 bg-[#121517]/60 rounded-t h-[35%]" />
                        <div className="flex-1 bg-[#121517]/75 rounded-t h-[55%]" />
                        {/* THE ICONIC ORANGE BAR */}
                        <div className="flex-1 bg-[#ff5722] rounded-t h-[100%] shadow-[0_0_10px_rgba(255,87,34,0.5)]" />
                        <div className="flex-1 bg-[#121517]/60 rounded-t h-[65%]" />
                        <div className="flex-1 bg-[#121517]/80 rounded-t h-[80%]" />
                        <div className="flex-1 bg-[#121517]/50 rounded-t h-[45%]" />
                        <div className="flex-1 bg-[#121517]/90 rounded-t h-[90%]" />
                        <div className="flex-1 bg-[#121517]/40 rounded-t h-[38%]" />
                      </div>

                      <div className="grid grid-cols-3 gap-1 pt-0.5 text-[8.5px] text-[#121517]">
                        <div className="p-1 rounded bg-[#121517]/5 text-center">
                          <strong>75+</strong> MOD
                        </div>
                        <div className="p-1 rounded bg-[#121517]/5 text-center">
                          <strong>29</strong> ORBITS
                        </div>
                        <div className="p-1 rounded bg-[#121517]/5 text-center">
                          <strong>52k</strong> THRUST
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Card 1: Vibrant Safety Orange Card with 95% metric and Phase Gantt Timeline */}
                  {index === 1 && (
                    <div className="my-1.5 p-2.5 rounded-xl bg-black/20 border border-white/20 flex flex-col gap-1.5 font-mono text-white">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <div className="text-[32px] font-black tracking-tight leading-none text-white">
                            95%
                          </div>
                          <div className="text-[8.5px] font-bold text-white/80 mt-0.5">
                            ESTIMATED MISSION SUCCESS RATE
                          </div>
                        </div>
                        <div className="h-6 px-2 rounded bg-white text-[#ff5722] font-black text-xs flex items-center">
                          ID-32
                        </div>
                      </div>

                      {/* Phase 1 / Phase 2 Timeline Block */}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[8px] text-white/80">
                          <span>PHASE 1: INGESTION</span>
                          <span>PHASE 2: COMPILE</span>
                        </div>
                        <div className="flex gap-1 h-3 rounded overflow-hidden">
                          <div className="w-[60%] bg-white/90 rounded-l" />
                          <div className="w-[40%] bg-black/40 rounded-r border border-white/30" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[8px] text-white/70 pt-0.5">
                        <span>ZERO CLOUD TELEMETRY</span>
                        <span className="font-bold text-white">100% AIR-GAPPED</span>
                      </div>
                    </div>
                  )}

                  {/* Card 2: Deep Matte Carbon Basalt Card (Panel 3 & 4 of reference image) */}
                  {index === 2 && (
                    <div className="my-1.5 p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1.5 font-mono text-zinc-300">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <div className="text-[28px] font-black tracking-tight leading-none text-white">
                            79<span className="text-xs font-normal text-zinc-500 ml-1">/ 100</span>
                          </div>
                          <div className="text-[8.5px] font-bold text-zinc-400 mt-0.5">
                            ORBITAL TRAJECTORY DRIFT
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          PIPELINE COMPILED
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[8.5px]">
                        <div className="p-1.5 rounded bg-black/40 border border-white/5">
                          MEMORY: <strong className="text-white">42.8 MB</strong>
                        </div>
                        <div className="p-1.5 rounded bg-black/40 border border-white/5">
                          VECTORS: <strong className="text-[#ff5722]">8 LAYERS</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-0.5">
                        <div className="h-4 px-2 bg-rose-500/20 rounded border border-rose-500/30 flex items-center text-[7.5px] text-rose-400 font-bold">
                          SEALED
                        </div>
                        <span className="text-[8px] text-zinc-400">SIGNATURE ID: 0x9F41E</span>
                      </div>
                    </div>
                  )}

                  {/* Card 3: Pale Sage CAD Vector Blueprint */}
                  {index === 3 && (
                    <div className="my-1.5 p-2.5 rounded-xl bg-[#121517]/5 border border-[#121517]/10 flex flex-col gap-1 font-mono text-[9px] text-[#121517]">
                      <div className="flex items-center justify-between text-[#121517]/70">
                        <span>CAD VECTOR RETICLE</span>
                        <span className="font-bold text-[#ff5722]">X: 1920 // Y: 1080</span>
                      </div>
                      <div className="h-11 w-full rounded-lg border border-dashed border-[#121517]/30 relative flex items-center justify-center overflow-hidden bg-[#121517]/5">
                        <div className="h-8 w-8 rounded-full border border-[#121517]/30 flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-[#ff5722] animate-ping" />
                          <div className="h-2 w-2 rounded-full bg-[#ff5722] absolute" />
                        </div>
                        <div className="absolute left-2 text-[7px] text-[#121517]/60 font-mono">0.00°</div>
                        <div className="absolute right-2 text-[7px] text-[#121517]/60 font-mono">300 DPI</div>
                      </div>
                    </div>
                  )}

                  {/* Card 4: Horizontal Orange Avionics Stripe (Panel 4 of reference image) */}
                  {index === 4 && (
                    <div className="my-1.5 p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1.5 font-mono text-zinc-300">
                      {/* Iconic Orange Instrument Stripe */}
                      <div className="p-2 rounded-lg bg-[#ff5722] text-white flex items-center justify-between text-[9px] font-bold shadow-md">
                        <span>NOVA DYNAMICS</span>
                        <span>07.12 / 2027</span>
                        <span>5.302 RATE</span>
                      </div>
                      <div className="flex justify-between items-center text-[8.5px] text-zinc-400 pt-0.5">
                        <span>AIR-GAPPED HARDWARE VAULT</span>
                        <span className="text-[#c8d8c7] font-bold">SHA-256 VERIFIED</span>
                      </div>
                    </div>
                  )}

                  {/* Document Simulated Lines */}
                  <div className="space-y-1.5 pt-1">
                    <div className={`h-1.5 rounded-full w-full ${
                      isOrangeCard ? 'bg-white/30' : isSageCard ? 'bg-[#121517]/15' : 'bg-white/10'
                    }`} />
                    <div className={`h-1.5 rounded-full w-[85%] ${
                      isOrangeCard ? 'bg-white/20' : isSageCard ? 'bg-[#121517]/10' : 'bg-white/5'
                    }`} />
                  </div>
                </div>

                {/* Paper Footer Bar: Barcode, Stamp, Page Number */}
                <div className={`border-t pt-2.5 flex items-center justify-between font-mono text-[9px] ${
                  isOrangeCard
                    ? 'border-white/20 text-white/80'
                    : isSageCard
                      ? 'border-[#121517]/15 text-[#121517]/70'
                      : 'border-white/10 text-zinc-400'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 h-3 opacity-70">
                      <div className="w-[1px] h-full bg-current" />
                      <div className="w-[2px] h-full bg-current" />
                      <div className="w-[1px] h-full bg-current" />
                      <div className="w-[3px] h-full bg-current" />
                      <div className="w-[1px] h-full bg-current" />
                      <div className="w-[2px] h-full bg-current" />
                      <div className="w-[1px] h-full bg-current" />
                    </div>
                    <span className="text-[8px] tracking-widest uppercase">
                      {isOrangeCard ? 'N5_EXPEDITION' : isSageCard ? 'ORION_SYS_01' : `DOC_${doc.id.toUpperCase()}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      isOrangeCard ? 'bg-white' : isSageCard ? 'bg-[#121517]' : 'bg-[#ff5722]'
                    } animate-pulse`} />
                    <span className="text-[8.5px] font-bold">
                      {isOrangeCard ? 'AIR-GAPPED' : isSageCard ? 'ISO 32000-2' : 'LOCAL VAULT'}
                    </span>
                  </div>
                </div>

                {/* Paper surface sheen */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-black/[0.04] via-transparent to-white/[0.08]" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
