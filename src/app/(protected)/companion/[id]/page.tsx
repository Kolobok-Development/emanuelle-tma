'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';

import { fetcher } from '@/utils/fetcher';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImageCarousel } from '@/components/ImageCarousel/ImageCarousel';
import { trackCompanionDetailViewed, trackChatInitiated, trackChatInitiationFailed } from '@/lib/analytics';

import { miniApp } from '@tma.js/sdk-react';


type AICompanion = {
  id: string;
  name: string;
  avatar: string[];
  description: string;
  personality: string;
};

type GetAllResponse = {
  companions: AICompanion[];
};

export default function CompanionPage() {
  const t = useTranslations();
  const params = useParams<{ id: string }>();
  const companionId = params.id;

  const { data, isLoading } = useSWR<GetAllResponse>('/api/companion/get-all', fetcher);

  const [isChatInitiated, setIsChatInitiated] = React.useState(false);

  const companion: AICompanion | undefined = React.useMemo(() => {
    if (!data?.companions || !companionId) return undefined;
    return data.companions.find((c) => c.id === companionId);
  }, [data, companionId]);

  const tags: string[] = React.useMemo(() => {
    if (!companion?.personality) return [];
    return companion.personality
      .split(/[.,|]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 5);
  }, [companion]);

  // Track when companion detail is viewed
  React.useEffect(() => {
    if (companion) {
      trackCompanionDetailViewed(companion.id, companion.name);
    }
  }, [companion]);

  const goToChat = async () => {
    setIsChatInitiated(true);
    try {
      await fetch('/api/companion/initiate-chat', {
        method: 'POST',
        body: JSON.stringify({
          companionId,
        }),
      });

      // Track successful chat initiation
      if (companion) {
        trackChatInitiated(companion.id, companion.name);
      }

      miniApp.close();
    } catch (error) {
      // Track failed chat initiation
      if (companion) {
        trackChatInitiationFailed(
          companion.id,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }
  };

  return (
    <div className="px-4 pb-28">
      {/* Big neon title bar - overlapping header */}
      <div className="mb-5 -mt-4 relative z-10">
        <div className="bg-primary rounded-2xl shadow-[0_0_40px_0_color-mix(in_oklch,var(--primary)_60%,transparent)]">
          <div className="px-6 py-4 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-[0.25em] uppercase text-white">
              {companion?.name || (isLoading ? '...' : t('companion.title'))}
            </h1>
          </div>
        </div>
      </div>

      {/* Hero image and tags */}
      <Card className="bg-muted overflow-hidden rounded-3xl">
        <CardContent className="p-0">
          <div className="w-full">
            {/* Image */}
            <div className="relative w-full h-[350px]">
              <ImageCarousel
                images={companion?.avatar || []}
                alt={companion?.name || 'Companion'}
                className="rounded-t-3xl"
              />
            </div>

            {/* Tags row */}
            <div className="flex flex-wrap items-center gap-2 px-2 py-2">
              {(tags.length ? tags : Array.from({ length: 5 }).map(() => 'tag')).map((tag, idx) => (
                <span
                  key={`${tag}-${idx}`}
                  className="px-2 py-1 rounded-xl text-xs font-semibold text-white/90 bg-primary border border-border shadow-inner"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description panel */}
      <Card className="mt-6 bg-muted/80 backdrop-blur-md">
        <div className="px-5 pt-5">
          <div className="text-xl font-bold mb-3">{t('companion.description')}</div>
          <div className="h-px w-full bg-border mb-4" />
        </div>
        <CardContent className="pt-0 px-5 pb-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {companion?.description || (isLoading ? t('companion.loadingDescription') : t('companion.noDescription'))}
          </p>
        </CardContent>
      </Card>
       <div className="absolute left-1/2 transform -translate-x-1/2 -mt-5">
             <Button disabled={isChatInitiated} className="bg-gradient-pink-purple text-white font-bold px-6 py-6 h-12 rounded-xl max-w-md" onClick={goToChat}>
               {t('companion.goToChat')}
             </Button>
       </div>
    </div>
  );
}


