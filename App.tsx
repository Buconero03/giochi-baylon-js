import React, { useState } from 'react';
import NeonVelocityGame from './games/NeonVelocityGame';

type GameId = 'menu' | 'neon';

const App: React.FC = () => {
  const [currentGame, setCurrentGame] = useState<GameId>('menu');

  if (currentGame === 'neon') {
    return (
      <div className="w-screen h-screen bg-slate-950 text-white">
        <div className="absolute top-3 left-3 z-50">
          <button
            onClick={() => setCurrentGame('menu')}
            className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-500 text-xs hover:bg-slate-800"
          >
            ← Torna al menu giochi
          </button>
        </div>

        <NeonVelocityGame />
      </div>
    );
  }

  // MENU PRINCIPALE
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4">
      <div className="max-w-4xl w-full bg-slate-900/90 rounded-2xl border border-slate-700 shadow-2xl p-6 md:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-400 via-sky-400 to-fuchsia-500 flex items-center justify-center text-slate-950 font-extrabold text-lg shadow-lg">
              GX
            </div>
            <div>
              <h1 className="text-xl md:text-2xl tracking-[0.2em] uppercase font-semibold">
                GameX Arcade
              </h1>
              <p className="text-xs text-slate-400">
                Portale con i miei giochi browser
              </p>
            </div>
          </div>
          <span className="text-[0.7rem] uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-slate-500/70 bg-slate-900/70">
            Beta · 1 gioco su 50
          </span>
        </header>

        <p className="text-sm md:text-base text-slate-200 mb-5 leading-relaxed">
          Questo è il mio sito con più giochi. Per ora c&apos;è solo
          <span className="text-emerald-400 font-semibold"> Neon Velocity</span>,
          un gioco di corse 3D. In futuro aggiungerò altri titoli (arcade, puzzle, ecc.).
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Card Neon Velocity */}
          <article className="bg-slate-950/80 border border-slate-700 rounded-xl p-4 flex flex-col justify-between shadow-lg">
            <div>
              <h2 className="text-sm font-semibold mb-1">
                Neon Velocity: Underground
              </h2>
              <p className="text-[0.8rem] text-slate-400 mb-2">
                Corse 3D · BabylonJS · Tastiera
              </p>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[0.7rem] px-2 py-[2px] rounded-full border border-emerald-400/80 text-emerald-300 uppercase tracking-[0.15em]">
                Già giocabile
              </span>
              <button
                onClick={() => setCurrentGame('neon')}
                className="px-3 py-1 rounded-full bg-emerald-400 text-slate-950 text-xs font-semibold hover:brightness-110"
              >
                Gioca ora 🚗
              </button>
            </div>
          </article>

          {/* Slot gioco 2 */}
          <article className="bg-slate-950/40 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between opacity-70">
            <div>
              <h2 className="text-sm font-semibold mb-1">
                Gioco 2 (in arrivo)
              </h2>
              <p className="text-[0.8rem] text-slate-400 mb-2">
                Arcade 2D · HTML5 Canvas
              </p>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[0.7rem] px-2 py-[2px] rounded-full border border-amber-300/80 text-amber-200 uppercase tracking-[0.15em]">
                In sviluppo
              </span>
              <span className="text-[0.75rem] text-slate-500">
                Coming soon…
              </span>
            </div>
          </article>

          {/* Slot gioco 3 */}
          <article className="bg-slate-950/40 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between opacity-70">
            <div>
              <h2 className="text-sm font-semibold mb-1">
                Gioco 3 (idea)
              </h2>
              <p className="text-[0.8rem] text-slate-400 mb-2">
                Puzzle · Mouse / Touch
              </p>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[0.7rem] px-2 py-[2px] rounded-full border border-orange-400/80 text-orange-200 uppercase tracking-[0.15em]">
                Idea
              </span>
              <span className="text-[0.75rem] text-slate-500">
                In progettazione…
              </span>
            </div>
          </article>
        </div>

        <p className="mt-4 text-[0.75rem] text-right text-slate-500">
          Prototipo portale interno · Questo stesso sito ospiterà più giochi.
        </p>
      </div>
    </div>
  );
};

export default App;
