'use client';

import type { CardComponentProps } from 'nextstepjs';
import { Button } from '@/components/ui/button';

/**
 * Compact onboarding card for Telegram Mini App: fits small screens,
 * matches app purple style, keeps icon and title visible (no top cut-off).
 */
export function OnboardingCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  skipTour,
  arrow,
}: CardComponentProps) {
  const icon = step.icon && typeof step.icon === 'string' ? step.icon : null;
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  return (
    <div
      className="relative flex flex-col rounded-2xl border-2 border-primary/50 bg-muted-dark shadow-xl"
      style={{
        maxWidth: 'min(380px, calc(100vw - 1rem))',
        padding: '12px 14px',
        paddingTop: '14px',
      }}
    >
      {arrow}
      <div className="flex items-start gap-2.5">
        {icon && (
          <span className="text-xl leading-none shrink-0" aria-hidden>
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white leading-tight mb-1">
            {step.title}
          </h3>
          <p className="text-xs text-white/80 leading-snug">
            {step.content}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 mt-3 pt-2 border-t border-white/10">
        <div className="flex gap-1.5 justify-end">
          {!isFirst && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-white/90 hover:bg-white/10"
              onClick={prevStep}
            >
              Previous
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className="h-7 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={nextStep}
          >
            {isLast ? 'Done' : 'Next'}
          </Button>
          {skipTour && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-white/60 hover:bg-white/10"
              onClick={skipTour}
            >
              Skip
            </Button>
          )}
        </div>
        <div className="text-[10px] text-white/50 text-center">
          {currentStep + 1} of {totalSteps}
        </div>
      </div>
    </div>
  );
}
