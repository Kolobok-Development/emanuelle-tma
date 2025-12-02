'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useSWR from 'swr';
import { fetcher } from '@/utils/fetcher';
import { OfferType } from '@prisma/client';
import { useTelegramPayment } from '@/hooks/useTelegramPayment';
import { useEffect } from 'react';
import { OfferCard, OfferCardSkeleton } from '@/components/OfferCard/OfferCard';
import { EnergyOfferCard, EnergyOfferCardSkeleton } from '@/components/EnergyOfferCard/EnergyOfferCard';
import { DiamondOfferCard, DiamondOfferCardSkeleton } from '@/components/DiamondOfferCard/DiamondOfferCard';

type Offer = {
  id: string;
  offer_type: OfferType;
  title: string;
  description: string | null;
  price_in_stars: number;
  price_in_usd: number;
  diamonds: number;
  energy: number;
  display_order: number;
  is_active: boolean;
};

type OffersResponse = {
  success: boolean;
  offers: Offer[];
};

export default function BalancePage() {
  const { data, isLoading, error, mutate } = useSWR<OffersResponse>('/api/offers', fetcher);
  const { purchaseOffer, status, error: paymentError } = useTelegramPayment();

  // Filter offers by type
  const comboOffers = data?.offers.filter((offer) => offer.offer_type === 'COMBO') || [];
  const energyOffers = data?.offers.filter((offer) => offer.offer_type === 'ENERGY') || [];
  const diamondOffers = data?.offers.filter((offer) => offer.offer_type === 'DIAMOND') || [];

  // Refresh data after successful payment
  useEffect(() => {
    if (status === 'success') {
      mutate();
    }else if (status === 'error') {
      console.error(paymentError);
    }else if (status === 'loading') {
      console.log('Loading...');
    }
  }, [status, mutate]);

  if (error || (!isLoading && !data?.success)) {
    return (
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 mt-10">
        <p className="text-sm text-red-400">Failed to load offers. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col items-center px-4">
      {status === 'loading' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" />
      )}
      
      <Tabs defaultValue="combo" className="absolute -top-4 w-[85%] max-w-md">
        <TabsList className="mx-auto grid h-auto w-full grid-cols-3 rounded-xl border bg-border p-1">
          <TabsTrigger
            className="rounded-md px-4 py-2 text-base font-semibold text-white/70 transition-colors data-[state=active]:bg-gradient-pink-purple data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(255,108,240,0.55)]"
            value="energy"
          >
            Energy
          </TabsTrigger>
          <TabsTrigger
            className="rounded-md px-4 py-2 text-base font-semibold text-white/70 transition-colors data-[state=active]:bg-gradient-pink-purple data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(255,108,240,0.55)]"
            value="combo"
          >
            !Combo!
          </TabsTrigger>
          <TabsTrigger
            className="rounded-md px-4 py-2 text-base font-semibold text-white/70 transition-colors data-[state=active]:bg-gradient-pink-purple data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(255,108,240,0.55)]"
            value="diamonds"
          >
            Diamonds
          </TabsTrigger>
        </TabsList>

        <TabsContent value="energy" className="mt-10">
          <section className="grid grid-cols-2 gap-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <EnergyOfferCardSkeleton key={index} />
              ))
            ) : energyOffers.length > 0 ? (
              energyOffers.map((offer) => (
                <EnergyOfferCard key={offer.id} offer={offer} onPurchase={purchaseOffer} isLoading={status === 'loading'} />
              ))
            ) : (
              <p className="col-span-2 text-center text-sm text-white/70">No energy offers available</p>
            )}
          </section>
        </TabsContent>

        <TabsContent value="combo" className="mt-10 ">
          <section className="space-y-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <OfferCardSkeleton key={index} />
              ))
            ) : comboOffers.length > 0 ? (
              comboOffers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} onPurchase={purchaseOffer} isLoading={status === 'loading'} />
              ))
            ) : (
              <p className="text-center text-sm text-white/70">No combo offers available</p>
            )}
          </section>
        </TabsContent>

        <TabsContent value="diamonds" className="mt-10">
          <section className="grid grid-cols-2 gap-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <DiamondOfferCardSkeleton key={index} />
              ))
            ) : diamondOffers.length > 0 ? (
              diamondOffers.map((offer) => (
                <DiamondOfferCard key={offer.id} offer={offer} onPurchase={purchaseOffer} isLoading={status === 'loading'} />
              ))
            ) : (
              <p className="col-span-2 text-center text-sm text-white/70">No diamond offers available</p>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}