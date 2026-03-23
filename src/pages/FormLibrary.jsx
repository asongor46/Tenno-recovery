import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Search, Eye, Trash2, CheckCircle2, ShieldCheck, Clock } from "lucide-react";
import { useStandardToast } from "@/components/shared/useStandardToast";

export default function FormLibrary() {
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });
  const { data: agentProfile } = useQuery({
    queryKey: ["agentProfile", currentUser?.email],
    queryFn: () => base44.entities.AgentProfile.filter({ email: currentUser.email }).then(r => r[0] || null),
    enabled: !!currentUser?.email,
  });
  const isAdmin = currentUser?.role === "admin";
  const isPro = isAdmin || agentProfile?.plan === "pro";
  const canUpload = isPro; // pro + admin can upload; starter gets read-only
  const [searchQuery, setSearchQuery] = useState("");
  const toast = useStandardToast();
  const queryClient = useQueryClient();

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ["formLibrary"],
    queryFn: () => base44.entities.FormLibrary.list("-times_used")
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const { data } = await base44.functions.invoke('analyzeAndStoreForm', { 
        file_url,
        filename: file.name 
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Form uploaded and analyzed");
      queryClient.invalidateQueries(["formLibrary"]);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FormLibrary.delete(id),
    onSuccess: () => {
      toast.success("Form deleted");
      queryClient.invalidateQueries(["formLibrary"]);
    }
  });

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const filteredForms = forms.filter(form => {
    const query = searchQuery.toLowerCase();
    return (
      form.form_name?.toLowerCase().includes(query) ||
      form.county_name?.toLowerCase().includes(query) ||
      form.form_type?.toLowerCase().includes(query)
    );
  });

  const formTypeColors = {
    claim_form: "bg-blue-500/10 text-blue-400",
    affidavit: "bg-purple-500/10 text-purple-400",
    assignment: "bg-green-500/10 text-green-400",
    cover_sheet: "bg-yellow-500/10 text-yellow-400",
    w9: "bg-orange-500/10 text-orange-400",
    other: "bg-slate-700 text-slate-400"
  };

  // All agents can browse — only upload is gated

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Form Library</h1>
          <p className="text-slate-400 mt-1">County forms and templates for filing packets</p>
        </div>
        
        <div>
          {canUpload ? (
            <>
              <input
                type="file"
                id="form-upload"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => document.getElementById('form-upload')?.click()}
                disabled={uploadMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploadMutation.isPending ? 'Uploading...' : 'Upload Form'}
              </Button>
            </>
          ) : (
            <span className="text-xs text-slate-400 bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg">
              🔒 Upgrade to Pro to upload forms
            </span>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search forms by name, county, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-slate-400">Loading forms...</div>
          ) : filteredForms.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">No forms found</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredForms.map((form) => (
                <div
                  key={form.id}
                  className="border border-slate-700 rounded-lg p-4 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-5 h-5 text-emerald-600" />
                        <h3 className="font-semibold text-lg">{form.form_name}</h3>
                        <Badge className={formTypeColors[form.form_type] || formTypeColors.other}>
                          {form.form_type}
                        </Badge>
                        {form.requires_notary && (
                          <Badge variant="outline" className="text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Notary Required
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mt-3">
                        <div className="text-slate-600">
                          <span className="font-medium">County:</span> {form.county_name}, {form.state}
                        </div>
                        {form.form_code && (
                          <div className="text-slate-600">
                            <span className="font-medium">Form Code:</span> {form.form_code}
                          </div>
                        )}
                        {form.page_count && (
                          <div className="text-slate-600">
                            <span className="font-medium">Pages:</span> {form.page_count}
                          </div>
                        )}
                        <div className="text-slate-600">
                          <span className="font-medium">Used:</span> {form.times_used || 0} times
                        </div>
                      </div>

                      {form.is_fillable_pdf && (
                        <div className="mt-2">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Fillable PDF
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {form.blank_template_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(form.blank_template_url, '_blank')}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}