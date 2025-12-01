'use client';

import { Page } from "@/components/Page";
import { useAppContext } from "@/context/AppContext";
import { fetcher } from "@/utils/fetcher";
import { AICompanion } from "@prisma/client";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Image from "next/image";
import React, { useState } from "react";
import useSWR from "swr";

// Companion Card Component
function CompanionCard({ companion, onClick }: { companion: AICompanion; onClick: () => void }) {
    const [imageError, setImageError] = useState(false);

    return (
        <Card
            className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={onClick}
        >
            <div className="relative w-full aspect-[254/308] overflow-hidden bg-muted">
                {!imageError && companion.avatar ? (
                    <Image
                        alt={companion.name}
                        src={companion.avatar}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 33vw"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                        <span className="text-sm">No image</span>
                    </div>
                )}
            </div>
            <CardHeader>
                <CardTitle className="line-clamp-1">{companion.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                    {companion.description}
                </CardDescription>
            </CardHeader>
        </Card>
    );
}

// Skeleton component for loading state
function SkeletonCard() {
    return (
        <Card className="overflow-hidden cursor-pointer animate-pulse">
            <div className="h-[308px] w-full bg-muted" />
            <CardHeader>
                <div className="h-5 w-3/4 bg-muted rounded mb-2" />
                <div className="h-4 w-full bg-muted rounded" />
            </CardHeader>
        </Card>
    );
}

export default function Dashboard() {
    const t = useTranslations('i18n');
    const { user } = useAppContext();
    const router = useRouter();

    const { data, isLoading, error } = useSWR<{ companions: AICompanion[] }>('/api/companion/get-all', fetcher);

    return (
        <div className="min-h-screen cosmic-background">
            <div className="px-4 py-4">
                {/* Companions Grid */}
                <div className="grid grid-cols-2 gap-4 mb-10">
                    {isLoading ? (
                        // Show skeleton cards while loading
                        Array.from({ length: 5 }).map((_, index) => (
                            <SkeletonCard key={index} />
                        ))
                    ) : (
                        // Show actual data when loaded
                        data?.companions?.map((companion) => (
                            <CompanionCard
                                key={companion.id}
                                companion={companion}
                                onClick={() => router.push(`/companion/${companion.id}`)}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}