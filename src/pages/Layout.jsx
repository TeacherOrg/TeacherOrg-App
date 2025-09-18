import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { User } from "@/api/entities";
import { createPageUrl } from "@/utils";
import { Calendar, Users, Settings, GraduationCap, LogOut, ClipboardList } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import SettingsModal from "../components/settings/SettingsModal";
import ThemeToggle from "../components/ui/ThemeToggle";
import CalendarLoader from "../components/ui/CalendarLoader";
import pb from '@/api/pb';

const navigationItems = [
  {
    title: "Timetable",
    url: createPageUrl("Timetable"),
    icon: Calendar,
  },
  {
    title: "Grades",
    url: createPageUrl("Grades"),
    icon: GraduationCap,
  },
  {
    title: "Groups",
    url: createPageUrl("Groups"),
    icon: Users,
  },
  {
    title: "Ämtliplan",
    url: createPageUrl("Chores"),
    icon: ClipboardList,
  },
];

const footerItems = [
  {
    title: "Settings",
    icon: Settings,
    action: (setIsSettingsModalOpen) => () => setIsSettingsModalOpen(true),
  },
  {
    title: "Logout",
    icon: LogOut,
    action: (handleLogout) => handleLogout,
  },
];

const ScrollbarStyles = `
  :root {
    --scrollbar-track-light: #f1f5f9;
    --scrollbar-thumb-light: #cbd5e1;
    --scrollbar-thumb-hover-light: #94a3b8;
    --scrollbar-track-dark: #1e293b;
    --scrollbar-thumb-dark: #475569;
    --scrollbar-thumb-hover-dark: #64748b;
  }
  ::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }
  .dark ::-webkit-scrollbar-track { background: var(--scrollbar-track-dark); }
  .dark ::-webkit-scrollbar-thumb { background-color: var(--scrollbar-thumb-dark); border-radius: 6px; border: 3px solid var(--scrollbar-track-dark); }
  .dark ::-webkit-scrollbar-thumb:hover { background-color: var(--scrollbar-thumb-hover-dark); }
  
  ::-webkit-scrollbar-track { background: var(--scrollbar-track-light); }
  ::-webkit-scrollbar-thumb { background-color: var(--scrollbar-thumb-light); border-radius: 6px; border: 3px solid var(--scrollbar-track-light); }
  ::-webkit-scrollbar-thumb:hover { background-color: var(--scrollbar-thumb-hover-light); }
`;

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarError, setSidebarError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Layout.jsx: Checking auth...');
        if (pb.authStore.isValid && pb.authStore.model) {
          console.log('Layout.jsx: User found in authStore:', pb.authStore.model);
          setUser(pb.authStore.model);
        } else {
          console.log('Layout.jsx: Attempting to refresh auth token...');
          await pb.collection('users').authRefresh();
          console.log('Layout.jsx: Auth refresh result:', pb.authStore.model);
          setUser(pb.authStore.model || null);
        }
      } catch (error) {
        console.error("Layout.jsx: User not authenticated", error);
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
      console.log('Layout.jsx: Logging out...');
      await User.logout();
      navigate('/login');
    } catch (error) {
      console.error("Layout.jsx: Logout error:", error);
      setSidebarError('Logout failed. Please try again.');
    }
  };

  const handleMouseEnter = () => {
    setIsSidebarOpen(true);
  };

  const handleMouseLeave = () => {
    setIsSidebarOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <CalendarLoader />
      </div>
    );
  }

  if (!user) {
    console.log('Layout.jsx: No user, returning null');
    return null;
  }

  if (sidebarError) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <p className="text-red-500">{sidebarError}</p>
      </div>
    );
  }

  return (
    <>
      <style>{ScrollbarStyles}</style>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
          <Sidebar 
            className={`
              bg-white dark:bg-slate-900/95 backdrop-blur-lg shadow-xl transition-all duration-300 border-r border-slate-200 dark:border-slate-700/80 flex flex-col
              ${isSidebarOpen ? 'w-64' : 'w-20'}
              md:${isSidebarOpen ? 'w-64' : 'w-20'}
            `}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <SidebarContent className={`p-4 ${isSidebarOpen ? '' : 'pt-10'}`}>
              <SidebarGroup>
                <SidebarGroupLabel className={`text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-3 py-3 mb-2 ${isSidebarOpen ? '' : 'hidden'}`}>
                  Navigation
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className={`${isSidebarOpen ? '' : 'mt-0'}`}>
                    {navigationItems.map((item) => {
                      const isActive = location.pathname === item.url;
                      const IconComponent = item.icon;
                      return (
                        <SidebarMenuItem key={item.title}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <SidebarMenuButton 
                                  asChild 
                                  className={`
                                    relative overflow-hidden rounded-xl mb-2 transition-all duration-200 group border-0
                                    ${isActive 
                                      ? 'bg-blue-600 text-white shadow-lg' 
                                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 bg-transparent'
                                    }
                                    ${isSidebarOpen ? 'justify-start' : 'justify-center'}
                                  `}
                                >
                                  <Link 
                                    to={item.url} 
                                    className={`flex items-center ${isSidebarOpen ? 'gap-3 px-4 py-3' : 'px-0 py-3'} font-medium relative z-10`}
                                  >
                                    {IconComponent ? <IconComponent className="w-5 h-5" /> : <span>?</span>}
                                    <span className={`font-medium tracking-tight ${isSidebarOpen ? '' : 'hidden'}`}>{item.title}</span>
                                  </Link>
                                </SidebarMenuButton>
                              </TooltipTrigger>
                              <TooltipContent side="right" className={`${isSidebarOpen ? 'hidden' : ''} bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900`}>
                                {item.title}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            
            <SidebarFooter 
              className={`mt-auto px-0 py-4 border-t border-slate-200 dark:border-slate-700/80`}
            >
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu className={`${isSidebarOpen ? '' : 'mt-0'}`}>
                    {footerItems.map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <SidebarMenuItem key={item.title}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <SidebarMenuButton 
                                  className={`
                                    relative overflow-hidden rounded-xl mb-2 transition-all duration-200 group border-0
                                    hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 bg-transparent
                                    ${isSidebarOpen ? 'justify-start' : 'justify-center'}
                                  `}
                                  onClick={item.action ? item.action(setIsSettingsModalOpen, handleLogout) : undefined}
                                >
                                  <div className={`flex items-center ${isSidebarOpen ? 'gap-3 px-4 py-3' : 'px-0 py-3'} font-medium relative z-10`}>
                                    <IconComponent className="w-5 h-5" />
                                    <span className={`font-medium tracking-tight ${isSidebarOpen ? '' : 'hidden'}`}>{item.title}</span>
                                  </div>
                                </SidebarMenuButton>
                              </TooltipTrigger>
                              <TooltipContent side="right" className={`${isSidebarOpen ? 'hidden' : ''} bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900`}>
                                {item.title}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </SidebarMenuItem>
                      );
                    })}
                    <SidebarMenuItem>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div 
                              className={`
                                relative overflow-hidden rounded-xl mb-2 transition-all duration-200 group border-0
                                hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 bg-transparent
                                ${isSidebarOpen ? 'justify-start px-4 py-3' : 'justify-center px-0 py-3'}
                              `}
                            >
                              <div className={`flex items-center ${isSidebarOpen ? 'gap-3' : ''} font-medium relative z-10`}>
                                <ThemeToggle />
                                <span className={`font-medium tracking-tight ${isSidebarOpen ? '' : 'hidden'}`}>Theme</span>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className={`${isSidebarOpen ? 'hidden' : ''} bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900`}>
                            Theme
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarFooter>
          </Sidebar>

          <main className="flex-1 flex flex-col relative bg-slate-100 dark:bg-slate-900">
            <header className="px-6 py-4 md:hidden shadow-sm transition-colors duration-300 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SidebarTrigger 
                    className="p-2 rounded-lg transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white"
                  />
                  <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">TimeGrid</h1>
                </div>
                <ThemeToggle />
              </div>
            </header>

            <div className="flex-1">
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