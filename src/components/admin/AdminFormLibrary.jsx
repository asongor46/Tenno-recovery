import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, ShieldCheck, Clock, Trash2, Search, Eye } from "lucide-react";
import { useStandardToast } from "@/components/shared/useStandardToast";

export default function AdminFormLibrary() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const toast = useStandardToast();

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ["adminFormLibrary"],
    queryFn: () => base44.entities.FormLibrary.list("-created_date"),
  });

  const verifyMutation = useMutation({
    mutationFn: (id) => base44.entities.FormLibrary.update(id, { is_verified: true }),
    onSuccess: () => {
      toast.success("Form verified");
      queryClient.invalidateQueries(["adminFormLibrary"]);
      queryClient.invalidateQueries(["formLibrary"]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FormLibrary.delete(id),
    onSuccess: () => {
      toast.success("Form deleted");
      queryClient.invalidateQueries(["adminFormLibrary"]);
      queryClient.invalidateQueries(["formLibrary"]);
    },
  });

  const filtered = forms.filter((f) => {
    const q = search.toLowerCase();
    return (
      f.form_name?.toLowerCase().includes(q) ||
      f.county_name?.toLowerCase().includes(q) ||
      f.uploaded_by_email?.toLowerCase().includes(q)
    );
  });

  const pending = filtered.filter((f) => !f.is_verified && f.uploaded_by_role !== "admin");
  const verified = filtered.filter((f) => f.is_verified || f.uploaded_by_role === "admin");

  const renderForm = (form) => (
    <div
      key={form.id}
      className="flex items-center justify-between gap-4 border border-slate-700 rounded-lg px-4 py-3"
    >
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{form.form_name}</p>
          <p className="text-xs text-slate-400">
            {form.county_name}, {form.state} · {form.form_type}
            {form.uploaded_by_email && (
              <span className="ml-2 text-slate-500">by {form.uploaded_by_email}</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {form.is_verified || form.uploaded_by_role === "admin" ? (
          <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-xs flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Verified
          </Badge>
        ) : (
          <Badge className="bg-slate-700 text-slate-400 border-0 text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending
          </Badge>
        )}

        {form.blank_template_url && (
          <Button variant="ghost" size="sm" onClick={() => window.open(form.blank_template_url, "_blank")}>
            <Eye className="w-4 h-4 text-slate-400" />
          </Button>
        )}

        {!form.is_verified && form.uploaded_by_role !== "admin" && (
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-3 text-xs"
            onClick={() => verifyMutation.mutate(form.id)}
            disabled={verifyMutation.isPending}
          >
            Verify
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => deleteMutation.mutate(form.id)}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search forms, counties, uploaders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <p className="text-slate-400 text-sm py-4 text-center">Loading...</p>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                Pending Review ({pending.length})
              </p>
              {pending.map(renderForm)}
            </div>
          )}

          {verified.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Verified ({verified.length})
              </p>
              {verified.map(renderForm)}
            </div>
          )}

          {filtered.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-8">No forms found</p>
          )}
        </>
      )}
    </div>
  );
}