'use client';

import { Page } from "@/components/Page";
import { useAppContext } from "@/context/AppContext";
import { fetcher } from "@/utils/fetcher";
import { AICompanion } from "@prisma/client";
import { Card, Skeleton } from "@telegram-apps/telegram-ui";
import { CardCell } from "@telegram-apps/telegram-ui/dist/components/Blocks/Card/components/CardCell/CardCell";
import { useTranslations } from "next-intl";
import React from "react";
import useSWR from "swr";

export default function Dashboard() {
    const t = useTranslations('i18n');
    const { user  } = useAppContext();

    const { data, isLoading, error } = useSWR<{ companions: AICompanion[] }>('/api/companion/get-all', fetcher);

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
  )


}