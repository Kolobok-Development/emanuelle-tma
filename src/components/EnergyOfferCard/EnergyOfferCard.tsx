import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Offer = {
  id: string;
  price_in_stars: number;
  energy: number;
};

interface EnergyOfferCardProps {
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

export function EnergyOfferCard({ offer, onPurchase, isLoading }: EnergyOfferCardProps) {
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
        <div className="relative z-10 flex flex-col items-center gap-2 w-full">
          <span className="text-xl font-bold text-secondary">{formatPrice(offer.price_in_stars)}</span>
          <Button
            type="button"
            onClick={() => onPurchase(offer.id)}
            disabled={isLoading}
            className="w-full rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-white transition-transform duration-200 hover:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Buy
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export function EnergyOfferCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-2xl border border-secondary animate-pulse">
      <CardContent className="flex flex-row items-center gap-2 p-4 bg-black justify-between">
        <div className="h-[68px] w-[68px] bg-muted-foreground/20 rounded" />
        <div className="h-12 w-20 bg-muted-foreground/20 rounded-md" />
      </CardContent>
      <CardFooter className="relative border-t p-3 justify-center overflow-hidden">
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="h-6 w-16 bg-muted-foreground/20 rounded" />
          <div className="h-9 w-full bg-muted-foreground/20 rounded-md" />
        </div>
      </CardFooter>
    </Card>
  );
}

