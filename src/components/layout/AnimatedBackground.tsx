import {useEffect, useRef} from "react";
import {motion, useMotionValue, useSpring} from "framer-motion";

export function AnimatedBackground() {
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const x = useSpring(mx, { stiffness: 50, damping: 18, mass: 0.7 });
    const y = useSpring(my, { stiffness: 50, damping: 18, mass: 0.7 });
    const lastMove = useRef<number>(0);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            lastMove.current = performance.now();
            const { innerWidth: w, innerHeight: h } = window;
            mx.set((e.clientX - w / 2) * 0.25);
            my.set((e.clientY - h / 2) * 0.25);
        };
        window.addEventListener("mousemove", onMove, { passive: true });
        return () => window.removeEventListener("mousemove", onMove);
    }, [mx, my]);

    useEffect(() => {
        let raf = 0;
        const start = performance.now();
        const loop = (t: number) => {
            const idle = performance.now() - (lastMove.current || 0) > 1600 || window.innerWidth < 768;
            if (idle) {
                const now = t - start;
                const A = Math.min(window.innerWidth, window.innerHeight) * 0.14;
                mx.set(Math.sin(now / 1800) * A);
                my.set(Math.cos(now / 2400) * A * 0.85);
            }
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [mx, my]);

    return (
        <div className="absolute inset-0 -z-10 pointer-events-none">
            <motion.div
                style={{
                    x,
                    y,
                    willChange: "transform",
                    filter: "blur(80px) saturate(200%) brightness(180%)",
                    background: "radial-gradient(closest-side, rgba(120,200,255,0.95), rgba(40,140,255,0.75) 50%, rgba(0,0,0,0) 85%)",
                    mixBlendMode: "screen",
                }}
                className="absolute left-1/2 top-1/2 h-[110vmin] w-[110vmin] -translate-x-1/2 -translate-y-1/2 rounded-[46%]"
                animate={{
                    borderRadius: [
                        "40% 60% 55% 45% / 55% 45% 55% 45%",
                        "60% 40% 45% 55% / 45% 55% 45% 55%",
                        "40% 60% 55% 45% / 55% 45% 55% 45%",
                    ],
                    scale: [1, 1.05, 1],
                    rotate: [0, 10, 0],
                }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
        </div>
    );
}