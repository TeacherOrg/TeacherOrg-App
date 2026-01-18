import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { User } from "@/api/entities";
import { createPageUrl } from '@/utils/index.js';
import auditLogger from '@/services/auditLogger';
import pb from '@/api/pb';
import {
  Calendar, Users, Settings, GraduationCap, LogOut,
  ClipboardList, Sun, Moon, BookOpen, UserRound, Gamepad2
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import SettingsModal from "../components/settings/SettingsModal";
import { useTutorial } from '@/hooks/useTutorial';

const navigationItems = [
  { title: "Stundenplan", url: createPageUrl("Timetable"), icon: Calendar },
  { title: "Themenansicht", url: createPageUrl("Topics"), icon: BookOpen },
  { title: "Leistung", url: createPageUrl("Grades"), icon: GraduationCap },
  { title: "Schüler", url: createPageUrl("StudentsOverview"), icon: UserRound },
  { title: "Gruppen", url: createPageUrl("Groups"), icon: Users },
  { title: "Ämtliplan", url: createPageUrl("Chores"), icon: ClipboardList },
  { title: "Game Zone", url: createPageUrl("GameZone"), icon: Gamepad2 },
];

// Navigation nur für Schüler
const studentNavigationItems = [
  { title: "Stundenplan", url: createPageUrl("Timetable"), icon: Calendar },
  { title: "Mein Dashboard", url: "/student-dashboard", icon: UserRound },
];

const footerItems = [
  { title: "Settings", icon: Settings },
  { title: "Logout", icon: LogOut },
  { title: "Theme", icon: null },
];

const ScrollbarStyles = `
  :root {
    --sidebar-width: 220px;        /* expanded: schmal, aber lesbar */
    --sidebar-width-icon: 56px;    /* collapsed: exakt wie Grok */
  }
`;

// Liest den gespeicherten Sidebar-Zustand aus dem Cookie
const getSidebarDefaultState = () => {
  const cookies = document.cookie.split(';');
  const sidebarCookie = cookies.find(c => c.trim().startsWith('sidebar_state='));
  if (sidebarCookie) {
    return sidebarCookie.split('=')[1].trim() === 'true';
  }
  return true; // Default: offen
};

export default function Layout({ children }) {
  const location = useLocation();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { triggerTutorialForRoute } = useTutorial();

  // Rollenbasierte Navigation
  const currentUser = pb.authStore.model;
  const isStudent = currentUser?.role === 'student';
  const displayNavigationItems = isStudent ? studentNavigationItems : navigationItems;

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-trigger tutorials when navigating to pages
  useEffect(() => {
    triggerTutorialForRoute(location.pathname);
  }, [location.pathname, triggerTutorialForRoute]);

  const handleLogout = async () => {
    try {
      // Audit-Logging: Logout vor dem tatsächlichen Logout
      const userId = pb.authStore.model?.id;
      if (userId) {
        await auditLogger.logLogout(userId);
      }

      await User.logout();
      // Navigation erfolgt automatisch durch ProtectedRoute
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // Footer-Items und -Actions für Schüler filtern (kein Settings)
  const displayFooterItems = isStudent
    ? footerItems.filter(item => item.title !== 'Settings')
    : footerItems;
  const displayFooterActions = isStudent
    ? [handleLogout, toggleTheme]
    : [() => setIsSettingsModalOpen(true), handleLogout, toggleTheme];

  const SidebarToggleArea = () => {
    const { toggleSidebar, state } = useSidebar();
    return (
      <button
        type="button"
        className={cn(
          "absolute inset-0 z-10 bg-transparent",
          state === "expanded" ? "cursor-w-resize" : "cursor-e-resize"
        )}
        onClick={toggleSidebar}
        aria-label="Toggle Sidebar"
      />
    );
  };

  return (
    <>
      <style>{ScrollbarStyles}</style>
      <SidebarProvider defaultOpen={getSidebarDefaultState()}>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-925 dark:to-slate-950 transition-colors duration-300">
            {!isFullscreen || location.pathname !== createPageUrl("Timetable") ? (
            <Sidebar collapsible="icon">
              <SidebarContent 
                className={cn(
                  "relative flex flex-col h-full"
                )}
              >
                {/* Obere Navigation – nimmt Großteil ein, Items oben ausgerichtet */}
                <SidebarMenu className="flex-1 px-2 pt-2">
                  {displayNavigationItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuButton
                                asChild
                                className={cn(
                                  "relative z-20",
                                  "relative overflow-hidden rounded-xl transition-all duration-200 border-0 w-full",
                                  isActive
                                    ? "bg-blue-600 text-white shadow-lg"
                                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                                )}
                              >
                                <Link
                                  to={item.url}
                                  className={cn(
                                    "flex w-full items-center gap-3 px-4 py-3",
                                    "group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:gap-0 group-data-[state=collapsed]:px-0"
                                  )}
                                >
                                  <item.icon className="w-5 h-5 shrink-0" />
                                  <span className="font-medium tracking-tight group-data-[state=collapsed]:hidden">
                                    {item.title}
                                  </span>
                                </Link>
                              </SidebarMenuButton>
                            </TooltipTrigger>
                            <TooltipContent side="right">{item.title}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>

                {/* Untere Items – fixiert unten (Settings nur für Lehrer) */}
                <SidebarMenu className="px-2 pb-2">
                  {displayFooterItems.map((item, index) => {
                    const IconComponent = item.icon;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuButton
                                className={cn(
                                  "relative z-20",
                                  "relative overflow-hidden rounded-xl transition-all duration-200 border-0 w-full",
                                  "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                                )}
                                onClick={displayFooterActions[index]}
                              >
                                <div
                                  className={cn(
                                    "flex w-full items-center gap-3 px-4 py-3",
                                    "group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:gap-0 group-data-[state=collapsed]:px-0"
                                  )}
                                >
                                  {item.title === "Theme" ? (
                                    <span className="relative flex h-5 w-5 items-center justify-center shrink-0">
                                      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-slate-600 dark:text-slate-300" />
                                      <Moon className="absolute inset-0 h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-slate-600 dark:text-slate-300" />
                                    </span>
                                  ) : (
                                    <IconComponent className="w-5 h-5 shrink-0" />
                                  )}
                                  <span className="font-medium tracking-tight group-data-[state=collapsed]:hidden">
                                    {item.title}
                                  </span>
                                </div>
                              </SidebarMenuButton>
                            </TooltipTrigger>
                            <TooltipContent side="right">{item.title}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>

                <SidebarToggleArea />

                <SidebarRail className="z-30" />
              </SidebarContent>
            </Sidebar>
            ) : null}

            <main className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto">
                {children}
              </div>
            </main>

            <SettingsModal
              isOpen={isSettingsModalOpen}
              onClose={() => setIsSettingsModalOpen(false)}
            />
          </div>
      </SidebarProvider>
    </>
  );
}