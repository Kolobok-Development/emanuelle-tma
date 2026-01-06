'use client';

import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

type Offer = {
  id: string;
  title: string;
  price_in_stars: number;
  price_in_usd: number;
  diamonds: number;
  energy: number;
};

interface OfferCardProps {
  offer: Offer;
  onPurchase: (offerId: string) => Promise<void>;
  isLoading: boolean;
}

// Format price for display (convert stars to USD equivalent)
function formatPrice(price: number): string {
  // Assuming 1 Star ≈ $0.01, so divide by 100
  return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function OfferCard({ offer, onPurchase, isLoading }: OfferCardProps) {
  const t = useTranslations();
  return (
    <Card 
      className="relative overflow-hidden rounded-[12px] border border-purple bg-card-dark p-4 flex gap-5 items-start cursor-pointer transition-transform duration-200 hover:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={() => !isLoading && onPurchase(offer.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isLoading) {
          e.preventDefault();
          onPurchase(offer.id);
        }
      }}
      aria-disabled={isLoading}
    >
      {/* Left section - Icon box */}
      <div className="relative border border-purple rounded-lg bg-card-dark flex flex-col items-center justify-center px-0.5 py-2 shrink-0 size-[70px]">
        <div className="relative h-12 w-[65px] flex items-center justify-center">
          <Image 
            src="/icons/energy_and_dimonds.png" 
            alt="Energy and Diamonds" 
            width={65} 
            height={48} 
            className="object-contain"
          />
        </div>
        {/* Gradient overlay on icon box */}
        <div 
          className="absolute inset-[-1px] opacity-40 rounded-lg"
          style={{
            backgroundImage: `radial-gradient(ellipse at center, rgba(255, 79, 191, 0.2) 0%, rgba(255, 79, 191, 0) 100%)`
          }}
        />
      </div>

      {/* Middle section - Title and badges */}
      <div className="flex flex-col gap-3 items-start justify-center flex-1 min-w-0">
        {/* Title with separator */}
        <div className="flex flex-col items-start pb-px pt-0 px-0 w-full">
          <p className="bg-gradient-to-r from-purple via-pink to-purple bg-clip-text text-transparent text-2xl font-bold uppercase tracking-[0.48px] w-full">
            {offer.title}
          </p>
          {/* Separator */}
          <div className="relative flex h-px items-center mb-[-1px] opacity-10 w-full">
            <div className="absolute bg-white h-px left-0 right-0 top-1/2 translate-y-[-50%]" />
          </div>
        </div>
        
        {/* Badges */}
        <div className="flex gap-2 items-center">
          {/* Diamonds badge */}
          <div className="flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-white text-[10px] text-center tracking-[0.16px]">
            <span className="font-bold leading-normal">{offer.diamonds}</span>
            <span className="font-normal leading-normal">{t('common.diamonds')}</span>
          </div>
          
          {/* Energy badge */}
          <div className="flex items-center justify-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-white text-[10px] text-center tracking-[0.16px]">
            <span className="font-bold leading-normal">{offer.energy}</span>
            <span className="font-normal leading-normal">{t('common.energy')}</span>
          </div>
        </div>
      </div>

      {/* Right section - Price */}
      <div className="flex items-center shrink-0">
        <p className="bg-gradient-to-r from-purple via-pink to-purple bg-clip-text text-transparent text-xl font-bold uppercase tracking-[0.4px] whitespace-nowrap">
          {formatPrice(offer.price_in_usd)}
        </p>
      </div>
    </Card>
  );
}

export function OfferCardSkeleton() {
  return (
    <Card className="relative overflow-hidden rounded-[12px] border border-purple bg-card-dark p-4 flex gap-5 items-start animate-pulse">
      <div className="border border-purple rounded-lg bg-card-dark size-[70px] shrink-0">
        <div className="h-12 w-[65px] bg-muted-foreground/20 rounded" />
      </div>
      <div className="flex flex-col gap-3 items-start justify-center flex-1 min-w-0">
        <div className="flex flex-col items-start pb-px pt-0 px-0 w-full">
          <div className="h-6 w-24 bg-muted-foreground/20 rounded" />
          <div className="h-px w-full bg-muted-foreground/20 mt-1" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-24 bg-muted-foreground/20 rounded-lg" />
          <div className="h-6 w-24 bg-muted-foreground/20 rounded-lg" />
        </div>
      </div>
      <div className="flex items-center self-stretch shrink-0">
        <div className="h-6 w-16 bg-muted-foreground/20 rounded" />
      </div>
    </Card>
  );
}

