import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Briefcase,
  Flame,
  Building2,
  FileText,
  BookOpen,
  Wrench,
  ChevronDown,
  ChevronRight,
  Search,
  Bell,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  Phone,
  MessageSquare,
  Mail,
  MessageCircle,
  FileCode,
  PackageOpen,
  ScanText,
  CheckSquare,
  Users,
  FolderOpen,
  Activity,
  Trash2,
  Inbox,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/toaster";
import AgentChatbot from "@/components/dashboard/AgentChatbot";
import ErrorBoundary from "@/components/shared/ErrorBoundary";

const navigation = [
  { name: "Dashboard", href: "Dashboard", icon: LayoutDashboard },
  { 
    name: "Cases", 
    href: "Cases", 
    icon: Briefcase,
    subtitle: "All imported, scanned, and manually entered cases"
  },
  { name: "County Directory", href: "Counties", icon: Building2 },
  { name: "Templates", href: "Templates", icon: FileText },
  { name: "How-To", href: "HowTo", icon: BookOpen },
  {
    name: "Tools",
    icon: Wrench,
    children: [
      { name: "Packet Builder", href: "PacketBuilder", icon: PackageOpen },
      { name: "Form Library", href: "FormLibrary", icon: FileCode },
      { name: "File Manager", href: "FileManager", icon: FolderOpen },
    ],
  },
  {
    name: "Admin",
    icon: Users,
    adminOnly: true,
    children: [
      { name: "User Management", href: "UserManagement", icon: Users },
      { name: "Invoices", href: "Invoices", icon: DollarSign },
      { name: "Payment Pipeline", href: "PaymentPipeline", icon: DollarSign },
    ],
  },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  // Public pages (no auth, no layout)
  const isPublicPage = ['LandingPage', 'HowItWorks', 'About', 'Contact', 'AgentApply', 'AgentPending'].includes(currentPageName);
  const isPortalPage = currentPageName?.startsWith("Portal");

  // Auth check for agent pages
  const { data: user, isLoading: authLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    enabled: !isPublicPage && !isPortalPage,
    retry: false,
  });

  const userRole = user?.role || "user";

  const { data: alerts = [] } = useQuery({
    queryKey: ["unreadAlerts"],
    queryFn: async () => {
      try {
        const allAlerts = await base44.entities.Alert.filter({ is_read: false });
        return allAlerts.slice(0, 5);
      } catch (error) {
        console.error("Error fetching alerts:", error);
        return [];
      }
    },
    enabled: !!user && !isPublicPage && !isPortalPage,
    retry: false,
    refetchOnMount: true,
    staleTime: 0,
  });

  // Check if user has approved AgentProfile
  const { data: profile } = useQuery({
    queryKey: ["agentProfile", user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const profiles = await base44.entities.AgentProfile.filter({ email: user.email });
      return profiles[0] || null;
    },
    enabled: !!user?.email && !isPublicPage && !isPortalPage,
  });

  const toggleMenu = (menuName) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  // [ENHANCED - Tier 3] Redirect based on profile status + onboarding
  React.useEffect(() => {
    // Skip all agent profile checks for admins
    if (user?.role === "admin") return;
    
    if (user && profile !== undefined && !isPublicPage && !isPortalPage) {
      if (!profile) {
        window.location.href = createPageUrl("AgentApply");
      } else if (profile.status === "pending") {
        window.location.href = createPageUrl("AgentPending");
      } else if (profile.status === "rejected") {
        alert("Your application has been rejected. Please contact support.");
        base44.auth.logout();
      } else if (profile.status === "approved" && !(profile.notes || "").includes("Completed onboarding") && currentPageName !== "AgentOnboarding") {
        // Approved but hasn't completed onboarding
        window.location.href = createPageUrl("AgentOnboarding");
      }
    }
  }, [user, profile, currentPageName, isPublicPage, isPortalPage]);

  // Public pages (no auth, no layout)
  if (isPublicPage || isPortalPage) {
    return <>{children}</>;
  }

  // Auth loading state for agent pages
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    base44.auth.redirectToLogin(window.location.pathname);
    return null;
  }



  return (
    <div className="min-h-screen bg-slate-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-slate-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/11ed7b05d_Screenshot_20251213_181447_Chrome.jpg" 
              alt="TENNO RECOVERY" 
              className="h-10 w-auto"
            />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto h-[calc(100vh-64px)]">
          {navigation.filter(item => !item.adminOnly || userRole === "admin").map((item) => (
            <div key={item.name}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className="w-full flex items-center justify-between px-4 py-3 text-slate-300 hover:bg-slate-800/50 rounded-xl transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    {expandedMenus[item.name] ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                  {expandedMenus[item.name] && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          to={createPageUrl(child.href)}
                          className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/30 rounded-lg transition-colors text-sm"
                        >
                          <child.icon className="w-4 h-4" />
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={createPageUrl(item.href)}
                  className={`flex flex-col px-4 py-3 rounded-xl transition-all group ${
                    currentPageName === item.href
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "text-slate-300 hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={`w-5 h-5 transition-colors ${
                        currentPageName === item.href
                          ? "text-emerald-400"
                          : "text-slate-400 group-hover:text-emerald-400"
                      }`}
                    />
                    <span className="font-medium">{item.name}</span>
                    {item.name === "Hot Cases" && (
                      <Badge className="ml-auto bg-orange-500/20 text-orange-400 border-0 text-xs">
                        HOT
                      </Badge>
                    )}
                  </div>
                  {/* ADDED: Show subtitle if present */}
                  {item.subtitle && (
                    <span className="text-xs text-slate-500 ml-8 mt-0.5">
                      {item.subtitle}
                    </span>
                  )}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content area */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            {/* Mobile menu button & Search */}
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-600 hover:text-slate-900"
              >
                <Menu className="w-6 h-6" />
              </button>

              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search cases, counties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-100/50 border-0 focus-visible:ring-emerald-500/20 focus-visible:ring-2"
                />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5 text-slate-600" />
                    {alerts.length > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="px-4 py-3 border-b">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                  </div>
                  {alerts.length === 0 ? (
                    <div className="px-4 py-6 text-center text-slate-500 text-sm">
                      No new notifications
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <DropdownMenuItem key={alert.id} className="px-4 py-3">
                        <div>
                          <p className="font-medium text-sm">{alert.title}</p>
                          <p className="text-xs text-slate-500 mt-1">{alert.message}</p>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Settings */}
              <Link to={createPageUrl("Settings")}>
                <Button variant="ghost" size="icon">
                  <Settings className="w-5 h-5 text-slate-600" />
                </Button>
              </Link>

              {/* Profile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {user?.full_name?.charAt(0) || "U"}
                      </span>
                    </div>
                    <span className="hidden sm:inline text-sm font-medium text-slate-700">
                      {user?.full_name || "User"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-4 py-3 border-b">
                    <p className="font-medium text-sm">{user?.full_name}</p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl("Profile")} className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl("Settings")} className="cursor-pointer">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-3 sm:p-4 lg:p-8 pb-20 lg:pb-8 bg-slate-900">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
        </div>

        {/* Agent Chatbot - Available throughout the app */}
        <AgentChatbot />

        <Toaster />
        </div>
        );
        }