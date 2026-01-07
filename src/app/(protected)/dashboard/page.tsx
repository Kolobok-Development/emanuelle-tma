'use client';

import { useAppContext } from "@/context/AppContext";
import { fetcher } from "@/utils/fetcher";
import { ItemGroup } from "@/components/ui/item";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { CompanionCard, CompanionCardSkeleton } from "@/components/CompanionCard/CompanionCard";
import { AICompanion } from "@prisma/client";
  
export default function Dashboard() {
    const { user } = useAppContext();
    const router = useRouter();

    const { data, isLoading, error } = useSWR<{ companions: AICompanion[] }>('/api/companion/get-all', fetcher);

    return (
        <div className="flex flex-1 flex-col bg-transparent p-4 items-center">
            <div className="grid grid-cols-2 gap-7">
                {isLoading ? (
                    // Show skeleton cards while loading
                    Array.from({ length: 5 }).map((_, index) => (
                        <CompanionCardSkeleton key={index} />
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
    );
}