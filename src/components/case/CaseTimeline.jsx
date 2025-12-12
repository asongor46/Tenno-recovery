import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import {
  Circle,
  CheckCircle2,
  FileText,
  User,
  Mail,
  Phone,
  Upload,
  Download,
  AlertCircle,
} from "lucide-react";

const eventIcons = {
  case_created: Circle,
  agreement_sent: Mail,
  agreement_signed: CheckCircle2,
  document_uploaded: Upload,
  contact_attempt: Phone,
  notary_validated: CheckCircle2,
  packet_generated: FileText,
  case_filed: FileText,
  payment_received: CheckCircle2,
  default: Circle,
};

const eventColors = {
  case_created: "text-slate-500",
  agreement_sent: "text-blue-500",
  agreement_signed: "text-emerald-500",
  document_uploaded: "text-indigo-500",
  contact_attempt: "text-amber-500",
  notary_validated: "text-purple-500",
  packet_generated: "text-teal-500",
  case_filed: "text-green-500",
  payment_received: "text-emerald-600",
  default: "text-slate-400",
};

export default function CaseTimeline({ caseId }) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["caseTimeline", caseId],
    queryFn: () => base44.entities.ActivityLog.filter({ case_id: caseId }, "-created_date"),
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        <p>No timeline events yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

      {/* Events */}
      <div className="space-y-6">
        {activities.map((activity, index) => {
          const Icon = eventIcons[activity.event_type] || eventIcons.default;
          const colorClass = eventColors[activity.event_type] || eventColors.default;

          return (
            <div key={activity.id} className="relative pl-12">
              {/* Icon */}
              <div className={`absolute left-0 w-8 h-8 rounded-full bg-white border-2 flex items-center justify-center ${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>

              {/* Content */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{activity.action}</p>
                    {activity.description && (
                      <p className="text-sm text-slate-600 mt-1">{activity.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span>{format(new Date(activity.created_date), "MMM d, yyyy 'at' h:mm a")}</span>
                      {activity.performed_by && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {activity.performed_by}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}