import React, { useState, useEffect, useRef } from 'react';

export default function CAHighSpeedRailClock() {
  const POLL_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
  const POLL_LAST_VOTE_AT_KEY = 'hsrPollLastVoteAt';

  // Audio player state
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Base data points
  const projectStartDate = new Date('2008-11-04'); // Prop 1A passed
  const constructionStartDate = new Date('2015-01-06');
  const baselineDate = new Date('2026-01-01');
  const baselineSpent = 16550000000; // ~$16.55 billion spent by Jan 2026

  // Spending rate: approximately $1.5-2 billion per year during active construction
  // Using ~$1.8 billion/year = ~$57/second
  const spendingPerSecond = 57;

  // Project estimates
  const projectedTotalLow = 106000000000;
  const projectedTotalHigh = 135000000000;
  const originalEstimate = 33000000000;
  const mercedBakersfieldCost = 38500000000;

  // Miles data
  const totalPhase1Miles = 494;
  const centralValleyMiles = 171;
  const completedGuidewayMiles = 70;

  const [currentSpent, setCurrentSpent] = useState(baselineSpent);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pollVotes, setPollVotes] = useState({ up: 0, down: 0 });
  const [isVoting, setIsVoting] = useState(false);
  const [voteCooldownUntil, setVoteCooldownUntil] = useState(() => {
    try {
      const raw = localStorage.getItem(POLL_LAST_VOTE_AT_KEY);
      const lastVoteAt = raw ? Number(raw) : 0;
      if (!Number.isFinite(lastVoteAt) || lastVoteAt <= 0) return 0;
      return lastVoteAt + POLL_COOLDOWN_MS;
    } catch {
      return 0;
    }
  });
  const lastSaveRef = useRef(Date.now());

  const hasVoted = voteCooldownUntil > Date.now();

  const formatDuration = (ms) => {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  // Initialize database on first load (only runs once)
  useEffect(() => {
    const initDb = async () => {
      try {
        await fetch('/api/init-db', { method: 'POST' });
      } catch (e) {
        console.log('DB init skipped or failed:', e);
      }
    };
    initDb();
  }, []);

  // Load saved spending from database on mount
  useEffect(() => {
    const loadSavedSpending = async () => {
      try {
        const res = await fetch('/api/spending');
        const data = await res.json();
        if (data.amountSpent && data.recordedAt) {
          // Calculate current amount based on saved snapshot
          const savedTime = new Date(data.recordedAt);
          const now = new Date();
          const secondsSinceSave = (now - savedTime) / 1000;
          const currentAmount = data.amountSpent + (secondsSinceSave * spendingPerSecond);
          setCurrentSpent(currentAmount);
        }
      } catch (e) {
        console.log('Could not load saved spending:', e);
      }
    };
    loadSavedSpending();
  }, []);

  // Load poll votes on mount
  useEffect(() => {
    const loadPollVotes = async () => {
      try {
        const res = await fetch('/api/poll');
        const data = await res.json();
        setPollVotes(data);
      } catch (e) {
        console.log('Could not load poll votes:', e);
      }
    };
    loadPollVotes();
  }, []);

  // Clear cooldown when it expires
  useEffect(() => {
    if (!voteCooldownUntil) return;

    const msLeft = voteCooldownUntil - Date.now();
    if (msLeft <= 0) {
      setVoteCooldownUntil(0);
      try {
        localStorage.removeItem(POLL_LAST_VOTE_AT_KEY);
      } catch {
        // ignore
      }
      return;
    }

    const timeoutId = setTimeout(() => {
      setVoteCooldownUntil(0);
      try {
        localStorage.removeItem(POLL_LAST_VOTE_AT_KEY);
      } catch {
        // ignore
      }
    }, msLeft + 25);

    return () => clearTimeout(timeoutId);
  }, [voteCooldownUntil]);

  // Save spending to database every 10 minutes
  const saveSpending = async (amount) => {
    try {
      await fetch('/api/spending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountSpent: amount })
      });
      lastSaveRef.current = Date.now();
    } catch (e) {
      console.log('Could not save spending:', e);
    }
  };

  useEffect(() => {
    // Respect reduced motion preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const updateInterval = prefersReducedMotion ? 1000 : 50;

    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      const secondsSinceBaseline = (now - baselineDate) / 1000;
      const newTotal = baselineSpent + (secondsSinceBaseline * spendingPerSecond);
      setCurrentSpent(newTotal);

      // Save to database every 10 minutes (600000 ms)
      if (Date.now() - lastSaveRef.current >= 600000) {
        saveSpending(newTotal);
      }
    }, updateInterval);

    return () => clearInterval(interval);
  }, []);

  // Handle poll vote
  const handleVote = async (voteType) => {
    if (hasVoted || isVoting) return;

    setIsVoting(true);
    try {
      const res = await fetch('/api/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType })
      });
      const data = await res.json();
      setPollVotes(data);
      const now = Date.now();
      setVoteCooldownUntil(now + POLL_COOLDOWN_MS);
      try {
        localStorage.setItem(POLL_LAST_VOTE_AT_KEY, String(now));
        localStorage.removeItem('hsrPollVoted');
      } catch {
        // ignore
      }
    } catch (e) {
      console.log('Could not submit vote:', e);
    }
    setIsVoting(false);
  };

  const formatCurrency = (amount, decimals = 0) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  };

  const formatNumber = (num, decimals = 0) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  const daysSinceStart = Math.floor((currentTime - projectStartDate) / (1000 * 60 * 60 * 24));
  const yearsSinceStart = (currentTime - projectStartDate) / (1000 * 60 * 60 * 24 * 365.25);
  const costPerMileCompleted = currentSpent / completedGuidewayMiles;
  const percentOfLowEstimate = (currentSpent / projectedTotalLow) * 100;
  const costOverrun = ((projectedTotalLow - originalEstimate) / originalEstimate) * 100;

  const shareText = `California has spent ${formatCurrency(currentSpent, 0)} on High-Speed Rail since 2008. That's +${formatNumber(costOverrun, 0)}% over the original $33B estimate. 0 miles of high-speed track laid.`;
  const shareUrl = 'https://high-speed-rail.vercel.app/';
  const xShareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Background Music */}
      <audio
        ref={audioRef}
        src="/Where'd You Go - Fort Minor _ Lyrics Song.mp3"
        loop
        onEnded={() => setIsPlaying(false)}
      />

      {/* Floating Music Control Button */}
      <button
        onClick={toggleMusic}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gray-800 hover:bg-gray-700 border-2 border-yellow-500 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        aria-label={isPlaying ? 'Pause music' : 'Play music'}
        title={isPlaying ? 'Pause music' : 'Play music'}
      >
        {isPlaying ? (
          <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="max-w-6xl mx-auto">
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-6">
          {/* Creator Credit */}
          <a
            href="https://x.com/lamps_apple"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group p-2 -m-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="text-sm">@lamps_apple</span>
          </a>

          {/* Share Button */}
          <a
            href={xShareLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 px-4 py-3 rounded-full transition-all text-sm min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>Share</span>
          </a>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-yellow-400 mb-2">
            CALIFORNIA HIGH-SPEED RAIL
          </h1>
          <h2 className="text-xl md:text-2xl text-yellow-400">
            REAL-TIME SPENDING CLOCK
          </h2>
          <p className="text-gray-400 mt-2 text-sm">
            {currentTime.toLocaleString()}
          </p>
        </div>

        {/* Main Counter */}
        <div className="bg-black border-4 border-yellow-500/70 rounded-lg p-8 mb-8 text-center">
          <p className="text-yellow-400/80 text-sm uppercase tracking-widest mb-4">Total Spent to Date</p>
          <p className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-mono text-white tracking-wider drop-shadow-[0_0_30px_rgba(34,197,94,0.5)]">
            {formatCurrency(currentSpent, 0)}
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-gray-400 text-sm">+${spendingPerSecond}/second</span>
          </div>
        </div>

        {/* Poll Section */}
        <div className="bg-gray-800 border-2 border-cyan-500 rounded-lg p-5 mb-8">
          <h3 className="text-cyan-400 text-sm uppercase tracking-wider mb-4 text-center font-semibold">
            Are you happy with the progress so far?
          </h3>

          <div className="flex justify-center gap-8">
            {/* Thumbs Up */}
            <button
              onClick={() => handleVote('up')}
              disabled={hasVoted || isVoting}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all min-w-[100px] ${hasVoted
                ? 'bg-gray-700 cursor-default'
                : 'bg-gray-700 hover:bg-green-900/50 hover:border-green-500 cursor-pointer active:scale-95'
                } border-2 ${hasVoted ? 'border-gray-600' : 'border-gray-600 hover:border-green-500'}`}
            >
              <span className="text-4xl" role="img" aria-label="thumbs up">👍</span>
              <span className="text-2xl font-mono text-green-400">{formatNumber(pollVotes.up)}</span>
              <span className="text-xs text-gray-400">Yes</span>
            </button>

            {/* Thumbs Down */}
            <button
              onClick={() => handleVote('down')}
              disabled={hasVoted || isVoting}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all min-w-[100px] ${hasVoted
                ? 'bg-gray-700 cursor-default'
                : 'bg-gray-700 hover:bg-red-900/50 hover:border-red-500 cursor-pointer active:scale-95'
                } border-2 ${hasVoted ? 'border-gray-600' : 'border-gray-600 hover:border-red-500'}`}
            >
              <span className="text-4xl" role="img" aria-label="thumbs down">👎</span>
              <span className="text-2xl font-mono text-red-400">{formatNumber(pollVotes.down)}</span>
              <span className="text-xs text-gray-400">No</span>
            </button>
          </div>

          {hasVoted && (
            <p className="text-center text-gray-400 text-sm mt-4">
              Thanks for voting! You can vote again in {formatDuration(voteCooldownUntil - currentTime.getTime())}.
            </p>
          )}
          {isVoting && (
            <p className="text-center text-gray-400 text-sm mt-4">Submitting...</p>
          )}
        </div>

        {/* Time Elapsed Section */}
        <div className="mb-8">
          <h3 className="text-red-400 text-xs uppercase tracking-wider mb-3 text-center font-semibold">Time Elapsed</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-800 border-2 border-red-500 rounded-lg p-5 text-center">
              <p className="text-red-400 text-sm mb-2">DAYS SINCE APPROVAL</p>
              <p className="text-2xl md:text-3xl font-mono text-white">
                {formatNumber(daysSinceStart)}
              </p>
              <p className="text-gray-400 text-xs mt-1">Nov 4, 2008</p>
            </div>

            <div className="bg-gray-800 border-2 border-red-500 rounded-lg p-5 text-center">
              <p className="text-red-400 text-sm mb-2">YEARS ELAPSED</p>
              <p className="text-2xl md:text-3xl font-mono text-white">
                {formatNumber(yearsSinceStart, 2)}
              </p>
              <p className="text-gray-400 text-xs mt-1">and counting</p>
            </div>
          </div>
        </div>

        {/* Cost Estimates Section */}
        <div className="mb-8">
          <h3 className="text-yellow-400 text-xs uppercase tracking-wider mb-3 text-center font-semibold">Cost Estimates</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-800 border-2 border-orange-500 rounded-lg p-5 text-center">
              <p className="text-orange-400 text-sm mb-2">ORIGINAL ESTIMATE</p>
              <p className="text-2xl md:text-3xl font-mono text-white">
                $33B
              </p>
              <p className="text-gray-400 text-xs mt-1">2008 projection</p>
            </div>

            <div className="bg-gray-800 border-2 border-yellow-500 rounded-lg p-5 text-center">
              <p className="text-yellow-400 text-sm mb-2">CURRENT LOW</p>
              <p className="text-2xl md:text-3xl font-mono text-white">
                $106B
              </p>
              <p className="text-gray-400 text-xs mt-1">SF to LA</p>
            </div>

            <div className="bg-gray-800 border-2 border-yellow-500 rounded-lg p-5 text-center">
              <p className="text-yellow-400 text-sm mb-2">CURRENT HIGH</p>
              <p className="text-2xl md:text-3xl font-mono text-white">
                $135B
              </p>
              <p className="text-gray-400 text-xs mt-1">DOT estimate</p>
            </div>

            <div className="bg-gray-800 border-2 border-red-600 rounded-lg p-5 text-center">
              <p className="text-red-400 text-sm mb-2">COST OVERRUN</p>
              <p className="text-2xl md:text-3xl font-mono text-red-400">
                +{formatNumber(costOverrun, 0)}%
              </p>
              <p className="text-gray-400 text-xs mt-1">vs original</p>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="mb-8">
          <h3 className="text-blue-400 text-xs uppercase tracking-wider mb-3 text-center font-semibold">Construction Progress</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-800 border-2 border-blue-500 rounded-lg p-5 text-center">
              <p className="text-blue-400 text-sm mb-2">GUIDEWAY COMPLETE</p>
              <p className="text-2xl md:text-3xl font-mono text-white">
                {completedGuidewayMiles} mi
              </p>
              <p className="text-gray-400 text-xs mt-1">of {totalPhase1Miles} mi Phase 1</p>
            </div>

            <div className="bg-gray-800 border-2 border-blue-500 rounded-lg p-5 text-center">
              <p className="text-blue-400 text-sm mb-2">PHASE 1 PROGRESS</p>
              <p className="text-2xl md:text-3xl font-mono text-white">
                {formatNumber((completedGuidewayMiles / totalPhase1Miles) * 100, 1)}%
              </p>
              <p className="text-gray-400 text-xs mt-1">miles completed</p>
            </div>

            <div className="bg-gray-800 border-2 border-purple-500 rounded-lg p-5 text-center">
              <p className="text-purple-400 text-sm mb-2">COST PER MILE</p>
              <p className="text-2xl md:text-3xl font-mono text-white">
                ${formatNumber(costPerMileCompleted / 1000000, 0)}M
              </p>
              <p className="text-gray-400 text-xs mt-1">per completed mile</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-800 border-2 border-gray-600 rounded-lg p-5 mb-8">
          <div className="flex justify-between text-sm mb-3">
            <span className="text-gray-400">Budget Spent vs Low Estimate ($106B)</span>
            <span className="text-yellow-400 font-mono">{formatNumber(percentOfLowEstimate, 1)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-6 relative">
            {/* Milestone markers */}
            <div className="absolute left-1/4 top-0 bottom-0 w-px bg-gray-600 z-10" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-600 z-10" />
            <div className="absolute left-3/4 top-0 bottom-0 w-px bg-gray-600 z-10" />
            <div
              className="bg-yellow-500 h-6 rounded-full transition-all duration-100"
              style={{ width: `${Math.min(percentOfLowEstimate, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>$0</span>
            <span>$26.5B</span>
            <span>$53B</span>
            <span>$79.5B</span>
            <span>$106B</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-gray-800 border-2 border-gray-600 rounded-lg p-5 mb-8">
          <h3 className="text-yellow-400 text-xs uppercase tracking-wider mb-6 text-center font-semibold">Project Timeline</h3>

          {/* Visual Timeline */}
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute top-3 left-8 right-8 h-0.5 bg-gray-700 hidden md:block" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="relative">
                <div className="w-6 h-6 rounded-full bg-red-500 mx-auto mb-3 relative z-10 flex items-center justify-center">
                  <span className="text-white text-xs">✕</span>
                </div>
                <p className="text-gray-400 text-xs mb-1">Original Target</p>
                <p className="text-red-400 font-bold text-xl font-mono line-through">2020</p>
              </div>

              <div className="relative">
                <div className="w-6 h-6 rounded-full bg-yellow-500 mx-auto mb-3 relative z-10" />
                <p className="text-gray-400 text-xs mb-1">Central Valley</p>
                <p className="text-yellow-400 font-bold text-xl font-mono">2032?</p>
              </div>

              <div className="relative">
                <div className="w-6 h-6 rounded-full bg-yellow-500 mx-auto mb-3 relative z-10" />
                <p className="text-gray-400 text-xs mb-1">SF-LA Connection</p>
                <p className="text-yellow-400 font-bold text-xl font-mono">2039?</p>
              </div>

              <div className="relative">
                <div className="w-6 h-6 rounded-full bg-red-600 mx-auto mb-3 relative z-10 flex items-center justify-center">
                  <span className="text-white text-xs">!</span>
                </div>
                <p className="text-gray-400 text-xs mb-1">High-Speed Track</p>
                <p className="text-red-400 font-bold text-xl font-mono">0 mi</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm space-y-1">
          <p>Data sources: CA High-Speed Rail Authority, US DOT, FRA Reports (2026)</p>
          <p>Spending rate estimated from public budget documents. For illustration purposes.</p>
        </div>
      </div>
    </div>
  );
}
