import React from 'react';
import { AnimatedBackground} from "./AnimatedBackground.tsx";

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    return (
        <div className="relative h-dvh w-full overflow-hidden bg-black text-white">
            <AnimatedBackground />
            <div className="relative z-10 mx-auto flex h-dvh min-h-0 max-w-6xl flex-col px-4 py-6 sm:px-6 sm:px-6 sm:py-10">
                {children}
            </div>
        </div>
    )
}