import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import {
  Activity,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Filter,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RoleGuard from "@/components/rbac/RoleGuard";

export default function AutomationLog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: activities = [], isLoading, refetch } = useQuery({
    queryKey: ["all-activities"],
    queryFn: () => base44.entities.ActivityLog.list("-created_date", 200),
  });

  const { data: cases = [] } = useQuery({
    queryKey: ["cases-for-logs"],
    queryFn: () => base44.entities.Case.list(),
  });

  const getCaseName = (caseId) => {
    const c = cases.find(c => c.id === caseId);
    return c?.owner_name || "System";
  };

  const filteredActivities = activities.filter(a => {
    const matchesSearch = 
      a.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCaseName(a.case_id).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getActionIcon = (action) => {
    const lowerAction = action?.toLowerCase() || "";
    if (lowerAction.includes("error") || lowerAction.includes("failed")) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    if (lowerAction.includes("warning")) {
      return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    }
    if (lowerAction.includes("complete") || lowerAction.includes("success") || lowerAction.includes("signed") || lowerAction.includes("approved")) {
      return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    }
    return <Activity className="w-5 h-5 text-blue-500" />;
  };

  // Group activities by date
  const groupedActivities = filteredActivities.reduce((acc, activity) => {
    const date = activity.created_date 
      ? format(new Date(activity.created_date), "yyyy-MM-dd")
      : "Unknown";
    if (!acc[date]) acc[date] = [];
    acc[date].push(activity);
    return acc;
  }, {});

  return (
    <RoleGuard allowedRoles={["admin", "agent"]}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Automation Log</h1>
            <p className="text-slate-500">System events and activity history</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total Events</p>
            <p className="text-2xl font-bold text-slate-900">{activities.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Today</p>
            <p className="text-2xl font-bold text-emerald-600">
              {activities.filter(a => {
                const today = new Date().toDateString();
                return a.created_date && new Date(a.created_date).toDateString() === today;
              }).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">This Week</p>
            <p className="text-2xl font-bold text-blue-600">
              {activities.filter(a => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return a.created_date && new Date(a.created_date) > weekAgo;
              }).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Errors</p>
            <p className="text-2xl font-bold text-red-600">
              {activities.filter(a => 
                a.action?.toLowerCase().includes("error") || 
                a.action?.toLowerCase().includes("failed")
              ).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading activities...</div>
      ) : Object.keys(groupedActivities).length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">No activity recorded yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([date, dayActivities]) => (
            <Card key={date}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  {date === format(new Date(), "yyyy-MM-dd") ? "Today" :
                   date === format(new Date(Date.now() - 86400000), "yyyy-MM-dd") ? "Yesterday" :
                   format(new Date(date), "EEEE, MMMM d, yyyy")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dayActivities.map((activity) => (
                    <div key={activity.id} className="flex gap-4">
                      <div className="flex-shrink-0 mt-0.5">
                        {getActionIcon(activity.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-slate-900">{activity.action}</p>
                            {activity.description && (
                              <p className="text-sm text-slate-500 mt-0.5">{activity.description}</p>
                            )}
                          </div>
                          <Badge variant="secondary" className="flex-shrink-0">
                            {getCaseName(activity.case_id)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {activity.created_date 
                              ? format(new Date(activity.created_date), "h:mm a")
                              : "—"
                            }
                          </div>
                          {activity.performed_by && (
                            <span>by {activity.performed_by}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </RoleGuard>
  );
}