import React from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";

interface ChatInputProps {
    value: string;
    placeholder: string;
    disabled: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
}

export function ChatInput({ value, placeholder, disabled, onChange, onSubmit }: ChatInputProps) {
    return (
        <form onSubmit={onSubmit} className="relative z-10 w-full">
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/5 backdrop-blur-2xl">
                {/* Glow under input */}
                <motion.div
                    aria-hidden
                    className="pointer-events-none absolute -inset-24"
                    initial={{ opacity: 0.18 }}
                    animate={{ opacity: [0.22, 0.4, 0.22] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    style={{
                        background:
                            "radial-gradient(900px 340px at 50% 40%, rgba(255,255,255,0.55), transparent 60%)",
                        filter: "blur(55px)",
                    }}
                />
                <div className="relative z-10 flex items-center gap-3 px-4 py-3">
                    <input
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder}
                        className="w-full bg-transparent text-base outline-none placeholder:text-zinc-400"
                        aria-label="Game recommendation input"
                        disabled={disabled}
                    />
                    <button
                        type="submit"
                        disabled={disabled || !value.trim()}
                        className="group relative inline-flex h-10 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/20 px-4 text-sm font-medium text-white backdrop-blur-md transition hover:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="relative z-10">Send</span>
                        <Send className="relative z-10 h-4 w-4" />
                    </button>
                </div>
            </div>
        </form>
    );
}