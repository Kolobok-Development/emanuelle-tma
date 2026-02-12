'use client';

import { Page } from "@/components/Page";
import { ReactNode, useMemo } from "react";
import { usePathname } from "next/navigation";
import { BalanceHeader } from "@/components/Header/BalanceHeader";
import { OnboardingTour } from "@/components/OnboardingTour/OnboardingTour";

type ProtectedLayoutProps = {
    children: ReactNode;
};

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
    const pathname = usePathname();

    const noBackRoutes = ['/dashboard'];
    const shouldShowBack = !noBackRoutes.includes(pathname);

    const pageConfig = useMemo(() => {
        if (pathname === '/balance') {
            return {
                header: <BalanceHeader />,
            };
        }

        if (pathname?.startsWith('/companion/')) {
            return {
                showHeader: true,
            };
        }

        return {};
    }, [pathname]);

    const showHeader = pageConfig.showHeader ?? true;

    return (
        <OnboardingTour>
            <Page
                back={shouldShowBack}
                header={pageConfig.header}
                showHeader={showHeader}
            >
                {children}
            </Page>
        </OnboardingTour>
    );
}