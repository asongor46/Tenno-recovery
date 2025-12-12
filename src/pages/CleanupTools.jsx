import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import RoleGuard from "@/components/rbac/RoleGuard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  AlertTriangle,
  Copy,
  Archive,
  RefreshCw,
  Database,
  FileX,
  UserX,
  Loader2,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { useStandardToast } from "@/components/shared/useStandardToast";
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

/**
 * CLEANUP TOOLS PAGE - Step 9
 * Comprehensive maintenance and data quality system
 */

export default function CleanupTools() {
  const [results, setResults] = useState({});
  const toast = useStandardToast();

  const detectDuplicates = useMutation({
    mutationFn: () => base44.functions.invoke('dataCleanup', { action: 'detect_duplicates' }),
    onSuccess: (response) => {
      const { data } = response;
      setResults(prev => ({ ...prev, duplicates: data.result }));
      toast.success(`Found ${data.result.count} duplicate cases`);
    },
    onError: () => toast.error('Failed to detect duplicates')
  });

  const archiveStaleCases = useMutation({
    mutationFn: () => base44.functions.invoke('dataCleanup', { action: 'archive_stale' }),
    onSuccess: (response) => {
      const { data } = response;
      setResults(prev => ({ ...prev, archived: data.result }));
      toast.success(`Archived ${data.result.archived} stale cases`);
    },
    onError: () => toast.error('Failed to archive cases')
  });

  const cleanOrphanedData = useMutation({
    mutationFn: () => base44.functions.invoke('dataCleanup', { action: 'clean_orphans' }),
    onSuccess: (response) => {
      const { data } = response;
      setResults(prev => ({ ...prev, orphans: data.result }));
      toast.success(`Cleaned ${data.result.total_cleaned} orphaned records`);
    },
    onError: () => toast.error('Failed to clean orphans')
  });

  const validateData = useMutation({
    mutationFn: () => base44.functions.invoke('dataCleanup', { action: 'validate_integrity' }),
    onSuccess: (response) => {
      const { data } = response;
      setResults(prev => ({ ...prev, validation: data.result }));
      toast.success(`Validation complete: ${data.result.issues.length} issues found`);
    },
    onError: () => toast.error('Failed to validate data')
  });

  const fixMissingCounties = useMutation({
    mutationFn: () => base44.functions.invoke('dataCleanup', { action: 'fix_missing_counties' }),
    onSuccess: (response) => {
      const { data } = response;
      setResults(prev => ({ ...prev, counties: data.result }));
      toast.success(`Fixed ${data.result.fixed} cases with missing county data`);
    },
    onError: () => toast.error('Failed to fix counties')
  });

  const normalizePhones = useMutation({
    mutationFn: () => base44.functions.invoke('dataCleanup', { action: 'normalize_phones' }),
    onSuccess: (response) => {
      const { data } = response;
      setResults(prev => ({ ...prev, phones: data.result }));
      toast.success(`Normalized ${data.result.normalized} phone numbers`);
    },
    onError: () => toast.error('Failed to normalize phones')
  });

  const runFullCleanup = useMutation({
    mutationFn: () => base44.functions.invoke('dataCleanup', { action: 'run_full_cleanup' }),
    onSuccess: (response) => {
      const { data } = response;
      setResults(prev => ({ ...prev, full: data.result }));
      toast.success('Full cleanup complete!');
    },
    onError: () => toast.error('Full cleanup failed')
  });

  const tools = [
    {
      id: 'duplicates',
      title: 'Detect Duplicate Cases',
      description: 'Find cases with identical owner names, addresses, or parcel numbers',
      icon: Copy,
      color: 'blue',
      mutation: detectDuplicates,
      dangerous: false
    },
    {
      id: 'stale',
      title: 'Archive Stale Cases',
      description: 'Archive cases inactive for 180+ days with no activity',
      icon: Archive,
      color: 'amber',
      mutation: archiveStaleCases,
      dangerous: true
    },
    {
      id: 'orphans',
      title: 'Clean Orphaned Data',
      description: 'Remove documents, steps, and logs for deleted cases',
      icon: FileX,
      color: 'red',
      mutation: cleanOrphanedData,
      dangerous: true
    },
    {
      id: 'validation',
      title: 'Validate Data Integrity',
      description: 'Check for missing required fields, invalid statuses, broken references',
      icon: Database,
      color: 'purple',
      mutation: validateData,
      dangerous: false
    },
    {
      id: 'counties',
      title: 'Fix Missing County Data',
      description: 'Attempt to populate missing county/state fields',
      icon: RefreshCw,
      color: 'green',
      mutation: fixMissingCounties,
      dangerous: false
    },
    {
      id: 'phones',
      title: 'Normalize Phone Numbers',
      description: 'Standardize phone number formats across all cases',
      icon: UserX,
      color: 'indigo',
      mutation: normalizePhones,
      dangerous: false
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    indigo: 'bg-indigo-500'
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-8">
        <div>
        <h1 className="text-3xl font-bold text-slate-900">Cleanup & Maintenance Tools</h1>
        <p className="text-slate-500 mt-1">System maintenance, data quality, and cleanup operations</p>
      </div>

      {/* Full Cleanup */}
      <Card className="border-emerald-200 bg-emerald-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-emerald-600" />
            Run Full Cleanup
          </CardTitle>
          <CardDescription>
            Execute all cleanup operations in sequence (duplicates → orphans → validation → normalization)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                size="lg" 
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={runFullCleanup.isPending}
              >
                {runFullCleanup.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Running Full Cleanup...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Run Full Cleanup
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Run Full System Cleanup?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will execute all cleanup operations. This may take several minutes and will modify data.
                  It's recommended to run this during low-traffic hours.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => runFullCleanup.mutate()}>
                  Proceed
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {results.full && (
            <div className="mt-4 p-4 bg-white rounded-lg border">
              <p className="font-semibold text-sm mb-2">Full Cleanup Results:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Duplicates: {results.full.duplicates_found || 0}</div>
                <div>Orphans Cleaned: {results.full.orphans_cleaned || 0}</div>
                <div>Issues Found: {results.full.validation_issues || 0}</div>
                <div>Phone Numbers Fixed: {results.full.phones_normalized || 0}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Tools */}
      <div className="grid md:grid-cols-2 gap-6">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const result = results[tool.id];

          return (
            <Card key={tool.id} className={tool.dangerous ? 'border-red-200' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-lg ${colorClasses[tool.color]} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  {tool.title}
                  {tool.dangerous && (
                    <Badge variant="outline" className="ml-auto border-red-300 text-red-600">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Destructive
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {tool.dangerous ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        disabled={tool.mutation.isPending}
                      >
                        {tool.mutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Icon className="w-4 h-4 mr-2" />
                            Run {tool.title}
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          Confirm Destructive Operation
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This operation will modify or delete data. Are you sure you want to proceed?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => tool.mutation.mutate()} className="bg-red-600">
                          Yes, Proceed
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => tool.mutation.mutate()}
                    disabled={tool.mutation.isPending}
                  >
                    {tool.mutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Icon className="w-4 h-4 mr-2" />
                        Run {tool.title}
                      </>
                    )}
                  </Button>
                )}

                {result && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm">
                    {tool.id === 'duplicates' && (
                      <>
                        <p className="font-semibold mb-1">Found {result.count} duplicate sets</p>
                        {result.examples?.slice(0, 3).map((dup, i) => (
                          <p key={i} className="text-slate-600 text-xs">• {dup.owner_name} ({dup.count} matches)</p>
                        ))}
                      </>
                    )}
                    {tool.id === 'stale' && (
                      <p>Archived {result.archived} cases older than 180 days</p>
                    )}
                    {tool.id === 'orphans' && (
                      <>
                        <p>Cleaned {result.total_cleaned} orphaned records:</p>
                        <p className="text-xs text-slate-600">Documents: {result.documents}, Steps: {result.steps}, Logs: {result.logs}</p>
                      </>
                    )}
                    {tool.id === 'validation' && (
                      <>
                        <p className="font-semibold mb-1">{result.issues.length} issues found</p>
                        {result.issues.slice(0, 3).map((issue, i) => (
                          <p key={i} className="text-xs text-red-600">• {issue}</p>
                        ))}
                      </>
                    )}
                    {tool.id === 'counties' && (
                      <p>Fixed {result.fixed} cases with missing county data</p>
                    )}
                    {tool.id === 'phones' && (
                      <p>Normalized {result.normalized} phone numbers</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
    </RoleGuard>
  );
}