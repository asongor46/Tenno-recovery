import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import {
  Trash2,
  AlertTriangle,
  Archive,
  FileX,
  Database,
  RefreshCw,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function CleanupTools() {
  const [isDeleting, setIsDeleting] = useState(null);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const queryClient = useQueryClient();

  const { data: cases = [] } = useQuery({
    queryKey: ["cases-cleanup"],
    queryFn: () => base44.entities.Case.list(),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["docs-cleanup"],
    queryFn: () => base44.entities.Document.list(),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities-cleanup"],
    queryFn: () => base44.entities.ActivityLog.list(),
  });

  // Calculate stats
  const archivedCases = cases.filter(c => c.status === "archived");
  const closedCases = cases.filter(c => c.status === "closed");
  const oldCases = cases.filter(c => {
    if (!c.updated_date) return false;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return new Date(c.updated_date) < sixMonthsAgo && c.status !== "active";
  });

  // Test cases (case number contains "test" or owner name is "Test")
  const testCases = cases.filter(c => 
    c.case_number?.toLowerCase().includes("test") ||
    c.owner_name?.toLowerCase().includes("test")
  );

  // Orphaned documents (no matching case)
  const caseIds = new Set(cases.map(c => c.id));
  const orphanedDocs = documents.filter(d => d.case_id && !caseIds.has(d.case_id));

  const handleBulkDelete = async (type, items) => {
    setIsDeleting(type);
    setDeleteProgress(0);

    const total = items.length;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (type === "cases") {
        await base44.entities.Case.delete(item.id);
      } else if (type === "documents") {
        await base44.entities.Document.delete(item.id);
      } else if (type === "activities") {
        await base44.entities.ActivityLog.delete(item.id);
      }
      setDeleteProgress(Math.round(((i + 1) / total) * 100));
    }

    queryClient.invalidateQueries();
    setIsDeleting(null);
    setDeleteProgress(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
          <Trash2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Cleanup Tools</h1>
          <p className="text-slate-500">Remove old data and free up storage</p>
        </div>
      </div>

      {/* Warning Banner */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Caution: Destructive Actions</p>
              <p className="text-sm text-amber-700 mt-1">
                The actions on this page permanently delete data. Make sure you have backups 
                before proceeding. Deleted data cannot be recovered.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Overlay */}
      {isDeleting && (
        <Card className="bg-slate-900 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-5 h-5 animate-spin" />
              <p className="font-medium">Deleting {isDeleting}...</p>
            </div>
            <Progress value={deleteProgress} className="h-2" />
            <p className="text-sm text-slate-400 mt-2">{deleteProgress}% complete</p>
          </CardContent>
        </Card>
      )}

      {/* Cleanup Options */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Archived Cases */}
        <CleanupCard
          title="Archived Cases"
          description="Cases that have been marked as archived"
          icon={Archive}
          count={archivedCases.length}
          color="slate"
          onDelete={() => handleBulkDelete("cases", archivedCases)}
          isDeleting={isDeleting === "cases"}
        />

        {/* Closed Cases (Old) */}
        <CleanupCard
          title="Old Closed Cases"
          description="Closed cases not updated in 6+ months"
          icon={FileX}
          count={oldCases.length}
          color="amber"
          onDelete={() => handleBulkDelete("cases", oldCases)}
          isDeleting={isDeleting === "cases"}
        />

        {/* Test Cases */}
        <CleanupCard
          title="Test Cases"
          description="Cases with 'test' in name or case number"
          icon={Database}
          count={testCases.length}
          color="purple"
          onDelete={() => handleBulkDelete("cases", testCases)}
          isDeleting={isDeleting === "cases"}
        />

        {/* Orphaned Documents */}
        <CleanupCard
          title="Orphaned Documents"
          description="Documents without a matching case"
          icon={FileX}
          count={orphanedDocs.length}
          color="red"
          onDelete={() => handleBulkDelete("documents", orphanedDocs)}
          isDeleting={isDeleting === "documents"}
        />
      </div>

      {/* Storage Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Storage Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-slate-500">Total Cases</p>
              <p className="text-2xl font-bold text-slate-900">{cases.length}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Documents</p>
              <p className="text-2xl font-bold text-slate-900">{documents.length}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Activity Logs</p>
              <p className="text-2xl font-bold text-slate-900">{activities.length}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Cleanable Items</p>
              <p className="text-2xl font-bold text-red-600">
                {archivedCases.length + oldCases.length + testCases.length + orphanedDocs.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CleanupCard({ title, description, icon: Icon, count, color, onDelete, isDeleting }) {
  const colorClasses = {
    slate: "bg-slate-100 text-slate-600",
    amber: "bg-amber-100 text-amber-600",
    purple: "bg-purple-100 text-purple-600",
    red: "bg-red-100 text-red-600",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-lg px-3">
            {count}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              disabled={count === 0 || isDeleting}
              className="w-full"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete {count} {count === 1 ? "item" : "items"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete {count} {title.toLowerCase()}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700">
                Delete All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}