'use client';

import { AICompanion } from "@prisma/client";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardTitle } from "../ui/card";

// Companion Card Component - Tinder-style profile card
export function CompanionCard({ companion, onClick }: { companion: AICompanion; onClick: () => void }) {
    const [imageError, setImageError] = useState(false);

    return (
      <div className="relative cursor-pointer" onClick={onClick}>
        {/* Glowing pink border effect */}
        <div 
          className="absolute -inset-[2px] rounded-xl blur-sm opacity-75" 
          style={{ background: 'linear-gradient(to bottom right, #ec4899, #d946ef, #ec4899)' }}
        />
        
        <Card 
          className="relative flex h-[265px] w-[175px] flex-col items-end justify-end overflow-hidden border-2"
          style={{ borderColor: 'rgba(236, 72, 153, 0.7)' }}
        >
          {/* Background Image */}
          {!imageError && companion.avatar && companion.avatar.length > 0 ? (
            <img
              src={companion.avatar[0]}
              alt={companion.name}
              className="absolute inset-0 m-0 h-full w-full rounded-none object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 m-0 h-full w-full rounded-none bg-muted/30" />
          )}
         
          
          {/* Content - Name at bottom left */}
          <CardContent className="relative z-10 flex flex-col items-start justify-end px-3 py-3 w-full">
            <CardTitle className="text-lg font-bold text-white drop-shadow-lg">
              {companion.name}
            </CardTitle>
          </CardContent>
        </Card>
      </div>
    );
      
}

// Skeleton component for loading state - matches card structure
export function CompanionCardSkeleton() {
    return (
        <Card className="relative flex h-[265px] w-[175px] flex-col items-end justify-end overflow-hidden border-0 animate-pulse">
            <div className="absolute inset-0 h-full w-full rounded-none bg-muted/40" />
            <div className="absolute inset-0 h-full w-full bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
            <CardContent className="relative z-10 flex flex-col items-start justify-end px-3 py-3 w-full">
                <div className="h-5 w-24 rounded-md bg-white/30" />
            </CardContent>
        </Card>
    );
}

