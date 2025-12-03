'use client';

import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { useAppContext } from '@/context/AppContext';

function BalanceSkeleton() {
  return (
    <div className="relative flex w-full items-center justify-center gap-10">
      <div className="flex flex-row items-center gap-2 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#fc9cff]/30 via-[#f886ff]/20 to-[#9a6cff]/30">
          <Image src="/icons/dimaond.png" alt="Diamonds" width={20} height={20} />
        </div>
        <div className="flex flex-col items-center leading-snug">
          <div className="h-8 w-12 animate-pulse rounded bg-white/20" />
        </div>
      </div>

      <div className="h-12 w-px bg-white/15" />

      <div className="flex flex-row items-center gap-2 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffb7f7]/25 via-[#ff89c9]/25 to-[#b473ff]/30">
          <Image src="/icons/energy.png" alt="Energy" width={20} height={20} />
        </div>
        <div className="flex flex-col items-center leading-snug">
          <div className="h-8 w-12 animate-pulse rounded bg-white/20" />
        </div>
      </div>
    </div>
  );
}

export function BalanceHeader() {
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
            Balance
          </h1>

          <div className="relative flex w-full items-center justify-between gap-6 overflow-hidden rounded-2xl border border-white/15 p-2">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-[#9C4DFF] via-[#DB7AE6] to-[#FF4FBF] opacity-20" />

            {isBalanceRefetching ? (
              <BalanceSkeleton />
            ) : (
              <div className="relative flex w-full items-center justify-center gap-10">
                <div className="flex flex-row items-center gap-2 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#fc9cff]/30 via-[#f886ff]/20 to-[#9a6cff]/30">
                    <Image src="/icons/dimaond.png" alt="Diamonds" width={20} height={20} />
                  </div>
                  <div className="flex flex-col items-center leading-snug">
                    <span className="text-2xl font-semibold text-white">{user?.diamonds ?? 0}</span>
                  </div>
                </div>

                <div className="h-12 w-px bg-white/15" />

                <div className="flex flex-row items-center gap-2 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffb7f7]/25 via-[#ff89c9]/25 to-[#b473ff]/30">
                    <Image src="/icons/energy.png" alt="Energy" width={20} height={20} />
                  </div>
                  <div className="flex flex-col items-center leading-snug">
                    <span className="text-2xl font-semibold text-white">{user?.energy ?? 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

