import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Timer, 
  CheckCircle2,
  X,
  Sliders,
  Plus,
  Minus
} from 'lucide-react';
import { usePomodoro } from '../../context/PomodoroContext';
import FloatingAnchor from '../common/FloatingAnchor';

interface PomodoroTimerProps {
  className?: string;
}

export default function PomodoroTimer({ className = '' }: PomodoroTimerProps) {
  const {
    phase,
    secondsLeft,
    isRunning,
    completedSessions,
    settings,
    toggleTimer,
    resetTimer,
    skipPhase,
    switchPhase,
    updateSettings,
    formatTime,
    progressPercent,
  } = usePomodoro();

  const [showPopover, setShowPopover] = useState<boolean>(false);
  const [showSettingsTab, setShowSettingsTab] = useState<boolean>(false);

  // Custom intervals input state
  const [customFocus, setCustomFocus] = useState<number>(settings.focusMin);
  const [customShortBreak, setCustomShortBreak] = useState<number>(settings.shortBreakMin);
  const [customLongBreak, setCustomLongBreak] = useState<number>(settings.longBreakMin);

  const timerPillRef = useRef<HTMLDivElement>(null);

  // Sync inputs when settings change
  useEffect(() => {
    setCustomFocus(settings.focusMin);
    setCustomShortBreak(settings.shortBreakMin);
    setCustomLongBreak(settings.longBreakMin);
  }, [settings]);

  const handleApplyCustomIntervals = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanFocus = Math.max(1, Math.min(180, Number(customFocus) || 25));
    const cleanShort = Math.max(1, Math.min(60, Number(customShortBreak) || 5));
    const cleanLong = Math.max(1, Math.min(90, Number(customLongBreak) || 15));

    const updated = {
      focusMin: cleanFocus,
      shortBreakMin: cleanShort,
      longBreakMin: cleanLong,
    };
    updateSettings(updated);

    // Apply to current timer if not running
    if (!isRunning) {
      switchPhase(phase, { ...settings, ...updated });
    }
    setShowSettingsTab(false);
  };

  const handleLoadPreset = (focus: number, shortB: number, longB: number) => {
    setCustomFocus(focus);
    setCustomShortBreak(shortB);
    setCustomLongBreak(longB);
    const updated = {
      focusMin: focus,
      shortBreakMin: shortB,
      longBreakMin: longB,
    };
    updateSettings(updated);
    if (!isRunning) {
      switchPhase(phase, { ...settings, ...updated });
    }
    setShowSettingsTab(false);
  };

  return (
    <div className={`relative flex items-center select-none ${className}`}>
      {/* 1. Slim Compact Timer Pill */}
      <div 
        ref={timerPillRef}
        className={`h-7 px-2.5 rounded-full border flex items-center gap-1.5 transition-all duration-200 ease-caelestia-decel cursor-pointer shadow-xs ${
          isRunning
            ? phase === 'focus'
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 ring-1 ring-rose-500/20'
              : 'bg-accent/15 border-accent/40 text-accent ring-1 ring-accent/20'
            : 'bg-surface-container border-outline/20 text-on-surface hover:border-outline/40 hover:bg-surface-high'
        }`}
        onClick={() => setShowPopover((prev) => !prev)}
        title="Pomodoro Study Timer (Click to open controls & custom intervals)"
      >
        {/* Phase Indicator Dot / Icon */}
        <span className="relative flex h-2 w-2">
          {isRunning && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              phase === 'focus' ? 'bg-rose-400' : 'bg-accent'
            }`} />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            phase === 'focus' ? 'bg-rose-500' : 'bg-accent'
          }`} />
        </span>

        {/* Digital Time Display */}
        <span className="font-mono text-xs font-bold tabular-nums tracking-tight">
          {formatTime(secondsLeft)}
        </span>

        {/* Phase Label Pill */}
        <span className="text-[9px] font-semibold uppercase tracking-wider opacity-80 hidden md:inline">
          {phase === 'focus' ? 'Work' : phase === 'shortBreak' ? 'Break' : 'Long Break'}
        </span>
      </div>

      {/* Play / Pause Shortcut Button directly beside the pill */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleTimer();
        }}
        title={isRunning ? "Pause Timer" : "Start Pomodoro Timer"}
        className={`h-6 w-6 ml-1 rounded-full flex items-center justify-center transition-all duration-200 ease-caelestia-decel ${
          isRunning 
            ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30' 
            : 'bg-surface-container text-on-surface hover:bg-surface-high border border-outline/20'
        }`}
      >
        {isRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
      </button>

      {/* 2. Popover Modal Dialog */}
      <FloatingAnchor 
        isOpen={showPopover}
        onClose={() => setShowPopover(false)}
        anchorRef={timerPillRef}
        placement="bottom-end"
        className="w-80 p-4 rounded-3xl caelestia-glass border border-outline/20 shadow-[0_25px_60px_rgba(0,0,0,0.65)] text-on-surface ring-1 ring-white/10"
      >
          
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-outline/20">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-on-surface">
              <Timer className="h-4 w-4 text-accent" />
              <span>Pomodoro Study Timer</span>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                title={settings.soundEnabled ? "Chime Enabled" : "Chime Muted"}
                className="h-6 w-6 rounded-full hover:bg-surface-high text-zinc-400 hover:text-on-surface flex items-center justify-center transition-colors"
              >
                {settings.soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-accent" /> : <VolumeX className="h-3.5 w-3.5 text-zinc-500" />}
              </button>

              <button
                type="button"
                onClick={() => setShowSettingsTab((s) => !s)}
                title="Configure Custom Intervals (Work & Breaks)"
                className={`h-6 px-2 rounded-full flex items-center gap-1 text-[11px] font-medium transition-colors ${
                  showSettingsTab 
                    ? 'text-[#00363d] bg-accent font-semibold shadow-xs' 
                    : 'text-zinc-400 hover:text-on-surface hover:bg-surface-high'
                }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>Intervals</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPopover(false)}
                title="Close"
                className="h-6 w-6 rounded-full hover:bg-surface-high text-zinc-400 hover:text-on-surface flex items-center justify-center transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {!showSettingsTab ? (
            <>
              {/* Phase Switcher Tabs */}
              <div 
                className="grid grid-cols-3 gap-1 bg-surface-lowest/70 p-1 rounded-2xl border border-outline/15 my-3"
              >
                <button
                  type="button"
                  onClick={() => switchPhase('focus')}
                  className={`py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-200 ease-caelestia-decel flex flex-col items-center justify-center gap-0.5 ${
                    phase === 'focus'
                      ? 'bg-rose-500 text-white shadow-xs font-bold'
                      : 'text-zinc-400 hover:text-on-surface'
                  }`}
                >
                  <span>Work</span>
                  <span className="text-[9px] font-mono opacity-80">{settings.focusMin}m</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchPhase('shortBreak')}
                  className={`py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-200 ease-caelestia-decel flex flex-col items-center justify-center gap-0.5 ${
                    phase === 'shortBreak'
                      ? 'bg-accent text-[#00363d] shadow-xs font-bold'
                      : 'text-zinc-400 hover:text-on-surface'
                  }`}
                >
                  <span>Break</span>
                  <span className="text-[9px] font-mono opacity-80">{settings.shortBreakMin}m</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchPhase('longBreak')}
                  className={`py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-200 ease-caelestia-decel flex flex-col items-center justify-center gap-0.5 ${
                    phase === 'longBreak'
                      ? 'bg-tertiary text-[#381e72] shadow-xs font-bold'
                      : 'text-zinc-400 hover:text-on-surface'
                  }`}
                >
                  <span>Long Break</span>
                  <span className="text-[9px] font-mono opacity-80">{settings.longBreakMin}m</span>
                </button>
              </div>

              {/* Big Digital Timer Display & Progress Ring */}
              <div className="flex flex-col items-center py-2">
                <div className="text-4xl font-mono font-bold tracking-tight text-on-surface tabular-nums">
                  {formatTime(secondsLeft)}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-surface-lowest h-1.5 rounded-full mt-3 overflow-hidden border border-outline/20">
                  <div 
                    className={`h-full transition-all duration-300 ease-caelestia-decel ${
                      phase === 'focus' ? 'bg-rose-500' : 'bg-accent'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons: Play/Pause, Reset, Skip */}
              <div className="flex items-center justify-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={resetTimer}
                  title="Reset Current Interval"
                  className="h-9 w-9 rounded-full bg-surface-container hover:bg-surface-high border border-outline/20 text-on-surface flex items-center justify-center transition-all duration-200 ease-caelestia-decel shadow-xs"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={toggleTimer}
                  className={`h-9 px-6 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all duration-200 ease-caelestia-decel shadow-md active:scale-95 ${
                    isRunning 
                      ? 'bg-surface-highest text-on-surface hover:bg-surface-high' 
                      : phase === 'focus'
                        ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-950/40'
                        : 'bg-accent text-[#00363d] hover:bg-accent/90 shadow-cyan-950/40'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Start {phase === 'focus' ? 'Work' : 'Break'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={skipPhase}
                  title="Skip to Next Phase"
                  className="h-9 w-9 rounded-full bg-surface-container hover:bg-surface-high border border-outline/20 text-on-surface flex items-center justify-center transition-all duration-200 ease-caelestia-decel shadow-xs"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>

              {/* Completed Sessions Count Footer */}
              <div className="mt-3 pt-2.5 border-t border-outline/20 flex items-center justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                  <span>Completed Cycles:</span>
                </span>
                <span className="font-mono font-semibold text-on-surface">
                  {completedSessions} {completedSessions === 1 ? 'session' : 'sessions'}
                </span>
              </div>
            </>
          ) : (
            /* Custom Time Intervals Settings Form */
            <form onSubmit={handleApplyCustomIntervals} className="mt-2.5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider font-mono">
                  Set Custom Intervals
                </span>
                <span className="text-[10px] text-zinc-400">Auto-saved</span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleLoadPreset(25, 5, 15)}
                  className="py-1.5 px-2 rounded-xl bg-surface-container hover:bg-surface-high text-[10px] font-mono text-on-surface transition-all duration-200 ease-caelestia-decel text-center border border-outline/20"
                >
                  <div className="font-semibold text-on-surface">25 / 5 min</div>
                  <div className="text-[8px] text-zinc-400">Classic</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset(50, 10, 20)}
                  className="py-1.5 px-2 rounded-xl bg-surface-container hover:bg-surface-high text-[10px] font-mono text-on-surface transition-all duration-200 ease-caelestia-decel text-center border border-outline/20"
                >
                  <div className="font-semibold text-on-surface">50 / 10 min</div>
                  <div className="text-[8px] text-zinc-400">Deep Work</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset(90, 20, 30)}
                  className="py-1.5 px-2 rounded-xl bg-surface-container hover:bg-surface-high text-[10px] font-mono text-on-surface transition-all duration-200 ease-caelestia-decel text-center border border-outline/20"
                >
                  <div className="font-semibold text-on-surface">90 / 20 min</div>
                  <div className="text-[8px] text-zinc-400">Ultradian</div>
                </button>
              </div>

              {/* Stepper Inputs for Custom Work & Break times */}
              <div 
                className="flex flex-col gap-2.5 bg-surface-lowest/70 p-3 rounded-2xl border border-outline/15 text-xs"
              >
                {/* 1. Work Duration */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-on-surface">Work Session</div>
                    <div className="text-[10px] text-zinc-400">Focus interval</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCustomFocus((f) => Math.max(1, f - 5))}
                      className="h-6 w-6 rounded-full bg-surface-high hover:bg-surface-highest text-on-surface flex items-center justify-center transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={customFocus}
                      onChange={(e) => setCustomFocus(parseInt(e.target.value, 10) || 1)}
                      className="w-11 h-6 bg-surface-container border border-outline/30 rounded-lg text-center font-mono font-bold text-xs text-rose-400 focus:outline-none focus:border-rose-500"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomFocus((f) => Math.min(180, f + 5))}
                      className="h-6 w-6 rounded-full bg-surface-high hover:bg-surface-highest text-on-surface flex items-center justify-center transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <span className="text-zinc-400 text-[11px] w-6">min</span>
                  </div>
                </div>

                {/* 2. Short Break Duration */}
                <div className="flex items-center justify-between pt-1 border-t border-outline/15">
                  <div>
                    <div className="font-semibold text-on-surface">Short Break</div>
                    <div className="text-[10px] text-zinc-400">Quick rest</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCustomShortBreak((b) => Math.max(1, b - 1))}
                      className="h-6 w-6 rounded-full bg-surface-high hover:bg-surface-highest text-on-surface flex items-center justify-center transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={customShortBreak}
                      onChange={(e) => setCustomShortBreak(parseInt(e.target.value, 10) || 1)}
                      className="w-11 h-6 bg-surface-container border border-outline/30 rounded-lg text-center font-mono font-bold text-xs text-accent focus:outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomShortBreak((b) => Math.min(60, b + 1))}
                      className="h-6 w-6 rounded-full bg-surface-high hover:bg-surface-highest text-on-surface flex items-center justify-center transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <span className="text-zinc-400 text-[11px] w-6">min</span>
                  </div>
                </div>

                {/* 3. Long Break Duration */}
                <div className="flex items-center justify-between pt-1 border-t border-outline/15">
                  <div>
                    <div className="font-semibold text-on-surface">Long Break</div>
                    <div className="text-[10px] text-zinc-400">After 4 cycles</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCustomLongBreak((b) => Math.max(1, b - 5))}
                      className="h-6 w-6 rounded-full bg-surface-high hover:bg-surface-highest text-on-surface flex items-center justify-center transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={customLongBreak}
                      onChange={(e) => setCustomLongBreak(parseInt(e.target.value, 10) || 1)}
                      className="w-11 h-6 bg-surface-container border border-outline/30 rounded-lg text-center font-mono font-bold text-xs text-tertiary focus:outline-none focus:border-tertiary"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomLongBreak((b) => Math.min(90, b + 5))}
                      className="h-6 w-6 rounded-full bg-surface-high hover:bg-surface-highest text-on-surface flex items-center justify-center transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <span className="text-zinc-400 text-[11px] w-6">min</span>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setShowSettingsTab(false)}
                  className="flex-1 py-2 rounded-full bg-surface-container hover:bg-surface-high text-xs font-semibold text-on-surface transition-all duration-200 ease-caelestia-decel border border-outline/20"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-full bg-accent text-[#00363d] hover:bg-accent/90 text-xs font-bold transition-all duration-200 ease-caelestia-decel shadow-xs"
                >
                  Save & Apply
                </button>
              </div>
            </form>
          )}
        </FloatingAnchor>
    </div>
  );
}
