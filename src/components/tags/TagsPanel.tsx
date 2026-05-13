
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Eraser } from "lucide-react";

interface TagsPanelProps {
    tags: string[];
    active: string[];
    collapsed: boolean;
    steamIdValue: string;
    onToggleCollapse: () => void;
    onToggleTag: (label: string) => void;
    onClearTags: () => void;
    onSteamIdChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function TagsPanel({
                              tags,
                              active,
                              collapsed,
                              steamIdValue,
                              onToggleCollapse,
                              onToggleTag,
                              onClearTags,
                              onSteamIdChange,
                          }: TagsPanelProps) {
    return (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20">
            <div className="pointer-events-auto flex flex-col gap-2">
                {/* Кнопка сворачивания + Steam ID + Счетчик */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onToggleCollapse}
                        className="inline-flex items-center justify-center rounded-full border border-white/20 bg-black/55 px-2.5 py-2 text-zinc-200 hover:bg-black/70 transition-all duration-200"
                        title={collapsed ? "Show" : "Hide"}
                        aria-label={collapsed ? "Show tags" : "Hide tags"}
                    >
                        {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    <div
                        className={[
                            "inline-flex items-center rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-sm",
                            "transition-all duration-200 hover:bg-black/70",
                        ].join(" ")}
                    >
                        <input
                            value={steamIdValue}
                            onChange={onSteamIdChange}
                            placeholder="Steam ID"
                            className="w-44 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-500"
                            inputMode="numeric"
                            aria-label="Steam ID"
                        />
                    </div>

                    {active.length > 0 && (
                        <span className="text-xs text-zinc-400">{active.length} active</span>
                    )}
                </div>

                {/* Сами теги (анимированная панель) */}
                <AnimatePresence initial={false}>
                    {!collapsed && (
                        <motion.div
                            key="tags-panel"
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.18, ease: "easeInOut" }}
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                {tags.map((label) => {
                                    const isActive = active.includes(label);
                                    return (
                                        <motion.button
                                            key={label}
                                            onClick={() => onToggleTag(label)}
                                            whileHover={{ y: -3 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                            className={[
                                                "group relative overflow-hidden rounded-full border px-3 py-1.5 text-sm",
                                                "backdrop-blur-md transition-all duration-200",
                                                isActive
                                                    ? "border-white/45 bg-black/70 text-zinc-100 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.8)]"
                                                    : "border-white/20 bg-black/55 text-zinc-200 hover:bg-black/70",
                                            ].join(" ")}
                                        >
                                            <span className="relative z-10">{label}{isActive && " •"}</span>
                                        </motion.button>
                                    );
                                })}
                                {active.length > 0 && (
                                    <button
                                        onClick={onClearTags}
                                        className="ml-2 rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-sm text-zinc-200 hover:bg-black/70 transition-all duration-200"
                                        title="Clear all"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <Eraser className="h-4 w-4" />
                                            <span>Clear</span>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}