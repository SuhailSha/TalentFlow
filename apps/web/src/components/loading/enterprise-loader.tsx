'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { LogoLockup } from '@/components/brand/logo-lockup';

interface EnterpriseLoaderProps {
  /** Custom loading message */
  message?: string;
  /** Show loading stages with progress */
  showProgress?: boolean;
  /** Custom loading tips to cycle through */
  tips?: string[];
  /** Size variant */
  size?: 'default' | 'large';
  /** Custom className */
  className?: string;
}

const DEFAULT_LOADING_STAGES = [
  { label: 'Initializing workspace', duration: 800 },
  { label: 'Loading user preferences', duration: 600 },
  { label: 'Syncing data', duration: 700 },
  { label: 'Preparing dashboard', duration: 500 },
];

const DEFAULT_TIPS = [
  'TalentFlow helps you streamline your entire recruitment process',
  'Use keyboard shortcuts: Cmd+K (Mac) or Ctrl+K (Windows) to open command palette',
  'Set up automated workflows to save time on repetitive tasks',
  'Export your data anytime with our comprehensive export features',
  'Collaborate with your team using shared notes and candidate reviews',
];

export function EnterpriseLoader({
  message,
  showProgress = true,
  tips = DEFAULT_TIPS,
  size = 'default',
  className,
}: EnterpriseLoaderProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentTip, setCurrentTip] = useState(0);

  // Animate through loading stages
  useEffect(() => {
    if (!showProgress) return;

    let interval: NodeJS.Timeout;

    const animateStage = (stageIndex: number) => {
      if (stageIndex >= DEFAULT_LOADING_STAGES.length) return;

      const stage = DEFAULT_LOADING_STAGES[stageIndex];
      if (!stage) return; // Safety check for undefined stage

      const startProgress = (stageIndex / DEFAULT_LOADING_STAGES.length) * 100;
      const endProgress = ((stageIndex + 1) / DEFAULT_LOADING_STAGES.length) * 100;

      setCurrentStage(stageIndex);

      // Smooth progress animation for current stage
      const progressDuration = stage.duration;
      const steps = 60; // 60 steps for smooth animation
      const stepDuration = progressDuration / steps;
      let step = 0;

      interval = setInterval(() => {
        step++;
        const stageProgress = (step / steps) * (endProgress - startProgress);
        setProgress(startProgress + stageProgress);

        if (step >= steps) {
          clearInterval(interval);
          setTimeout(() => animateStage(stageIndex + 1), 100);
        }
      }, stepDuration);
    };

    animateStage(0);

    return () => {
      clearInterval(interval);
    };
  }, [showProgress]);

  // Cycle through tips
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [tips.length]);

  const isLarge = size === 'large';

  return (
    <div
      className={cn(
        'flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800',
        className,
      )}
    >
      <div className="relative flex w-full max-w-md flex-col items-center space-y-8 px-8 text-center">
        {/* Background decoration */}
        <div className="absolute -top-32 -left-32 h-64 w-64 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 opacity-20 blur-3xl dark:from-brand-900 dark:to-brand-800" />
        <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-gradient-to-br from-brand-200 to-brand-300 opacity-20 blur-3xl dark:from-brand-800 dark:to-brand-700" />

        {/* Logo */}
        <div className="relative">
          <LogoLockup size={isLarge ? 'lg' : 'md'} className="drop-shadow-sm" />
        </div>

        {/* Loading Animation */}
        <div className="relative">
          {/* Main spinner */}
          <div className="relative flex items-center justify-center">
            <div
              className={cn(
                'animate-spin rounded-full border-4 border-slate-200 border-t-brand-500 dark:border-slate-700',
                isLarge ? 'h-12 w-12' : 'h-8 w-8',
              )}
              style={{
                animation: 'spin 1s linear infinite',
              }}
            />
            {/* Inner pulse */}
            <div
              className={cn(
                'absolute rounded-full bg-brand-500/20 animate-pulse',
                isLarge ? 'h-6 w-6' : 'h-4 w-4',
              )}
            />
          </div>

          {/* Progress ring (when showing progress) */}
          {showProgress && (
            <svg
              className={cn(
                'absolute top-0 left-0 transform -rotate-90',
                isLarge ? 'h-12 w-12' : 'h-8 w-8',
              )}
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-slate-200 dark:text-slate-700"
              />
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${2 * Math.PI * 10}`}
                strokeDashoffset={`${2 * Math.PI * 10 * (1 - progress / 100)}`}
                className="text-brand-500 transition-all duration-300 ease-out"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>

        {/* Loading Message */}
        <div className="space-y-3">
          <h2
            className={cn(
              'font-display font-semibold text-slate-900 dark:text-slate-100',
              isLarge ? 'text-xl' : 'text-lg',
            )}
          >
            {message || 'Loading TalentFlow'}
          </h2>

          {/* Current stage */}
          {showProgress && (
            <div className="space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-400 transition-all duration-300">
                {DEFAULT_LOADING_STAGES[currentStage]?.label || 'Finalizing...'}
              </p>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 rounded-full h-1 dark:bg-slate-700 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-brand-500 to-brand-600 h-1 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-500">
                {Math.round(progress)}% complete
              </p>
            </div>
          )}
        </div>

        {/* Loading Tips */}
        <div className="min-h-[2.5rem] flex items-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 transition-all duration-500 ease-in-out max-w-sm">
            💡 {tips[currentTip]}
          </p>
        </div>

        {/* Subtle pulse animation for the entire card */}
        <style jsx>{`
          @keyframes enterprise-pulse {
            0%,
            100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.02);
              opacity: 0.9;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

/** Simplified enterprise loader for smaller spaces */
export function CompactEnterpriseLoader({
  message = 'Loading...',
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <div className="flex flex-col items-center space-y-4">
        <LogoLockup size="sm" />
        <div className="flex items-center space-x-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500 dark:border-slate-700" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{message}</p>
        </div>
      </div>
    </div>
  );
}
