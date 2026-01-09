'use client';

import { useAppContext } from "@/context/AppContext";
import { fetcher } from "@/utils/fetcher";
import { ItemGroup } from "@/components/ui/item";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { CompanionCard, CompanionCardSkeleton } from "@/components/CompanionCard/CompanionCard";
import { AICompanion } from "@prisma/client";
import { trackCompanionSelected } from "@/lib/analytics";
  
export default function Dashboard() {
    const { user } = useAppContext();
    const router = useRouter();

    const { data, isLoading, error } = useSWR<{ companions: AICompanion[] }>('/api/companion/get-all', fetcher);

    const handleCompanionClick = (companion: AICompanion) => {
        trackCompanionSelected(companion.id, companion.name);
        router.push(`/companion/${companion.id}`);
    };

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
                            onClick={() => handleCompanionClick(companion)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}