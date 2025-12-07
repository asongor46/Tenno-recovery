import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Phone,
  MessageSquare,
  Mail,
  MessageCircle,
  FileCode,
  FileText,
  Edit2,
  Trash2,
  Copy,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import TemplateForm from "@/components/templates/TemplateForm";

const categoryConfig = {
  phone_script: { label: "Phone Scripts", icon: Phone, color: "bg-blue-500" },
  sms: { label: "SMS", icon: MessageSquare, color: "bg-green-500" },
  email: { label: "Emails", icon: Mail, color: "bg-purple-500" },
  voicemail: { label: "Voicemail", icon: Phone, color: "bg-indigo-500" },
  rebuttal: { label: "Rebuttals", icon: MessageCircle, color: "bg-orange-500" },
  document: { label: "Documents", icon: FileCode, color: "bg-slate-500" },
  agreement: { label: "Agreement", icon: FileText, color: "bg-emerald-500" },
  notary_instructions: { label: "Notary Instructions", icon: FileText, color: "bg-amber-500" },
  cover_letter: { label: "Cover Letters", icon: Mail, color: "bg-rose-500" },
};

export default function Templates() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialCategory = urlParams.get("category") || "phone_script";

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: () => base44.entities.Template.list("name", 500),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Template.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const mergeTags = [
    "{OWNER_NAME}",
    "{CASE_NUMBER}",
    "{SURPLUS}",
    "{COUNTY}",
    "{PROPERTY_ADDRESS}",
    "{SALE_DATE}",
    "{PORTAL_LINK}",
    "{REP_NAME}",
    "{COMPANY_NAME}",
    "{PHONE}",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Templates</h1>
            <p className="text-slate-500">Manage your scripts and templates</p>
          </div>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
            </DialogHeader>
            <TemplateForm 
              category={activeCategory}
              mergeTags={mergeTags}
              onSuccess={() => {
                setShowNewDialog(false);
                queryClient.invalidateQueries({ queryKey: ["templates"] });
              }} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Categories */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="bg-white border flex-wrap h-auto p-1">
          {Object.entries(categoryConfig).map(([key, config]) => {
            const Icon = config.icon;
            const count = templates.filter(t => t.category === key).length;
            return (
              <TabsTrigger 
                key={key} 
                value={key}
                className="gap-2 data-[state=active]:bg-slate-100"
              >
                <Icon className="w-4 h-4" />
                {config.label}
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Search */}
        <div className="mt-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Content */}
        <TabsContent value={activeCategory} className="mt-6">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500">No templates in this category</p>
              <Button 
                className="mt-4"
                onClick={() => setShowNewDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" /> Create First Template
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => {
                const config = categoryConfig[template.category];
                const Icon = config?.icon || FileText;

                return (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="group hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 ${config?.color} rounded-lg flex items-center justify-center`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{template.name}</CardTitle>
                              {template.subject && (
                                <CardDescription className="text-xs">
                                  Subject: {template.subject}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingTemplate(template)}>
                                <Edit2 className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => copyToClipboard(template.body)}>
                                <Copy className="w-4 h-4 mr-2" /> Copy Content
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => {
                                  if (window.confirm("Delete this template?")) {
                                    deleteMutation.mutate(template.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-slate-600 line-clamp-4 whitespace-pre-line">
                          {template.body}
                        </p>
                        {!template.is_active && (
                          <Badge variant="secondary" className="mt-3 text-xs">
                            Inactive
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <TemplateForm 
              template={editingTemplate}
              category={editingTemplate.category}
              mergeTags={mergeTags}
              onSuccess={() => {
                setEditingTemplate(null);
                queryClient.invalidateQueries({ queryKey: ["templates"] });
              }} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}