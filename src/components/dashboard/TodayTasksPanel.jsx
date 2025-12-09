import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Phone,
  Mail,
  FileText,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";

/**
 * PHASE 4+ ENHANCEMENT: Today's Tasks & Alerts Panel
 * Shows what needs attention TODAY
 */

export default function TodayTasksPanel() {
  const today = new Date().toISOString().split('T')[0];

  // Fetch today's todos
  const { data: todos = [] } = useQuery({
    queryKey: ["todos-today"],
    queryFn: async () => {
      const allTodos = await base44.entities.Todo.filter({
        is_completed: false,
      }, "-priority");
      return allTodos;
    },
  });

  // Fetch alerts
  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts-today"],
    queryFn: async () => {
      const allAlerts = await base44.entities.Alert.filter({
        is_resolved: false,
      }, "-created_date");
      return allAlerts.slice(0, 10);
    },
  });

  // Categorize todos
  const dueTodayTodos = todos.filter(t => t.due_date === today);
  const overdueTodos = todos.filter(t => t.due_date && t.due_date < today);
  const highPriorityTodos = todos.filter(t => 
    t.priority === "high" || t.priority === "urgent"
  ).slice(0, 5);

  const priorityIcon = {
    urgent: "🔴",
    high: "🟡",
    medium: "🔵",
    low: "⚪",
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* TODAY'S TASKS */}
      <Card className="border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            Today's Tasks
            {dueTodayTodos.length > 0 && (
              <Badge className="ml-auto">{dueTodayTodos.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            {dueTodayTodos.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No tasks due today 🎉
              </div>
            ) : (
              <div className="space-y-2">
                {dueTodayTodos.map((todo) => (
                  <Link 
                    key={todo.id}
                    to={createPageUrl(`CaseDetail?id=${todo.case_id}`)}
                    className="block p-3 border rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{priorityIcon[todo.priority]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{todo.title}</div>
                        {todo.description && (
                          <div className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {todo.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* OVERDUE & ALERTS */}
      <Card className="border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            Alerts & Overdue
            {(overdueTodos.length + alerts.length) > 0 && (
              <Badge className="ml-auto bg-red-100 text-red-700">
                {overdueTodos.length + alerts.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            {overdueTodos.length === 0 && alerts.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No alerts or overdue tasks ✅
              </div>
            ) : (
              <div className="space-y-2">
                {/* Overdue todos first */}
                {overdueTodos.map((todo) => (
                  <Link 
                    key={todo.id}
                    to={createPageUrl(`CaseDetail?id=${todo.case_id}`)}
                    className="block p-3 border-2 border-red-300 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-red-600 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-red-900">{todo.title}</div>
                        <div className="text-xs text-red-700 mt-1">
                          Overdue: {format(new Date(todo.due_date), "MMM d, yyyy")}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}

                {/* System alerts */}
                {alerts.map((alert) => (
                  <Link 
                    key={alert.id}
                    to={createPageUrl(`CaseDetail?id=${alert.case_id}`)}
                    className={`block p-3 border rounded-lg hover:opacity-80 transition-opacity ${
                      alert.severity === "error" || alert.severity === "critical"
                        ? "bg-red-50 border-red-200"
                        : "bg-amber-50 border-amber-200"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                        alert.severity === "error" ? "text-red-600" : "text-amber-600"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{alert.title}</div>
                        <div className="text-xs opacity-80 mt-1 line-clamp-2">
                          {alert.message}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}