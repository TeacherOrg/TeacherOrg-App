import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { User } from "@/api/entities";
import { createPageUrl } from "@/utils";
import { Calendar, Users, Settings, BookOpen, GraduationCap, LogOut, ClipboardList } from "lucide-react"; // Füge ClipboardList hinzu
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter
} from "@/components/ui/sidebar";
import SettingsModal from "../components/settings/SettingsModal";
import ThemeToggle from "../components/ui/ThemeToggle";
import CalendarLoader from "../components/ui/CalendarLoader";

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
  { // Neuer Eintrag für Chores
    title: "Ämtliplan",
    url: createPageUrl("Chores"), // Angenommen, die Route ist "/chores" oder ähnlich; passe bei Bedarf an
    icon: ClipboardList,
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
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        // User not logged in - base44 will handle authentication
        console.log("User not authenticated");
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await User.logout();
      // Redirect zu Login (nutze react-router's useNavigate, da du useLocation hast)
      const navigate = useNavigate(); // Import: import { useNavigate } from "react-router-dom";
      navigate('/login'); // Oder wo dein Login ist
      // Optional: Toast zeigen (wenn du Toaster hast)
      // toast.success('Erfolgreich ausgeloggt!');
    } catch (error) {
      console.error("Logout error:", error);
      // Optional: Error-Toast
      // toast.error('Logout fehlgeschlagen. Bitte versuchen Sie es erneut.');
    }
  };

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <CalendarLoader />
      </div>
    );
  }

  return (
    <>
      <style>{ScrollbarStyles}</style>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
          <Sidebar 
            className="bg-white dark:bg-slate-900/95 backdrop-blur-lg shadow-xl transition-colors duration-300 border-r border-slate-200 dark:border-slate-700/80 flex flex-col"
          >
            <div>
              <SidebarHeader 
                className="border-b border-slate-200 dark:border-slate-700/80 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-50 dark:from-slate-700 dark:to-slate-800 rounded-xl flex items-center justify-center shadow-lg">
                    <BookOpen className="w-5 h-5 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">TimeGrid</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Academic Planner</p>
                  </div>
                </div>
                {user && (
                  <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.full_name || user.username}</p> {/* Neu: Fallback zu username */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">@{user.username}</p> {/* Neu: Username als @-Handle anzeigen */}
                  </div>
                )}
              </SidebarHeader>
              
              <SidebarContent 
                className="p-4"
              >
                <SidebarGroup>
                  <SidebarGroupLabel className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-3 py-3 mb-2">
                    Navigation
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {navigationItems.map((item) => {
                        const isActive = location.pathname === item.url;
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton 
                              asChild 
                              className={`
                                relative overflow-hidden rounded-xl mb-2 transition-all duration-200 group border-0
                                ${isActive 
                                  ? 'bg-blue-600 text-white shadow-lg' 
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 bg-transparent'
                                }
                              `}
                            >
                              <Link 
                                to={item.url} 
                                className="flex items-center gap-3 px-4 py-3 font-medium relative z-10"
                              >
                                <item.icon className="w-4 h-4" />
                                <span className="font-medium tracking-tight">{item.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </div>
            
            <SidebarFooter 
              className="mt-auto p-4 border-t border-slate-200 dark:border-slate-700/80"
            >
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="w-8 h-8 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <ThemeToggle />
                {user && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="w-8 h-8 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </SidebarFooter>
          </Sidebar>

          <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-100 dark:bg-slate-900">
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