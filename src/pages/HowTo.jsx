import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  Plus,
  Search,
  BookOpen,
  GraduationCap,
  Users,
  MessageCircle,
  Shield,
  Building2,
  FileText,
  Edit2,
  Trash2,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import HowToForm from "@/components/howto/HowToForm";

const categoryConfig = {
  surplus_basics: { label: "Surplus Basics", icon: GraduationCap, color: "bg-blue-500" },
  contacting_homeowners: { label: "Contacting Homeowners", icon: Users, color: "bg-green-500" },
  handling_objections: { label: "Handling Objections", icon: MessageCircle, color: "bg-orange-500" },
  notary_guidance: { label: "Notary Guidance", icon: Shield, color: "bg-purple-500" },
  filing_by_county: { label: "Filing by County", icon: Building2, color: "bg-indigo-500" },
  full_case_example: { label: "Full Case Example", icon: FileText, color: "bg-emerald-500" },
};

export default function HowTo() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);

  const queryClient = useQueryClient();

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["howto"],
    queryFn: () => base44.entities.HowTo.filter({ is_published: true }, "order", 500),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HowTo.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["howto"] }),
  });

  const filteredArticles = articles.filter(a => {
    const matchesSearch = 
      a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || a.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedArticles = filteredArticles.reduce((acc, article) => {
    if (!acc[article.category]) acc[article.category] = [];
    acc[article.category].push(article);
    return acc;
  }, {});

  // Article Detail View
  if (selectedArticle) {
    const config = categoryConfig[selectedArticle.category];
    const Icon = config?.icon || BookOpen;

    return (
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-4"
          onClick={() => setSelectedArticle(null)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Articles
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 ${config?.color} rounded-lg flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <Badge variant="secondary">{config?.label}</Badge>
            </div>
            <CardTitle className="text-2xl">{selectedArticle.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-slate max-w-none">
              <ReactMarkdown>{selectedArticle.content}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">How-To Guide</h1>
            <p className="text-slate-500">Training resources and documentation</p>
          </div>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              New Article
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Article</DialogTitle>
            </DialogHeader>
            <HowToForm 
              onSuccess={() => {
                setShowNewDialog(false);
                queryClient.invalidateQueries({ queryKey: ["howto"] });
              }} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!selectedCategory ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {Object.entries(categoryConfig).map(([key, config]) => (
            <Button
              key={key}
              variant={selectedCategory === key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(key)}
            >
              {config.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading articles...</div>
      ) : Object.keys(groupedArticles).length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500">No articles found</p>
          <Button 
            className="mt-4"
            onClick={() => setShowNewDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> Create First Article
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedArticles).map(([category, categoryArticles]) => {
            const config = categoryConfig[category];
            const Icon = config?.icon || BookOpen;

            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 ${config?.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">{config?.label}</h2>
                  <Badge variant="secondary">{categoryArticles.length}</Badge>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryArticles.map((article) => (
                    <Card 
                      key={article.id}
                      className="group cursor-pointer hover:shadow-md transition-all"
                      onClick={() => setSelectedArticle(article)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base group-hover:text-emerald-600 transition-colors">
                            {article.title}
                          </CardTitle>
                          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="line-clamp-2">
                          {article.content?.substring(0, 150)}...
                        </CardDescription>
                        <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingArticle(article);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Delete this article?")) {
                                deleteMutation.mutate(article.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingArticle} onOpenChange={() => setEditingArticle(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Article</DialogTitle>
          </DialogHeader>
          {editingArticle && (
            <HowToForm 
              article={editingArticle}
              onSuccess={() => {
                setEditingArticle(null);
                queryClient.invalidateQueries({ queryKey: ["howto"] });
              }} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}