import { Gamepad2, Heart, LogOut, LogIn, Menu } from "lucide-react";
import { API_BASE_URL } from "../../services/api";

interface HeaderProps {
    authData: { steamId?: string } | null;
    onLogout: () => void;
    sidebarOpen: boolean;
    onToggleSidebar: () => void;
}

export function Header({ authData, onLogout, sidebarOpen, onToggleSidebar }: HeaderProps) {
    return (
        <div className="mb-6 flex shrink-0 items-center justify-between sm:mb-8">
            <div className="flex items-center gap-2 opacity-90 select-none">
                <button
                    type="button"
                    onClick={onToggleSidebar}
                    className="group relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 backdrop-blur-md transition hover:border-white/25 hover:bg-white/10 hover:text-zinc-100"
                    aria-label="Open chats"
                    aria-expanded={sidebarOpen}
                    title="Chats"
                >
                    <Menu className="h-4 w-4" />
                </button>
                <div className="ml-1 flex items-center gap-2">
                    <Gamepad2 className="h-6 w-6 text-blue-400" />
                    <Heart className="h-5 w-5 text-red-400" />
                </div>
                <span className="tracking-wide text-lg font-semibold uppercase text-zinc-300">PLAYCURE</span>
                {authData?.steamId && (
                    <span className="ml-2 hidden max-w-[140px] truncate text-xs text-zinc-500 min-[426px]:inline-block sm:max-w-none">
            Steam ID: {authData.steamId}
          </span>
                )}
            </div>
            <div className="flex items-center gap-4">
                {!authData?.steamId ? (
                    <button
                        onClick={() => {
                            try {
                                sessionStorage.setItem('pendingSteamLogin', '1');
                            } catch {
                                /* ignore */
                            }
                            window.location.href = `${API_BASE_URL}/auth/steam`;
                        }}
                        className="group relative inline-flex h-9 items-center justify-center gap-2 overflow-hidden rounded-lg border border-white/15 px-3 text-sm font-medium text-zinc-300 backdrop-blur-md transition hover:border-white/30 hover:bg-white/10"
                        title="Login via Steam"
                    >
                        <LogIn className="h-4 w-4" />
                        <span className="hidden sm:inline">Login via Steam</span>
                    </button>
                ) : (
                    <button
                        onClick={onLogout}
                        className="group relative inline-flex h-9 items-center justify-center gap-2 overflow-hidden rounded-lg border border-white/15 px-3 text-sm font-medium text-zinc-300 backdrop-blur-md transition hover:border-white/30 hover:bg-white/10"
                        title="Logout"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                )}
            </div>
        </div>
    );
}