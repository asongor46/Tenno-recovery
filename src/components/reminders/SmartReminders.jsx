import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Bell, 
  Clock, 
  AlertCircle, 
  Calendar,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";

export default function SmartReminders() {
  const { data: cases = [] } = useQuery({
    queryKey: ["casesForReminders"],
    queryFn: () => base44.entities.Case.filter({ status: "active" }),
    staleTime: 60000,
  });

  const generateReminders = () => {
    const reminders = [];
    const today = new Date();

    cases.forEach(caseItem => {
      // Agreement not signed for 7+ days
      if (caseItem.agreement_status === "sent" && caseItem.agreement_sent_at) {
        const daysSince = differenceInDays(today, new Date(caseItem.agreement_sent_at));
        if (daysSince >= 7) {
          reminders.push({
            id: `agreement-${caseItem.id}`,
            caseId: caseItem.id,
            caseName: caseItem.owner_name,
            type: "agreement_overdue",
            priority: "high",
            message: `Agreement sent ${daysSince} days ago - follow up needed`,
            dueDate: null,
          });
        }
      }

      // Waiting period ending soon
      if (caseItem.filing_status === "awaiting_period" && caseItem.waiting_period_end) {
        const daysRemaining = differenceInDays(new Date(caseItem.waiting_period_end), today);
        if (daysRemaining <= 3 && daysRemaining >= 0) {
          reminders.push({
            id: `waiting-${caseItem.id}`,
            caseId: caseItem.id,
            caseName: caseItem.owner_name,
            type: "waiting_period_ending",
            priority: "medium",
            message: `Waiting period ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
            dueDate: caseItem.waiting_period_end,
          });
        }
      }

      // Hot case not contacted in 3 days
      if (caseItem.is_hot && caseItem.created_date) {
        const daysSince = differenceInDays(today, new Date(caseItem.created_date));
        if (daysSince >= 3) {
          reminders.push({
            id: `hot-${caseItem.id}`,
            caseId: caseItem.id,
            caseName: caseItem.owner_name,
            type: "hot_case_stale",
            priority: "high",
            message: `Hot case created ${daysSince} days ago - priority contact needed`,
            dueDate: null,
          });
        }
      }

      // Notary pending for 5+ days
      if (caseItem.notary_status === "pending" && caseItem.agreement_signed_at) {
        const daysSince = differenceInDays(today, new Date(caseItem.agreement_signed_at));
        if (daysSince >= 5) {
          reminders.push({
            id: `notary-${caseItem.id}`,
            caseId: caseItem.id,
            caseName: caseItem.owner_name,
            type: "notary_pending",
            priority: "medium",
            message: `Notary pending for ${daysSince} days - send reminder`,
            dueDate: null,
          });
        }
      }

      // Claim deadline approaching
      if (caseItem.sale_date) {
        const claimDeadline = addDays(new Date(caseItem.sale_date), 365); // Example: 1 year
        const daysRemaining = differenceInDays(claimDeadline, today);
        if (daysRemaining <= 30 && daysRemaining > 0 && caseItem.filing_status !== "completed") {
          reminders.push({
            id: `deadline-${caseItem.id}`,
            caseId: caseItem.id,
            caseName: caseItem.owner_name,
            type: "claim_deadline_approaching",
            priority: "high",
            message: `Claim deadline in ${daysRemaining} days - urgent action required`,
            dueDate: claimDeadline.toISOString(),
          });
        }
      }
    });

    return reminders.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  };

  const reminders = generateReminders();
  const highPriority = reminders.filter(r => r.priority === "high");
  const mediumPriority = reminders.filter(r => r.priority === "medium");

  const getPriorityColor = (priority) => {
    if (priority === "high") return "bg-red-100 text-red-700 border-red-200";
    if (priority === "medium") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  const getIcon = (type) => {
    if (type === "claim_deadline_approaching") return <AlertCircle className="w-5 h-5 text-red-600" />;
    if (type === "waiting_period_ending") return <Clock className="w-5 h-5 text-amber-600" />;
    if (type === "hot_case_stale") return <Bell className="w-5 h-5 text-orange-600" />;
    return <Bell className="w-5 h-5 text-blue-600" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Smart Reminders</h2>
          <p className="text-slate-500 mt-1">Automated alerts based on case activity</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-red-100 text-red-700 border-0">
            {highPriority.length} High Priority
          </Badge>
          <Badge className="bg-amber-100 text-amber-700 border-0">
            {mediumPriority.length} Medium
          </Badge>
        </div>
      </div>

      {reminders.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
            <p className="font-medium text-slate-900">All caught up!</p>
            <p className="text-sm text-slate-500 mt-1">No reminders at this time</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <Card key={reminder.id} className={`border-l-4 ${
              reminder.priority === "high" ? "border-l-red-500" :
              reminder.priority === "medium" ? "border-l-amber-500" :
              "border-l-blue-500"
            }`}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getIcon(reminder.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-slate-900">{reminder.caseName}</p>
                        <p className="text-sm text-slate-600 mt-1">{reminder.message}</p>
                        {reminder.dueDate && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                            <Calendar className="w-3 h-3" />
                            Due: {format(new Date(reminder.dueDate), "MMM d, yyyy")}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={getPriorityColor(reminder.priority)}>
                          {reminder.priority}
                        </Badge>
                        <Link to={createPageUrl(`CaseDetail?id=${reminder.caseId}`)}>
                          <Button variant="outline" size="sm">
                            View Case
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}