import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LogOut, User, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePortalSession } from "@/hooks/usePortalSession";

export default function PortalHeader({ currentStep, showBackToDashboard = false }) {
  const { user, logout } = usePortalSession();

  return (
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/11ed7b05d_Screenshot_20251213_181447_Chrome.jpg" 
              alt="TENNO RECOVERY" 
              className="h-10 w-auto"
            />
            {currentStep && (
              <span className="text-sm text-slate-500 hidden sm:inline">
                Step: {currentStep}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {showBackToDashboard && (
              <Link to={createPageUrl("PortalDashboard")}>
                <Button variant="ghost" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              </Link>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-emerald-700" />
                  </div>
                  <span className="hidden md:inline text-sm">
                    {user?.email || "Account"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm text-slate-600">
                  {user?.email}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}