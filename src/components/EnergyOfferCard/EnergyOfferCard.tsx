'use client';

import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

type Offer = {
  id: string;
  price_in_stars: number;
  price_in_usd: number;
  energy: number;
};

interface EnergyOfferCardProps {
  offer: Offer;
  onPurchase: (offerId: string) => Promise<void>;
  isLoading: boolean;
}

// Format price for display (convert stars to USD equivalent)
function formatPrice(price: number): string {
  // Assuming 1 Star ≈ $0.01, so divide by 100
  return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function EnergyOfferCard({ offer, onPurchase, isLoading }: EnergyOfferCardProps) {
  const t = useTranslations();
  return (
    <Card 
      className="overflow-hidden rounded-[12px] border border-purple-border bg-card-dark cursor-pointer transition-transform duration-200 hover:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
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
      <CardContent className="flex flex-row items-center justify-between gap-2 px-3 py-2 bg-card-dark">
        <div className="relative h-[60px] w-[85px] flex items-center justify-center">
          <Image 
            src="/icons/energies.webp" 
            alt="Energy" 
            width={85} 
            height={60} 
            className="object-contain"
          />
        </div>
        <div className="flex flex-col items-center justify-center rounded-md bg-secondary pt-[5px] pb-[10px] px-3 text-secondary-foreground text-center w-[72px]">
          <span className="text-base font-bold leading-none tracking-[0.32px] mb-[-4px]">
            {offer.energy}
          </span>
          <span className="text-[10px] font-normal leading-none tracking-[0.2px] mb-[-4px]">
            {t('common.energy')}
          </span>
        </div>
      </CardContent>
      
      <CardFooter className="relative flex flex-col items-start h-[44px] p-0 overflow-hidden !bg-card-dark">
        {/* Separator */}
        <div className="absolute top-0 left-0 right-0 h-px bg-secondary opacity-20" />
        
        {/* Gradient overlay */}
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `radial-gradient(ellipse at center, rgba(156, 77, 255, 0.2) 0%, rgba(156, 77, 255, 0) 100%)`
          }}
        />
        
        {/* Price text */}
        <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-secondary text-xl font-bold uppercase tracking-[0.4px] whitespace-nowrap">
          {formatPrice(offer.price_in_usd)}
        </p>
      </CardFooter>
    </Card>
  );
}

export function EnergyOfferCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-[12px] border border-purple-border bg-card-dark animate-pulse">
      <CardContent className="flex flex-row items-center justify-between gap-2 px-3 py-2 bg-card-dark">
        <div className="h-[60px] w-[85px] bg-muted-foreground/20 rounded" />
        <div className="h-12 w-[72px] bg-muted-foreground/20 rounded-lg" />
      </CardContent>
      <CardFooter className="relative flex flex-col items-start h-[44px] p-0 overflow-hidden bg-card-dark">
        <div className="absolute top-0 left-0 right-0 h-px bg-secondary opacity-20" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-16 bg-muted-foreground/20 rounded" />
      </CardFooter>
    </Card>
  );
}

