'use client';

import { Section, Cell, Image, List, Text, Title, Spinner, Subheadline, Button, Header, Badge, Card, Skeleton } from '@telegram-apps/telegram-ui';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Link } from '@/components/Link/Link';
import { LocaleSwitcher } from '@/components/LocaleSwitcher/LocaleSwitcher';
import { Page } from '@/components/Page';

import tonSvg from './_assets/ton.svg';
import { useAppContext } from '@/context/AppContext';
import React from 'react';
import { CardChip } from '@telegram-apps/telegram-ui/dist/components/Blocks/Card/components/CardChip/CardChip';
import { CardCell } from '@telegram-apps/telegram-ui/dist/components/Blocks/Card/components/CardCell/CardCell';
import { fetcher } from '@/utils/fetcher';
import useSWR from 'swr';
import { AICompanion } from '@prisma/client';

export default function Home() {
  const t = useTranslations('i18n');
  const { user, isAuthenticated } = useAppContext();


  const { data, isLoading, error } = useSWR<{ companions: AICompanion[] }>('/api/companion/get-all', fetcher);

  if (!isAuthenticated) {
    return (
      <Page back={false}>
        <div className='flex flex-col w-full h-screen items-center justify-center cosmic-background'>
          <div className='flex flex-col w-full h-screen items-center justify-center neon-grid-pattern fade-bottom'> 
            <Spinner className='mb-10 w-10 h-10' size="l" />
            <Subheadline
              level="2"
              weight="2"
            >
              Preparing your session...
            </Subheadline>
          </div>
        </div>
      </Page>
    )
  }

  // Skeleton component for loading state
  const SkeletonCard = () => (
    <Card type="ambient">
      <Skeleton
        visible
        withoutAnimation={false}
      >
        <div
          className='h-[308px] w-full rounded-t-lg'
        />
        <CardCell
          readOnly
          subtitle="Loading..."
        >
        </CardCell>
      </Skeleton>
    </Card>
  );

  return (
    <Page back={false}> 
      <div className="min-h-screen cosmic-background">
        <div className="px-4 py-4">
          {/* Friends Grid */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            {isLoading ? (
              // Show skeleton cards while loading
              Array.from({ length: 5 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))
            ) : (
              // Show actual data when loaded
              data?.companions?.map((friend, index) => (
                <Card key={friend.id} type="ambient">
                  <React.Fragment>
                    <img
                      alt="ai-companion"
                      src={friend.avatar}
                      style={{
                        display: 'block',
                        height: 308,
                        objectFit: 'cover',
                        width: 254
                      }}
                    />
                    <CardCell
                      readOnly
                      subtitle={friend.description}
                    >
                      {friend.name}
                    </CardCell>
                  </React.Fragment>
                </Card>  
              ))
            )}
          </div>
        </div>
          
      </div>
    </Page>
  );
}
