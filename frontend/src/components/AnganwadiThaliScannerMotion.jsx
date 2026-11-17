import React from "react";

export default function AnganwadiThaliScannerMotion({ className = "", compact = false }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Background radial glow */}
      <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-emerald-500/20 via-teal-400/10 to-amber-400/15 blur-2xl pointer-events-none" />

      {/* Main Floating Tray Container */}
      <div className="relative w-full max-w-md sm:max-w-lg aspect-square flex items-center justify-center p-3 animate-gentle-float">
        {/* Steel Thali Tray Outer Rim */}
        <div className="relative w-full h-full rounded-[40px] border-4 border-slate-300 dark:border-slate-600 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 shadow-2xl p-4 flex flex-col justify-between overflow-hidden">
          
          {/* Subtle metal sheen highlight */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 dark:via-white/5 to-transparent pointer-events-none" />

          {/* AI Laser Scan Line Sweeping Across */}
          <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_3px_rgba(52,211,153,0.85)] z-20 pointer-events-none animate-scanline">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600/90 text-white text-[9px] font-mono uppercase px-2 py-0.5 rounded-full shadow-sm tracking-wider flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              AI Nutrition Scanner Active
            </div>
          </div>

          {/* Corner Viewfinder Targeting Brackets */}
          <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-emerald-500 rounded-tl z-20 pointer-events-none" />
          <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-emerald-500 rounded-tr z-20 pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-emerald-500 rounded-bl z-20 pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-emerald-500 rounded-br z-20 pointer-events-none" />

          {/* Top Row: Compartment 1 (Marker) & Compartment 2 (Dal / Sambar) */}
          <div className="grid grid-cols-2 gap-3 h-[42%] z-10">
            
            {/* Compartment 1: Cyan Reference Marker with Calibration Radar */}
            <div className="relative rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/90 p-3 flex flex-col items-center justify-center shadow-inner overflow-hidden group">
              <div className="absolute top-1.5 left-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                Compartment 1
              </div>
              {/* Radar pulse circles */}
              <div className="absolute w-16 h-16 rounded-full border border-cyan-400/50 animate-pulse-radar pointer-events-none" />
              <div className="relative z-10 w-12 h-12 rounded-lg bg-cyan-500 flex flex-col items-center justify-center text-white shadow-md border-2 border-cyan-200">
                <span className="text-[10px] font-bold">3.0 cm</span>
                <span className="text-[8px] uppercase tracking-tighter">Marker</span>
              </div>
              <div className="mt-1 text-[9px] font-semibold text-cyan-700 dark:text-cyan-300">
                🎯 Scale Reference Locked
              </div>
            </div>

            {/* Compartment 2: Nutritious Dal / Sambar */}
            <div className="relative rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-amber-50/80 dark:bg-amber-950/40 p-3 flex flex-col items-center justify-center shadow-inner overflow-hidden">
              <div className="absolute top-1.5 left-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                Compartment 2
              </div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 shadow-md flex items-center justify-center border-2 border-amber-200/50">
                <span className="text-xl">🍲</span>
              </div>
              <div className="mt-1 text-[10px] font-bold text-amber-900 dark:text-amber-200">
                Toor Dal / Sambar
              </div>
              <div className="text-[9px] text-amber-700 dark:text-amber-400 font-medium">
                ~120g • 115 kcal
              </div>
            </div>
          </div>

          {/* Bottom Row: Large Compartment 3 (Rice) & Right Split (Sabzi & Protein) */}
          <div className="grid grid-cols-12 gap-3 h-[54%] z-10 mt-3">
            
            {/* Compartment 5: Steamed Rice / Millets (Major Staple) */}
            <div className="col-span-7 relative rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/90 p-3 flex flex-col items-center justify-center shadow-inner overflow-hidden">
              <div className="absolute top-1.5 left-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                Compartment 5 (Staple)
              </div>
              
              {/* Rising steam effect */}
              <div className="absolute -top-1 text-slate-400/70 text-xs animate-steam pointer-events-none">
                ♨️
              </div>
              
              <div className="w-24 h-20 rounded-2xl bg-gradient-to-b from-stone-100 to-amber-50 dark:from-stone-200 dark:to-stone-300 shadow-md flex flex-col items-center justify-center border-2 border-slate-200 text-slate-800">
                <span className="text-2xl">🍚</span>
                <span className="text-[10px] font-bold tracking-tight">Steamed Rice / Khichdi</span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                  ~160g
                </span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400">
                  • 230 kcal
                </span>
              </div>
            </div>

            {/* Right Split: Sabzi & Protein Booster */}
            <div className="col-span-5 flex flex-col gap-2.5">
              
              {/* Compartment 3: Fresh Green Vegetable Sabzi */}
              <div className="flex-1 relative rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-emerald-50/70 dark:bg-emerald-950/40 p-2 flex items-center gap-2 shadow-inner">
                <div className="w-10 h-10 rounded-full bg-emerald-600 shadow flex items-center justify-center text-white shrink-0">
                  <span className="text-sm">🥦</span>
                </div>
                <div className="overflow-hidden">
                  <div className="text-[10px] font-bold text-emerald-900 dark:text-emerald-200 truncate">
                    Veg Sabzi
                  </div>
                  <div className="text-[9px] text-emerald-700 dark:text-emerald-400">
                    ~75g • 60 kcal
                  </div>
                </div>
              </div>

              {/* Compartment 4: Protein / Egg / Sprouts */}
              <div className="flex-1 relative rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-rose-50/70 dark:bg-rose-950/40 p-2 flex items-center gap-2 shadow-inner">
                <div className="w-10 h-10 rounded-full bg-amber-500 shadow flex items-center justify-center text-white shrink-0">
                  <span className="text-sm">🥚</span>
                </div>
                <div className="overflow-hidden">
                  <div className="text-[10px] font-bold text-rose-950 dark:text-rose-200 truncate">
                    Boiled Egg / Sprouts
                  </div>
                  <div className="text-[9px] text-rose-700 dark:text-rose-400">
                    ~50g • 6.2g Protein
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Live Telemetry Badges Around the Tray */}
        {!compact && (
          <>
            {/* Top Left Floating Badge */}
            <div className="absolute -top-3 -left-4 z-30 animate-float-badge-1 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-1.5 shadow-lg flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
              <div className="text-left">
                <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                  🟢 465 kcal
                </div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400">
                  ICDS Norm Met (Target: 450)
                </div>
              </div>
            </div>

            {/* Top Right Floating Badge */}
            <div className="absolute -top-3 -right-4 z-30 animate-float-badge-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-1.5 shadow-lg flex items-center gap-2">
              <span className="text-sm">🌾</span>
              <div className="text-left">
                <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                  13.4g Protein
                </div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400">
                  Adequate Child Nutrition
                </div>
              </div>
            </div>

            {/* Bottom Floating Badge */}
            <div className="absolute -bottom-4 z-30 animate-float-badge-3 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 shadow-xl flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-700 text-white font-bold text-xs shadow-sm">
                TC
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  PyTorch Real-Accuracy Vision
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Early-Warning Meal Safeguard • 5 Compartments
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
