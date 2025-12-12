import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import {
  Plus,
  FileText,
  Eye,
  Edit2,
  Trash2,
  Copy,
  CheckCircle2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AgreementTemplateForm from "@/components/agreements/AgreementTemplateForm";

export default function AgreementTemplates() {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["agreementTemplates"],
    queryFn: () => base44.entities.AgreementTemplate.list("-created_date"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AgreementTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agreementTemplates"] }),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (templateId) => {
      // Clear all defaults first
      const allTemplates = await base44.entities.AgreementTemplate.list();
      for (const t of allTemplates) {
        if (t.is_default) {
          await base44.entities.AgreementTemplate.update(t.id, { is_default: false });
        }
      }
      // Set new default
      await base44.entities.AgreementTemplate.update(templateId, { is_default: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agreementTemplates"] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (template) => {
      const { id, created_date, updated_date, created_by, ...templateData } = template;
      await base44.entities.AgreementTemplate.create({
        ...templateData,
        name: `${template.name} (Copy)`,
        is_default: false,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agreementTemplates"] }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Agreement Templates</h1>
          <p className="text-slate-500 mt-1">Manage customizable agreement templates</p>
        </div>
        <Button onClick={() => setShowNewDialog(true)} className="bg-emerald-600">
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            Loading templates...
          </div>
        ) : templates.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No templates yet</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowNewDialog(true)}
            >
              Create First Template
            </Button>
          </div>
        ) : (
          templates.map((template) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-emerald-600" />
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </div>
                    {template.is_default && (
                      <Badge className="bg-amber-100 text-amber-700 border-0">
                        <Star className="w-3 h-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {template.description && (
                    <p className="text-sm text-slate-600">{template.description}</p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {template.merge_fields?.length || 0} fields
                    </Badge>
                    {template.requires_notary && (
                      <Badge variant="outline" className="text-xs">
                        Notary Required
                      </Badge>
                    )}
                    {template.version && (
                      <Badge variant="outline" className="text-xs">
                        v{template.version}
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewTemplate(template)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingTemplate(template)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => duplicateMutation.mutate(template)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    {!template.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDefaultMutation.mutate(template.id)}
                      >
                        <Star className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (window.confirm("Delete this template?")) {
                          deleteMutation.mutate(template.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* New/Edit Dialog */}
      <Dialog
        open={showNewDialog || !!editingTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setShowNewDialog(false);
            setEditingTemplate(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "New Agreement Template"}
            </DialogTitle>
          </DialogHeader>
          <AgreementTemplateForm
            template={editingTemplate}
            onSuccess={() => {
              setShowNewDialog(false);
              setEditingTemplate(null);
              queryClient.invalidateQueries({ queryKey: ["agreementTemplates"] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-sm bg-slate-50 p-4 rounded-lg">
                  {previewTemplate.template_body}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Merge Fields:</h4>
                <div className="flex flex-wrap gap-2">
                  {previewTemplate.merge_fields?.map((field, i) => (
                    <Badge key={i} variant="outline">
                      {field}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}