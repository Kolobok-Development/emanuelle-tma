'use client';
import { Page } from "@/components/Page";
import { useAppContext } from "@/context/AppContext";
import { headers } from "next/headers";
import { usePathname } from "next/navigation";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {


    const pathname = usePathname();
    const noBackRoutes = ['/dashboard'];
    const shouldShowBack = !noBackRoutes.includes(pathname);
    
           return (
            <Page back={shouldShowBack}>
                {children}
            </Page>
           )
}