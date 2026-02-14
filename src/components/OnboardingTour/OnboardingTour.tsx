'use client';

import { NextStep, NextStepProvider, useNextStep } from 'nextstepjs';
import type { Tour } from 'nextstepjs';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState, useEffect, useCallback, type ReactNode } from 'react';
import useSWR from 'swr';
import { OnboardingCard } from './OnboardingCard';
import { fetcher } from '@/utils/fetcher';
import { useAppContext } from '@/context/AppContext';

/** User from API may include onboarding_completed_at (ISO string or null) */
function hasCompletedOnboarding(user: unknown): boolean {
  const u = user as { onboarding_completed_at?: string | null } | null;
  return Boolean(u?.onboarding_completed_at);
}

function OnboardingTourInner({ children }: { children: ReactNode }) {
  const t = useTranslations('onboarding');
  const pathname = usePathname();
  const { startNextStep } = useNextStep();
  const { user, refetchUser } = useAppContext();
  const [showTour, setShowTour] = useState(false);

  const { data: companionsData } = useSWR<{ companions: { id: string }[] }>(
    '/api/companion/get-all',
    fetcher
  );
  const firstCompanionId = companionsData?.companions?.[0]?.id;

  const steps: Tour[] = useMemo(() => {
    const companionRoute = firstCompanionId ? `/companion/${firstCompanionId}` : undefined;
    return [
      {
        tour: 'onboarding',
        steps: [
          {
            icon: '😈',
            title: t('companions.title'),
            content: t('companions.content'),
            selector: '#onboarding-first-companion',
            side: 'bottom-left',
            showControls: true,
            showSkip: true,
            pointerPadding: 10,
            pointerRadius: 12,
            nextRoute: companionRoute,
          },
          {
            icon: '💌',
            title: t('chat.title'),
            content: t('chat.content'),
            selector: '#onboarding-chat-button',
            side: 'top',
            showControls: true,
            showSkip: true,
            pointerPadding: 10,
            pointerRadius: 12,
            prevRoute: '/dashboard',
          },
          {
            icon: '💎',
            title: t('topup.title'),
            content: t('topup.content'),
            selector: '#onboarding-topup',
            side: 'left',
            showControls: true,
            showSkip: true,
            pointerPadding: 10,
            pointerRadius: 12,
          },
          {
            icon: '👤',
            title: t('profile.title'),
            content: t('profile.content'),
            selector: '#onboarding-profile',
            side: 'top-right',
            showControls: true,
            showSkip: true,
            pointerPadding: 10,
            pointerRadius: 12,
          },
        ],
      },
    ];
  }, [t, firstCompanionId]);

  const markSeen = useCallback(async () => {
    setShowTour(false);
    try {
      await fetch('/api/profile/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      await refetchUser();
    } catch (err) {
      console.warn('Failed to mark onboarding complete', err);
    }
  }, [refetchUser]);

  const handleStepChange = useCallback((stepIndex: number) => {
    if (stepIndex !== 1) return;
    setTimeout(() => {
      document.getElementById('onboarding-chat-button')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 350);
  }, []);

  useEffect(() => {
    if (pathname !== '/dashboard') return;
    if (!firstCompanionId) return;
    if (!user) return;
    if (hasCompletedOnboarding(user)) return;
    setShowTour(true);
    const timer = setTimeout(() => {
      startNextStep('onboarding');
    }, 600);
    return () => clearTimeout(timer);
  }, [pathname, firstCompanionId, user, startNextStep]);

  return (
    <NextStep
      steps={steps}
      showNextStep={showTour}
      onComplete={markSeen}
      onSkip={markSeen}
      onStepChange={handleStepChange}
      cardComponent={OnboardingCard}
      shadowRgb="100, 80, 180"
      shadowOpacity="0.85"
      clickThroughOverlay={false}
      overlayZIndex={999}
    >
      {children}
    </NextStep>
  );
}

export function OnboardingTour({ children }: { children: ReactNode }) {
  return (
    <NextStepProvider>
      <OnboardingTourInner>{children}</OnboardingTourInner>
    </NextStepProvider>
  );
}
