'use client';

import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type BalanceOffer = {
  id: string;
  title: string;
  price: string;
  diamonds: number;
  energy: number;
};

const comboOffers: BalanceOffer[] = [
  { id: 'basic', title: 'Basic', price: '$100', diamonds: 100, energy: 100 },
  { id: 'standart', title: 'Standart', price: '$250', diamonds: 250, energy: 250 },
  { id: 'amateur', title: 'Amateur', price: '$500', diamonds: 500, energy: 500 },
  { id: 'pro', title: 'Pro+', price: '$1000', diamonds: 1000, energy: 1000 },
];

export default function BalancePage() {
  return (
    <div className="relative flex flex-1 flex-col items-center px-4">
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
            {comboOffers.map((offer) => (
              <EnergyOfferCard key={offer.id} offer={offer} />
            ))}
          </section>
        </TabsContent>

        <TabsContent value="combo" className="mt-10 ">
          <section className="space-y-4">
            {comboOffers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </section>
        </TabsContent>

        <TabsContent value="diamonds" className="mt-10">
          <section className="grid grid-cols-2 gap-4">
            {comboOffers.map((offer) => (
              <DiamondOfferCard key={offer.id} offer={offer} />
            ))}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OfferCard({ offer }: { offer: BalanceOffer }) {
  return (
    <Card className="relative overflow-hidden rounded-md border border-primary/40 bg-muted p-4 shadow-[0_0_35px_rgba(219,122,230,0.22)]">
      <div className="relative flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/40 bg-primary/20">
          <Image src="/icons/energy_and_dimonds.png" alt="Energy and Diamonds" width={48} height={48} />
        </div>

        <div className="flex flex-1 flex-col gap-2 min-w-0">
          <span className="text-xl font-semibold uppercase tracking-[0.28em] text-secondary ">{offer.title}</span>
          <div className="w-full h-px bg-white/15" />

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2  text-xs text-white/90 ">
              <span className="text-white text-[8px]">{offer.diamonds}</span>
              <span className="text-white text-[8px]">diamonds</span>
            </span>
        
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 text-xs   text-white/90 ">
              <span className="text-white text-[8px]">{offer.energy}</span>
              <span className="text-white text-[8px]">energy</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="text-xl font-semibold text-primary">{offer.price}</span>
          <Button
            type="button"
            className="rounded-md bg-gradient-pink-purple px-6 text-sm font-semibold  text-white shadow-[0_0_20px_rgba(255,108,240,0.35)] transition-transform duration-200 hover:scale-[0.97]"
          >
            Buy
          </Button>
        </div>
      </div>
    </Card>
  );
}

function EnergyOfferCard({ offer }: { offer: BalanceOffer }) {
  return (
    <Card className="overflow-hidden rounded-2xl border border-secondary ">
      <CardContent className="flex flex-row items-center gap-2 p-4  bg-black justify-between">
        <Image src="/icons/energies.png" alt="Energy" width={68} height={68} />
        <span className="flex flex-col rounded-md bg-secondary text-sm text-white text-center px-4 py-2 leading-tight font-bold">
          {offer.energy} 
          <span className="text-[10px] leading-none">energy</span>
        </span>
      </CardContent>
      
      <CardFooter className="relative border-t p-3 justify-center overflow-hidden">
      <div className="absolute inset-0 bg-secondary opacity-10 w-full h-full" aria-hidden="true" />
        <span className="relative z-10 text-xl font-bold text-secondary">{offer.price}</span>
      </CardFooter>
    </Card>
  );
}

function DiamondOfferCard({ offer }: { offer: BalanceOffer }) {
  return (
    <Card className="overflow-hidden rounded-2xl border border-primary ">
      <CardContent className="flex flex-row items-center gap-2 p-4  bg-black justify-between">
        <Image src="/icons/diamonds.png" alt="Diamonds" width={68} height={68} />
        <span className="flex flex-col rounded-md bg-primary text-sm text-white text-center px-3 py-2 leading-tight font-bold">
          {offer.diamonds} 
          <span className="text-[10px] leading-none">diamonds</span>
        </span>
      </CardContent>
      
      <CardFooter className="relative border-t p-3 justify-center overflow-hidden">
        <div className="absolute inset-0 bg-primary opacity-10 w-full h-full" aria-hidden="true" />
        <span className=" z-10 text-xl font-bold text-primary">{offer.price}</span>
      </CardFooter>
    </Card>
  );
}

