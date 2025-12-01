import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Offer = {
  id: string;
  title: string;
  price_in_stars: number;
  diamonds: number;
  energy: number;
};

interface OfferCardProps {
  offer: Offer;
  onPurchase: (offerId: string) => Promise<void>;
  isLoading: boolean;
}

// Format price for display (convert stars to USD equivalent)
function formatPrice(priceInStars: number): string {
  // Assuming 1 Star ≈ $0.01, so divide by 100
  const usdAmount = priceInStars / 100;
  return `$${usdAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function OfferCard({ offer, onPurchase, isLoading }: OfferCardProps) {
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
          <span className="text-xl font-semibold text-primary">{formatPrice(offer.price_in_stars)}</span>
          <Button
            type="button"
            onClick={() => onPurchase(offer.id)}
            disabled={isLoading}
            className="rounded-md bg-gradient-pink-purple px-6 text-sm font-semibold  text-white shadow-[0_0_20px_rgba(255,108,240,0.35)] transition-transform duration-200 hover:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
          >
             Buy
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function OfferCardSkeleton() {
  return (
    <Card className="relative overflow-hidden rounded-md border border-primary/40 bg-muted p-4 animate-pulse">
      <div className="relative flex items-center gap-3">
        <div className="h-16 w-16 shrink-0 rounded-2xl bg-muted-foreground/20" />
        <div className="flex flex-1 flex-col gap-2 min-w-0">
          <div className="h-6 w-3/4 bg-muted-foreground/20 rounded" />
          <div className="w-full h-px bg-white/15" />
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-5 w-16 bg-muted-foreground/20 rounded-full" />
            <div className="h-5 w-16 bg-muted-foreground/20 rounded-full" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="h-6 w-16 bg-muted-foreground/20 rounded" />
          <div className="h-9 w-20 bg-muted-foreground/20 rounded-md" />
        </div>
      </div>
    </Card>
  );
}

