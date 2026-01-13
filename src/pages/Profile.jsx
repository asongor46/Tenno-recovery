import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import {
  User,
  Mail,
  Calendar,
  Shield,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import LoadingState from "@/components/shared/LoadingState";

export default function Profile() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading) {
    return <LoadingState message="Loading profile..." />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-3xl">
                {user?.full_name?.charAt(0) || "U"}
              </span>
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold text-slate-900">{user?.full_name || "User"}</h1>
              <p className="text-slate-500">{user?.email}</p>
              <Badge className="mt-2 capitalize">{user?.role || "User"}</Badge>
            </div>
            <div className="sm:ml-auto">
              <Link to={createPageUrl("Settings")}>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Details */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Full Name</p>
              <p className="font-medium">{user?.full_name || "Not set"}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Email Address</p>
              <p className="font-medium">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Role</p>
              <p className="font-medium capitalize">{user?.role || "User"}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Member Since</p>
              <p className="font-medium">
                {user?.created_date 
                  ? format(new Date(user.created_date), "MMMM d, yyyy")
                  : "—"
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Link to={createPageUrl("Settings")}>
            <Button variant="outline" className="w-full justify-start">
              <Settings className="w-4 h-4 mr-2" />
              Account Settings
            </Button>
          </Link>
          <Button 
            variant="outline" 
            className="w-full justify-start text-red-600 hover:text-red-700"
            onClick={() => base44.auth.logout()}
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}