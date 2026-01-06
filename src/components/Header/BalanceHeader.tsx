'use client';

import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { useAppContext } from '@/context/AppContext';
import { useTranslations } from 'next-intl';

function BalanceSkeleton() {
  return (
    <>
      <div className="basis-0 flex gap-2 grow items-center justify-center min-w-0 relative shrink-0">
        <div className="relative shrink-0 size-[28px] flex items-center justify-center">
          <Image src="/icons/dimaond.png" alt="Diamonds" width={28} height={28} />
        </div>
        <div className="h-5 w-12 animate-pulse rounded bg-white/20" />
      </div>

      <div className="flex flex-row items-center self-stretch">
        <div className="flex gap-0 h-full items-start justify-center opacity-20 px-[2px] py-0 relative shrink-0 w-px">
          <div className="absolute bg-[#f5f0ff] bottom-0 left-1/2 top-0 -translate-x-1/2 w-px" />
        </div>
      </div>

      <div className="basis-0 flex gap-2 grow items-center justify-center min-w-0 relative shrink-0">
        <div className="relative shrink-0 size-[28px] flex items-center justify-center">
          <Image src="/icons/energy.png" alt="Energy" width={28} height={28} />
        </div>
        <div className="h-5 w-12 animate-pulse rounded bg-white/20" />
      </div>
    </>
  );
}

export function BalanceHeader() {
  const t = useTranslations();
  const { user, isBalanceRefetching } = useAppContext();
  return (
    <div 
      className="px-4 pt-6"
      style={{
        marginTop: `calc(var(--tg-viewport-safe-area-inset-top, 0px) + 3rem)`,
      }}
    >
      <Card className="relative overflow-hidden rounded-3xl border border-primary/40 bg-muted p-6 text-white">
        
        <div className="relative flex flex-col items-center ">
          <h1 className="text-3xl font-semibold uppercase tracking-[0.4em] text-transparent bg-clip-text bg-gradient-to-r from-[#ffc8ff] via-[#e47cfd] to-[#9c6eff]">
            {t('balance.title')}
          </h1>

          <div 
            className="relative flex w-full items-center overflow-hidden rounded-[12px] border border-[#9c4dff] py-[10px]"
            style={{
              backgroundImage: `linear-gradient(104.414deg, rgba(156, 77, 255, 0.2) 0.38907%, rgba(219, 122, 230, 0.2) 50%, rgba(255, 79, 191, 0.2) 99.611%), linear-gradient(90deg, rgb(65, 56, 71) 0%, rgb(65, 56, 71) 100%)`
            }}
          >
            {isBalanceRefetching ? (
              <BalanceSkeleton />
            ) : (
              <>
                <div className="basis-0 flex gap-2 grow items-center justify-center min-w-0 relative shrink-0">
                  <div className="relative shrink-0 size-[28px] flex items-center justify-center">
                    <Image src="/icons/dimaond.png" alt="Diamonds" width={28} height={28} />
                  </div>
                  <p className="font-bold leading-normal relative shrink-0 text-[#f5f0ff] text-[20px] whitespace-nowrap tracking-[0.4px]">
                    {user?.diamonds ?? 0}
                  </p>
                </div>

                <div className="flex flex-row items-center self-stretch">
                  <div className="flex gap-0 h-full items-start justify-center opacity-20 px-[2px] py-0 relative shrink-0 w-px">
                    <div className="absolute bg-[#f5f0ff] bottom-0 left-1/2 top-0 -translate-x-1/2 w-px" />
                  </div>
                </div>

                <div className="basis-0 flex gap-2 grow items-center justify-center min-w-0 relative shrink-0">
                  <div className="relative shrink-0 size-[28px] flex items-center justify-center">
                    <Image src="/icons/energy.png" alt="Energy" width={28} height={28} />
                  </div>
                  <p className="font-bold leading-normal relative shrink-0 text-[#f5f0ff] text-[20px] whitespace-nowrap tracking-[0.4px]">
                    {user?.energy ?? 0}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

