import {
  Activity,
  Flame,
  Globe,
  HelpCircle,
  Play,
  RotateCw,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {getConfig, THEME} from './constants';
import {Game, SCRIPTURE_DATA} from './Game';
import {InputSnapshot} from './input';
import {formatTime, gameAudio, GameState, MenuOverlay} from './utils/helper';
import BackgroundMusic from './utils/BackgroundMusic';
import {useIsMobile} from './utils';
import {
  usePlayground,
  usePlaygroundGameLifecycle,
  useRpc,
} from './utils/usePlayground';

interface CustomWindow extends Window {
  canHandleBackKey?: boolean;
}

interface HUDStats {
  stamina: number;
  battery: number;
  fear: number;
  flashlightOn: boolean;
  nearPrompt: string | null;
  jinnDistance: number;
}

type Language = 'en' | 'bn';

const TRANSLATIONS = {
  en: {
    genreBadge: 'Bengali Survival Horror',
    title: 'ZAMIDAR HAUNT',
    story:
      'You have entered the dark, abandoned Zamidar Bari. A shadowy, terrifying Jinn roams the decaying corridors. Find the 5 sacred protective scriptures hidden in ancient chests and altars to break the curse and escape!',
    developedBy: 'Developed by Imaan Interactive',
    enterMansion: 'ENTER THE MANSION',
    howToPlay: 'HOW TO PLAY & LORE',
    langToggle: 'বাংলা (BN)',
    scriptures: 'SCRIPTURES',
    fear: 'Fear',
    battery: 'Battery',
    stamina: 'Stamina',
    menu: 'Menu',
    run: 'Run',
    torch: 'Torch',
    collect: 'Collect',
    gameMenuTitle: 'GAME MENU',
    resume: 'RESUME INVESTIGATION',
    sfx: 'SFX',
    music: 'MUSIC',
    restart: 'RESTART MANSION RUN',
    quit: 'QUIT TO TITLE SCREEN',
    guideTitle: 'SURVIVAL HORROR GUIDE',
    missionTitle: '🎯 MISSION OBJECTIVE',
    missionDesc:
      'Search the 5 mansion wings (Dining Hall, Zamidar Bedchamber, Library, East Chamber, Courtyard) to collect all 5 sacred protective scriptures. Once gathered, rush to the South Wrought-Iron Gate to escape!',
    jinnTitle: '👻 THE ROAMING JINN',
    jinnDesc:
      'A malevolent entity roams the dark corridors. When it draws near, your flashlight flickers violently, whispers echo, and your fear level surges. If it catches you or your fear hits 100%, you will perish!',
    flashlightTitle: '🔦 FLASHLIGHT & STAMINA',
    flashlightDesc:
      'Keep your flashlight powered to navigate shadowy rooms. Switch it off briefly when safe to recharge. Sprinting consumes stamina—save it for escaping when the Jinn hunts!',
    controlsTitle: '🎮 CONTROLS',
    controlsDesc:
      'Desktop: Mouse to Look · WASD to Walk · Shift to Sprint · E to Collect · F to Toggle Flashlight · ESC for Menu.\nMobile: Virtual D-Pad to move · Drag right screen to look around · Dedicated on-screen Torch, Collect, and Run buttons.',
    back: 'BACK',
    desktopHint:
      'Click Canvas to Lock Mouse · WASD: Move · SHIFT: Sprint · E: Collect · F: Flashlight · ESC: Menu',
    gameOverTitle: 'CLAIMED BY THE JINN',
    gameOverDesc:
      'Your screams fade into the decaying walls of the Zamidar Bari...',
    scripturesRecovered: 'Scriptures Recovered',
    score: 'Score',
    tryAgain: 'TRY AGAIN',
    victoryTitle: 'YOU ESCAPED!',
    victoryDesc:
      'With all 5 sacred scriptures in hand, the supernatural barrier shattered and you escaped into the night!',
    finalStats: 'Final Score & Escape Time',
    time: 'Time',
    playAgain: 'PLAY AGAIN',
    pts: 'PTS',
  },
  bn: {
    genreBadge: 'বাঙালি সারভাইভাল হরর',
    title: 'জমিদার বাড়ি',
    story:
      'আপনি এক অন্ধকার, পরিত্যক্ত জমিদার বাড়িতে প্রবেশ করেছেন। অন্ধকার করিডোরে একটি ভয়ঙ্কর জিন ঘুরে বেড়াচ্ছে। অভিশাপ ভেঙে পালাতে প্রাচীন সিন্দুক ও বেদীতে লুকানো ৫টি পবিত্র সুরক্ষাকারী আয়াত খুঁজে নিন!',
    developedBy: 'Developed by Imaan Interactive',
    enterMansion: 'বাড়িতে প্রবেশ করুন',
    howToPlay: 'খেলার নিয়ম ও কাহিনী',
    langToggle: 'English (EN)',
    scriptures: 'পবিত্র আয়াত',
    fear: 'ভয়',
    battery: 'ব্যাটারি',
    stamina: 'শক্তি',
    menu: 'মেনু',
    run: 'দৌড়',
    torch: 'টর্চ',
    collect: 'সংগ্রহ',
    gameMenuTitle: 'গেম মেনু',
    resume: 'খেলা চালিয়ে যান',
    sfx: 'শব্দ',
    music: 'সঙ্গীত',
    restart: 'আবার শুরু করুন',
    quit: 'প্রধান মেনুতে ফিরুন',
    guideTitle: 'সারভাইভাল হরর গাইড',
    missionTitle: '🎯 মূল মিশন ও লক্ষ্য',
    missionDesc:
      'জমিদার বাড়ির ৫টি কক্ষ (ডাইনিং হল, খাস কামরা, পাঠাগার, পূর্ব প্রকোষ্ঠ ও উঠান) অনুসন্ধান করে ৫টি পবিত্র সুরক্ষাকারী আয়াত সংগ্রহ করুন। সব আয়াত পাওয়ার পর দক্ষিণ লোহার ফটকে গিয়ে মুক্ত হয়ে পালিয়ে যান!',
    jinnTitle: '👻 ভয়ঙ্কর জিন',
    jinnDesc:
      'অন্ধকার করিডোরে এক ভয়ানক অতৃপ্ত জিন ঘুরে বেড়াচ্ছে। কাছে আসলেই টর্চের আলো কাঁপবে, ফিসফিসানি শোনা যাবে এবং ভয় বেড়ে যাবে। জিন আপনাকে স্পর্শ করলে অথবা ভয় ১০০% হলে মৃত্যু অনিবার্য!',
    flashlightTitle: '🔦 টর্চ ও শারীরিক শক্তি',
    flashlightDesc:
      'অন্ধকার ঘরে পথ দেখতে টর্চ ব্যবহার করুন। নিরাপদে থাকলে ব্যাটারি বাঁচাতে মাঝে মাঝে নিভিয়ে রাখুন। দৌড়াতে শক্তি খরচ হয়, জিন আক্রমণ করলে বাঁচার জন্য দৌড়ানোর দম বাঁচান!',
    controlsTitle: '🎮 নিয়ন্ত্রণ ব্যবস্থা',
    controlsDesc:
      'কম্পিউটার: মাউস দিয়ে দেখুন · WASD দিয়ে হাঁটুন · Shift চেপে দৌড়ান · E দিয়ে সংগ্রহ করুন · F দিয়ে টর্চ অন/অফ · ESC দিয়ে মেনু।\nমোবাইল: ভার্চুয়াল ডি-প্যাড দিয়ে হাঁটুন · স্ক্রিনের ডানপাশে টেনে তাকান · অন-স্ক্রিন টর্চ, সংগ্রহ ও দৌড় বাটন।',
    back: 'ফিরে যান',
    desktopHint:
      'মাউস লক করতে স্ক্রিনে ক্লিক করুন · WASD: হাঁটা · SHIFT: দৌড় · E: সংগ্রহ · F: টর্চ · ESC: মেনু',
    gameOverTitle: 'জিনের কবলে মৃত্যু!',
    gameOverDesc:
      'জমিদার বাড়ির নিস্তব্ধ অন্ধকার দেওয়ালে আপনার আর্তনাদ চিরতরে মিলিয়ে গেল...',
    scripturesRecovered: 'সংগৃহীত পবিত্র আয়াত',
    score: 'স্কোর',
    tryAgain: 'আবার চেষ্টা করুন',
    victoryTitle: 'আপনি মুক্ত ও সফল!',
    victoryDesc:
      '৫টি পবিত্র আয়াতের শক্তিতে অপশক্তির মায়াজাল ভেঙে আপনি রাতের অন্ধকারে নিরাপদে পালিয়ে যেতে সক্ষম হয়েছেন!',
    finalStats: 'সর্বমোট স্কোর ও সময়',
    time: 'সময়',
    playAgain: 'আবার খেলুন',
    pts: 'পয়েন্ট',
  },
};

export default function App() {
  const {sdk} = usePlayground();
  const [exitChat] = useRpc<Record<string, unknown>, void>('ExitChat');
  const isMobile = useIsMobile();

  const [language, setLanguage] = useState<Language>('en');
  const t = TRANSLATIONS[language];

  const [gameState, setGameState] = useState<GameState>({
    status: 'START',
    score: 0,
    level: 1,
    timer: 0,
  });

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const [gameKey, setGameKey] = useState(0);
  const [collectedIds, setCollectedIds] = useState<string[]>([]);
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [howToPlayOrigin, setHowToPlayOrigin] = useState<'START' | 'GAME_MENU'>('START');

  // Audio toggles inside Game Menu
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [isSfxMuted, setIsSfxMuted] = useState(false);

  // Realtime HUD stats updated by Game.tsx frame loop
  const [hudStats, setHudStats] = useState<HUDStats>({
    stamina: 100,
    battery: 100,
    fear: 0,
    flashlightOn: true,
    nearPrompt: null,
    jinnDistance: 30,
  });

  // Unified Input Ref
  const inputRef = useRef<InputSnapshot>({
    actions: {
      left: false,
      right: false,
      up: false,
      down: false,
      confirm: false,
      cancel: false,
      tap: false,
    },
    pointer: {nx: 0, ny: 0, clientX: 0, clientY: 0, down: false},
  });

  // Timer counter during gameplay
  useEffect(() => {
    if (gameState.status !== 'PLAYING' || isGameMenuOpen || isHowToPlayOpen)
      return;
    const timerId = setInterval(() => {
      setGameState((prev) => ({
        ...prev,
        timer: (prev.timer || 0) + 1,
      }));
    }, 1000);
    return () => clearInterval(timerId);
  }, [gameState.status, isGameMenuOpen, isHowToPlayOpen]);

  // Sync window back key handler
  useEffect(() => {
    (window as unknown as Record<string, unknown>).canHandleBackKey = [
      'PLAYING',
      'PAUSED',
    ].includes(gameState.status);
  }, [gameState.status]);

  // Escape key listener to toggle Game Menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (gameState.status === 'PLAYING') {
          if (isHowToPlayOpen) {
            setIsHowToPlayOpen(false);
          } else {
            setIsGameMenuOpen((prev) => !prev);
          }
        }
      }
      if (e.key.toLowerCase() === 'f' && gameState.status === 'PLAYING') {
        (inputRef.current as any).customFlashlight = true;
      }
      if (e.key.toLowerCase() === 'e' && gameState.status === 'PLAYING') {
        (inputRef.current as any).customInteract = true;
      }
      if (e.key === 'Shift' && gameState.status === 'PLAYING') {
        (inputRef.current as any).customSprint = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f') {
        (inputRef.current as any).customFlashlight = false;
      }
      if (e.key.toLowerCase() === 'e') {
        (inputRef.current as any).customInteract = false;
      }
      if (e.key === 'Shift') {
        (inputRef.current as any).customSprint = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.status, isHowToPlayOpen]);

  // Start / Restart run
  const initGame = useCallback(() => {
    setCollectedIds([]);
    setIsGameMenuOpen(false);
    setIsHowToPlayOpen(false);
    setGameState({
      status: 'PLAYING',
      score: 0,
      level: 1,
      timer: 0,
    });
    setGameKey((prev) => prev + 1);

    if (sdk) {
      sdk.startGame();
    }
  }, [sdk]);

  // SDK Lifecycle hook
  usePlaygroundGameLifecycle(gameState, sdk);

  // Auto-play support for preview screenshot runner
  const hasAutoplayed = useRef(false);
  useEffect(() => {
    if (
      !hasAutoplayed.current &&
      new URLSearchParams(window.location.search).has('autoplay')
    ) {
      hasAutoplayed.current = true;
      initGame();
    }
  }, [initGame]);

  const handleCollectScripture = useCallback((id: string) => {
    setCollectedIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      setGameState((g) => ({
        ...g,
        score: next.length * 200,
      }));
      return next;
    });
  }, []);

  const handleUpdateHUD = useCallback((stats: HUDStats) => {
    setHudStats(stats);
  }, []);

  const isMusicPlaying =
    ['PLAYING', 'PAUSED'].includes(gameState.status) && !isMusicMuted;

  // Touch look drag handler for mobile
  const touchLookStart = useRef<{x: number; y: number} | null>(null);

  const handleTouchLookStart = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    touchLookStart.current = {x: e.clientX, y: e.clientY};
  };

  const handleTouchLookMove = (e: React.PointerEvent) => {
    if (!touchLookStart.current) return;
    const dx = e.clientX - touchLookStart.current.x;
    const dy = e.clientY - touchLookStart.current.y;
    touchLookStart.current = {x: e.clientX, y: e.clientY};

    const curDelta = (inputRef.current as any).touchLookDelta || {x: 0, y: 0};
    (inputRef.current as any).touchLookDelta = {
      x: curDelta.x + dx,
      y: curDelta.y + dy,
    };
  };

  const handleTouchLookEnd = () => {
    touchLookStart.current = null;
  };

  const fearPercent = Math.min(100, Math.max(0, Math.floor(hudStats.fear)));
  const batteryPercent = Math.min(
    100,
    Math.max(0, Math.floor(hudStats.battery)),
  );
  const staminaPercent = Math.min(
    100,
    Math.max(0, Math.floor(hudStats.stamina)),
  );

  return (
    <div className="fixed inset-0 overflow-hidden touch-none flex flex-col bg-zinc-950 text-white font-sans select-none">
      {/* Background Horror Music Player */}
      <BackgroundMusic
        url={getConfig('backgroundMusicUrl')}
        isPlaying={isMusicPlaying}
        isMuted={isMusicMuted}
        volume={getConfig('defaultMusicVolume')}
      />

      {/* Screen edge Fear / Distortion Overlay */}
      {gameState.status === 'PLAYING' && fearPercent > 10 && (
        <div
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
          style={{
            boxShadow: `inset 0 0 ${Math.min(160, fearPercent * 1.8)}px rgba(${
              fearPercent > 60 ? '180, 20, 20' : '90, 10, 10'
            }, ${fearPercent / 120})`,
          }}
        />
      )}

      {/* MAIN TOP HUD BAR */}
      {gameState.status === 'PLAYING' && (
        <div className="w-full flex justify-between items-center px-4 md:px-8 py-2 md:py-3 pointer-events-none z-20 shrink-0 bg-gradient-to-b from-black/80 to-transparent">
          {/* Top-Left: Sacred Relics Counter & Vital Horror Meters */}
          <div className="flex flex-col gap-1 pointer-events-auto">
            <div className="flex items-center gap-3">
              <div className="bg-amber-950/80 border border-amber-600/60 rounded px-2.5 py-1 flex items-center gap-1.5 shadow-lg backdrop-blur-sm">
                <span className="text-amber-300 text-xs md:text-sm font-black tracking-wider font-serif">
                  📜 {t.scriptures}:
                </span>
                <span className="text-yellow-400 font-black text-sm md:text-base">
                  {collectedIds.length} / {SCRIPTURE_DATA.length}
                </span>
              </div>

              {gameState.timer !== undefined && (
                <div className="bg-zinc-900/80 border border-zinc-700/60 rounded px-2.5 py-1 text-xs md:text-sm text-zinc-300 font-mono">
                  ⏱ {formatTime(gameState.timer)}
                </div>
              )}
            </div>

            {/* Vital Bars Row: Fear, Flashlight Battery, Stamina */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[10px] md:text-xs">
              {/* Fear Meter */}
              <div className="flex items-center gap-1.5 bg-black/70 border border-zinc-800 rounded px-2 py-0.5">
                <Flame
                  size={12}
                  className={fearPercent > 50 ? 'text-red-500 animate-pulse' : 'text-zinc-400'}
                />
                <span className="text-zinc-300 font-semibold">{t.fear}:</span>
                <div className="w-14 md:w-20 h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                  <div
                    className={`h-full transition-all duration-200 ${
                      fearPercent > 70
                        ? 'bg-red-600 animate-pulse'
                        : fearPercent > 40
                        ? 'bg-orange-500'
                        : 'bg-yellow-500'
                    }`}
                    style={{width: `${fearPercent}%`}}
                  />
                </div>
                <span className="font-mono text-zinc-400">{fearPercent}%</span>
              </div>

              {/* Flashlight Battery */}
              <div className="flex items-center gap-1.5 bg-black/70 border border-zinc-800 rounded px-2 py-0.5">
                <Zap
                  size={12}
                  className={hudStats.flashlightOn ? 'text-yellow-400' : 'text-zinc-600'}
                />
                <span className="text-zinc-300 font-semibold">{t.battery}:</span>
                <div className="w-12 md:w-16 h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                  <div
                    className="h-full bg-yellow-400 transition-all duration-200"
                    style={{width: `${batteryPercent}%`}}
                  />
                </div>
                <span className="font-mono text-zinc-400">{batteryPercent}%</span>
              </div>

              {/* Stamina */}
              <div className="flex items-center gap-1.5 bg-black/70 border border-zinc-800 rounded px-2 py-0.5">
                <Activity size={12} className="text-cyan-400" />
                <span className="text-zinc-300 font-semibold">{t.stamina}:</span>
                <div className="w-12 md:w-16 h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-200"
                    style={{width: `${staminaPercent}%`}}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Top-Right: RESERVED EXCLUSIVELY FOR GAME MENU BUTTON */}
          <div className="pointer-events-auto shrink-0 pl-2">
            <button
              onClick={() => {
                gameAudio.playCrispClick();
                setIsGameMenuOpen(true);
              }}
              data-testid="menu-button"
              className="bg-zinc-800/90 hover:bg-zinc-700 text-amber-400 border border-amber-600/60 font-bold px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm tracking-wide shadow-lg transition-all flex items-center gap-1.5 backdrop-blur-md active:scale-95">
              <span>≡</span>
              <span>{t.menu}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3D WEBGL HORROR CANVAS CONTAINER */}
      <div className="flex-1 w-full min-h-0 relative flex items-center justify-center">
        <Game
          key={gameKey}
          gameState={gameState}
          setGameState={setGameState}
          exitChat={exitChat}
          gameStateRef={gameStateRef}
          onCollectScripture={handleCollectScripture}
          onUpdateHUD={handleUpdateHUD}
          collectedIds={collectedIds}
          isTouchDevice={isMobile}
          inputRef={inputRef}
        />

        {/* Center Crosshair & Interaction Prompt */}
        {gameState.status === 'PLAYING' && !isGameMenuOpen && !isHowToPlayOpen && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center z-15">
            {/* Center Reticle */}
            <div className="w-1.5 h-1.5 rounded-full bg-amber-200/60 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />

            {/* Interaction Prompt Box */}
            {hudStats.nearPrompt && (
              <div className="mt-8 bg-black/85 border border-amber-500/80 px-4 py-2 rounded-lg shadow-2xl backdrop-blur-md animate-bounce">
                <p className="text-amber-300 font-bold text-xs md:text-sm tracking-wide">
                  {hudStats.nearPrompt}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Desktop Controls Hint (Bottom) */}
        {gameState.status === 'PLAYING' && !isMobile && !isGameMenuOpen && (
          <div className="absolute bottom-3 w-full text-center pointer-events-none z-10">
            <div className="inline-block bg-black/60 border border-zinc-800 px-3 py-1 rounded text-[11px] text-zinc-400">
              {t.desktopHint}
            </div>
          </div>
        )}

        {/* MOBILE ON-SCREEN CONTROLS */}
        {gameState.status === 'PLAYING' && isMobile && !isGameMenuOpen && (
          <div className="absolute inset-0 pointer-events-none z-25 flex justify-between items-end p-4 md:p-8">
            {/* Touch Look Zone (Right Screen Drag) */}
            <div
              className="absolute inset-0 pointer-events-auto touch-none"
              onPointerDown={handleTouchLookStart}
              onPointerMove={handleTouchLookMove}
              onPointerUp={handleTouchLookEnd}
              onPointerCancel={handleTouchLookEnd}
            />

            {/* Bottom-Left Virtual Movement D-Pad */}
            <div className="relative pointer-events-auto z-30 flex flex-col items-center gap-1 bg-black/50 p-2 rounded-2xl border border-zinc-800/60 backdrop-blur-sm">
              <button
                onPointerDown={() => (inputRef.current.actions.up = true)}
                onPointerUp={() => (inputRef.current.actions.up = false)}
                onPointerLeave={() => (inputRef.current.actions.up = false)}
                className="w-12 h-12 bg-zinc-800/90 active:bg-amber-600 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow">
                ▲
              </button>
              <div className="flex gap-2">
                <button
                  onPointerDown={() => (inputRef.current.actions.left = true)}
                  onPointerUp={() => (inputRef.current.actions.left = false)}
                  onPointerLeave={() => (inputRef.current.actions.left = false)}
                  className="w-12 h-12 bg-zinc-800/90 active:bg-amber-600 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow">
                  ◀
                </button>
                <button
                  onPointerDown={() => (inputRef.current.actions.down = true)}
                  onPointerUp={() => (inputRef.current.actions.down = false)}
                  onPointerLeave={() => (inputRef.current.actions.down = false)}
                  className="w-12 h-12 bg-zinc-800/90 active:bg-amber-600 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow">
                  ▼
                </button>
                <button
                  onPointerDown={() => (inputRef.current.actions.right = true)}
                  onPointerUp={() => (inputRef.current.actions.right = false)}
                  onPointerLeave={() => (inputRef.current.actions.right = false)}
                  className="w-12 h-12 bg-zinc-800/90 active:bg-amber-600 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow">
                  ▶
                </button>
              </div>
            </div>

            {/* Bottom-Right Action Buttons Cluster */}
            <div className="relative pointer-events-auto z-30 flex flex-col items-end gap-2">
              {/* Sprint Button */}
              <button
                onPointerDown={() =>
                  ((inputRef.current as any).customSprint = true)
                }
                onPointerUp={() =>
                  ((inputRef.current as any).customSprint = false)
                }
                onPointerLeave={() =>
                  ((inputRef.current as any).customSprint = false)
                }
                className="w-12 h-12 bg-cyan-950/90 border border-cyan-500/60 active:bg-cyan-600 rounded-full flex flex-col items-center justify-center text-[10px] font-bold text-cyan-200 shadow-lg">
                <Activity size={16} />
                {t.run}
              </button>

              <div className="flex gap-2">
                {/* Flashlight Toggle */}
                <button
                  onPointerDown={() => {
                    (inputRef.current as any).customFlashlight = true;
                    setTimeout(() => {
                      (inputRef.current as any).customFlashlight = false;
                    }, 100);
                  }}
                  className={`w-14 h-14 border rounded-full flex flex-col items-center justify-center text-[10px] font-bold shadow-lg transition-colors ${
                    hudStats.flashlightOn
                      ? 'bg-amber-500/90 border-amber-300 text-black'
                      : 'bg-zinc-800/90 border-zinc-600 text-zinc-400'
                  }`}>
                  <Zap size={18} />
                  {t.torch}
                </button>

                {/* Interact / Collect Button */}
                <button
                  onPointerDown={() => {
                    (inputRef.current as any).customInteract = true;
                    setTimeout(() => {
                      (inputRef.current as any).customInteract = false;
                    }, 150);
                  }}
                  className="w-14 h-14 bg-amber-700/90 border border-amber-400 active:bg-amber-500 rounded-full flex flex-col items-center justify-center text-[10px] font-bold text-white shadow-xl">
                  <Flame size={18} />
                  {t.collect}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- UI SCREENS & OVERLAYS --- */}

      {/* 1. START MENU (Authentic Bengali Zamidar Gothic Horror Theme) */}
      {gameState.status === 'START' && (
        <MenuOverlay tone="neutral">
          <div className="w-full max-w-md flex flex-col items-center bg-zinc-950 border-2 border-amber-700/60 rounded-2xl p-6 md:p-8 m-4 shadow-[0_0_50px_rgba(180,83,9,0.3)] relative">
            {/* Top Bar Language Toggle Button */}
            <div className="w-full flex justify-between items-center mb-3">
              <div className="text-amber-500 text-xs uppercase tracking-widest font-mono font-bold">
                {t.genreBadge}
              </div>

              {/* Language Switcher */}
              <button
                onClick={() => {
                  gameAudio.playCrispClick();
                  setLanguage((prev) => (prev === 'en' ? 'bn' : 'en'));
                }}
                className="bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/50 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow active:scale-95">
                <Globe size={13} />
                <span>{t.langToggle}</span>
              </button>
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-amber-400 text-center mb-3 font-serif tracking-wide drop-shadow-[0_2px_10px_rgba(234,179,8,0.5)]">
              {t.title}
            </h1>
            <p className="text-zinc-300 text-xs md:text-sm text-center mb-6 leading-relaxed border-y border-zinc-800 py-3">
              {t.story}
            </p>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => {
                  gameAudio.playCrispClick();
                  initGame();
                }}
                autoFocus
                data-testid="start-button"
                className="w-full bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black px-6 py-3 rounded-full font-black text-base md:text-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-lg">
                <Play size={22} className="fill-black" />
                {t.enterMansion}
              </button>

              <button
                onClick={() => {
                  gameAudio.playCrispClick();
                  setHowToPlayOrigin('START');
                  setIsHowToPlayOpen(true);
                }}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 px-6 py-2.5 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-2">
                <HelpCircle size={18} />
                {t.howToPlay}
              </button>
            </div>

            {/* Developed by Footer on Title Screen */}
            <div className="mt-6 pt-3 border-t border-zinc-900 w-full text-center">
              <span className="text-[11px] md:text-xs font-serif text-amber-500/80 tracking-wider">
                {t.developedBy}
              </span>
            </div>
          </div>
        </MenuOverlay>
      )}

      {/* 2. GAME MENU OVERLAY (Mandatory Shared Architecture) */}
      {isGameMenuOpen && (
        <MenuOverlay tone="neutral" zIndex={40}>
          <div className="w-full max-w-md flex flex-col items-center bg-zinc-950 border-2 border-amber-600/70 rounded-2xl p-6 md:p-8 m-4 shadow-2xl">
            <h2 className="text-2xl md:text-3xl font-black text-amber-400 text-center mb-6 font-serif">
              {t.gameMenuTitle}
            </h2>

            <div className="w-full flex flex-col gap-3">
              {/* Resume Button */}
              <button
                onClick={() => {
                  gameAudio.playCrispClick();
                  setIsGameMenuOpen(false);
                }}
                autoFocus
                className="w-full bg-amber-500 hover:bg-amber-400 text-black py-2.5 rounded-xl font-bold text-base transition-colors flex items-center justify-center gap-2">
                <Play size={20} className="fill-black" />
                {t.resume}
              </button>

              {/* Audio Controls (SFX & Music Toggles) */}
              <div className="grid grid-cols-2 gap-2 my-1">
                <button
                  onClick={() => {
                    const newMuted = gameAudio.toggleMute();
                    setIsSfxMuted(newMuted);
                  }}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                    isSfxMuted
                      ? 'bg-zinc-900 text-zinc-500 border-zinc-800'
                      : 'bg-zinc-800 text-amber-300 border-amber-600/50'
                  }`}>
                  {isSfxMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  {t.sfx}: {isSfxMuted ? 'OFF' : 'ON'}
                </button>

                <button
                  onClick={() => {
                    setIsMusicMuted((prev) => !prev);
                  }}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                    isMusicMuted
                      ? 'bg-zinc-900 text-zinc-500 border-zinc-800'
                      : 'bg-zinc-800 text-amber-300 border-amber-600/50'
                  }`}>
                  {isMusicMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  {t.music}: {isMusicMuted ? 'OFF' : 'ON'}
                </button>
              </div>

              {/* How to Play Guide */}
              <button
                onClick={() => {
                  gameAudio.playCrispClick();
                  setHowToPlayOrigin('GAME_MENU');
                  setIsHowToPlayOpen(true);
                }}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 py-2.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                <HelpCircle size={18} />
                {t.howToPlay}
              </button>

              {/* Try Level Again */}
              <button
                onClick={() => {
                  gameAudio.playCrispClick();
                  initGame();
                }}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 py-2.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                <RotateCw size={18} />
                {t.restart}
              </button>

              {/* Quit to Main Menu */}
              <button
                onClick={() => {
                  gameAudio.playCrispClick();
                  setIsGameMenuOpen(false);
                  setGameState((prev) => ({...prev, status: 'START'}));
                }}
                className="w-full bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 py-2.5 rounded-xl font-bold text-sm transition-colors mt-2">
                {t.quit}
              </button>
            </div>
          </div>
        </MenuOverlay>
      )}

      {/* 3. HOW TO PLAY OVERLAY */}
      {isHowToPlayOpen && (
        <MenuOverlay tone="neutral" zIndex={1001}>
          <div className="w-full max-w-lg flex flex-col bg-zinc-950 border-2 border-amber-600 rounded-2xl p-6 md:p-8 m-4 shadow-2xl text-zinc-200">
            <h2 className="text-2xl font-black text-amber-400 text-center mb-4 font-serif">
              {t.guideTitle}
            </h2>

            <div className="flex flex-col gap-3 text-xs md:text-sm max-h-[60vh] overflow-y-auto pr-2">
              <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                <h3 className="font-bold text-amber-300 mb-1">{t.missionTitle}</h3>
                <p className="text-zinc-300">{t.missionDesc}</p>
              </div>

              <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                <h3 className="font-bold text-red-400 mb-1">{t.jinnTitle}</h3>
                <p className="text-zinc-300">{t.jinnDesc}</p>
              </div>

              <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                <h3 className="font-bold text-cyan-300 mb-1">{t.flashlightTitle}</h3>
                <p className="text-zinc-300">{t.flashlightDesc}</p>
              </div>

              <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                <h3 className="font-bold text-yellow-300 mb-1">{t.controlsTitle}</h3>
                <p className="text-zinc-300 whitespace-pre-line">{t.controlsDesc}</p>
              </div>
            </div>

            <button
              onClick={() => {
                gameAudio.playCrispClick();
                setIsHowToPlayOpen(false);
              }}
              autoFocus
              className="mt-6 w-full bg-amber-500 hover:bg-amber-400 text-black py-3 rounded-xl font-black text-sm tracking-wide transition-colors">
              {t.back}
            </button>
          </div>
        </MenuOverlay>
      )}

      {/* 4. GAME OVER SCREEN */}
      {gameState.status === 'GAME_OVER' && (
        <MenuOverlay tone="danger">
          <div className="w-full max-w-md flex flex-col items-center bg-zinc-950 border-2 border-red-700 rounded-2xl p-6 md:p-8 m-4 shadow-[0_0_50px_rgba(220,38,38,0.5)]">
            <h2 className="text-3xl md:text-4xl font-black text-red-500 text-center mb-2 font-serif tracking-wider animate-pulse">
              {t.gameOverTitle}
            </h2>
            <p className="text-zinc-300 text-xs md:text-sm text-center mb-4">
              {t.gameOverDesc}
            </p>

            <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-4 w-full text-center mb-6">
              <div className="text-xs text-red-300 uppercase tracking-widest font-mono">
                {t.scripturesRecovered}
              </div>
              <div className="text-2xl font-black text-amber-400 font-mono my-1">
                {collectedIds.length} / {SCRIPTURE_DATA.length}
              </div>
              <div className="text-xs text-zinc-400">
                {t.score}: {gameState.score} {t.pts}
              </div>
            </div>

            <button
              onClick={() => {
                gameAudio.playCrispClick();
                initGame();
              }}
              autoFocus
              className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-full font-black text-base md:text-lg transition-colors flex items-center justify-center gap-2 shadow-lg">
              <RotateCw size={22} />
              {t.tryAgain}
            </button>
          </div>
        </MenuOverlay>
      )}

      {/* 5. VICTORY SCREEN */}
      {gameState.status === 'VICTORY' && (
        <MenuOverlay tone="victory">
          <div className="w-full max-w-md flex flex-col items-center bg-zinc-950 border-2 border-emerald-500 rounded-2xl p-6 md:p-8 m-4 shadow-[0_0_50px_rgba(16,185,129,0.4)]">
            <h2 className="text-3xl md:text-4xl font-black text-emerald-400 text-center mb-2 font-serif tracking-wider">
              {t.victoryTitle}
            </h2>
            <p className="text-zinc-300 text-xs md:text-sm text-center mb-4">
              {t.victoryDesc}
            </p>

            <div className="bg-emerald-950/40 border border-emerald-700/60 rounded-xl p-4 w-full text-center mb-6">
              <div className="text-xs text-emerald-300 uppercase tracking-widest font-mono">
                {t.finalStats}
              </div>
              <div className="text-3xl font-black text-yellow-400 font-mono my-1">
                {gameState.score} {t.pts}
              </div>
              {gameState.timer !== undefined && (
                <div className="text-xs text-zinc-300 font-mono">
                  {t.time}: {formatTime(gameState.timer)}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                gameAudio.playCrispClick();
                initGame();
              }}
              autoFocus
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-full font-black text-base md:text-lg transition-colors flex items-center justify-center gap-2 shadow-lg">
              <RotateCw size={22} />
              {t.playAgain}
            </button>
          </div>
        </MenuOverlay>
      )}
    </div>
  );
}
