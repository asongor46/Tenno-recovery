import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Activity,
  CheckCircle,
  Clock,
  FileText,
  User,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";

/**
 * ADDED: Real-Time Activity Feed
 * Shows live updates on case progress
 */

const eventIcons = {
  portal_invited: User,
  portal_viewed: Activity,
  agreement_signed: CheckCircle,
  id_uploaded: User,
  intake_submitted: FileText,
  notary_uploaded: CheckCircle,
  step_completed: CheckCircle,
  step_blocked: AlertCircle,
  default: Activity,
};

const eventColors = {
  portal_invited: "bg-blue-100 text-blue-600",
  portal_viewed: "bg-slate-100 text-slate-600",
  agreement_signed: "bg-green-100 text-green-600",
  id_uploaded: "bg-indigo-100 text-indigo-600",
  intake_submitted: "bg-purple-100 text-purple-600",
  notary_uploaded: "bg-emerald-100 text-emerald-600",
  step_completed: "bg-green-100 text-green-600",
  step_blocked: "bg-red-100 text-red-600",
  default: "bg-slate-100 text-slate-600",
};

export default function ActivityFeed({ caseId }) {
  // Fetch recent events
  const { data: events = [] } = useQuery({
    queryKey: ["portal-activity", caseId],
    queryFn: () => base44.entities.HomeownerTaskEvent.filter({ case_id: caseId }, "-created_date", 10),
    enabled: !!caseId,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  // Fetch activity log
  const { data: activities = [] } = useQuery({
    queryKey: ["portal-activities", caseId],
    queryFn: () => base44.entities.ActivityLog.filter({ case_id: caseId }, "-created_date", 10),
    enabled: !!caseId,
  });

  // Combine and sort by date
  const allActivity = [...events, ...activities]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </CardTitle>
          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {allActivity.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Activity className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allActivity.map((item) => {
              const eventType = item.event_type || item.action;
              const Icon = eventIcons[eventType] || eventIcons.default;
              const colorClass = eventColors[eventType] || eventColors.default;
              const description = item.description || getEventDescription(item);

              return (
                <div key={item.id} className="flex gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{description}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {format(new Date(item.created_date), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getEventDescription(event) {
  const descriptions = {
    portal_invited: "Portal access link sent",
    portal_viewed: "You viewed your portal",
    agreement_signed: "Agreement signed successfully",
    id_uploaded: "ID documents uploaded",
    intake_submitted: "Intake form completed",
    notary_uploaded: "Notary document uploaded",
    step_completed: `${event.step_key} step completed`,
    step_blocked: `${event.step_key} step needs attention`,
  };

  return descriptions[event.event_type] || event.action || "Activity recorded";
}