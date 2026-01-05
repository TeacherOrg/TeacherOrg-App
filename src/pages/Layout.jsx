import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { User } from "@/api/entities";
import { createPageUrl } from '@/utils/index.js';
import {
  Calendar, Users, Settings, GraduationCap, LogOut,
  ClipboardList, Sun, Moon, BookOpen
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
import CalendarLoader from "../components/ui/CalendarLoader";
import pb from '@/api/pb';
import { useTutorial } from '@/hooks/useTutorial';

const navigationItems = [
  { title: "Stundenplan", url: createPageUrl("Timetable"), icon: Calendar },
  { title: "Schüler", url: createPageUrl("StudentsOverview"), icon: Users },
  { title: "Themenansicht", url: createPageUrl("Topics"), icon: BookOpen },
  { title: "Leistung", url: createPageUrl("Grades"), icon: GraduationCap },
  { title: "Gruppen", url: createPageUrl("Groups"), icon: Users },
  { title: "Ämtliplan", url: createPageUrl("Chores"), icon: ClipboardList },
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
  const navigate = useNavigate();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarError, setSidebarError] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { triggerTutorialForRoute } = useTutorial();

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-trigger tutorials when navigating to pages
  useEffect(() => {
    triggerTutorialForRoute(location.pathname);
  }, [location.pathname, triggerTutorialForRoute]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (pb.authStore.isValid && pb.authStore.model) {
          setUser(pb.authStore.model);
        } else {
          await pb.collection('users').authRefresh();
          setUser(pb.authStore.model || null);
        }
      } catch (error) {
        console.error("User not authenticated", error);
        setSidebarError('Authentication failed. Redirecting to login...');
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await User.logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
      setSidebarError('Logout failed. Please try again.');
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const footerActions = [() => setIsSettingsModalOpen(true), handleLogout, toggleTheme];

  const SidebarToggleArea = () => {
    const { toggleSidebar } = useSidebar();
    return (
      <button
        type="button"
        className="absolute inset-0 z-10 bg-transparent"
        onClick={toggleSidebar}
        aria-label="Toggle Sidebar"
      />
    );
  };

  if (isLoading) return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center"><CalendarLoader /></div>;
  if (!user) return null;
  if (sidebarError) return <div className="min-h-screen flex items-center justify-center"><p className="text-red-500">{sidebarError}</p></div>;

  return (
    <>
      <style>{ScrollbarStyles}</style>
      <SidebarProvider defaultOpen={getSidebarDefaultState()}>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-300">
          {!isFullscreen || location.pathname !== createPageUrl("Timetable") ? (
            <Sidebar collapsible="icon">
              <SidebarContent 
                className={cn(
                  "relative flex flex-col h-full"
                )}
              >
                {/* Obere Navigation – nimmt Großteil ein, Items oben ausgerichtet */}
                <SidebarMenu className="flex-1 px-2 pt-2">
                  {navigationItems.map((item) => {
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

                {/* Untere 3 Items – fixiert unten */}
                <SidebarMenu className="px-2 pb-2">
                  {footerItems.map((item, index) => {
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
                                onClick={footerActions[index]}
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