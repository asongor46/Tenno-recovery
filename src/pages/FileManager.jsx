import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  FolderOpen,
  Search,
  FileText,
  Image,
  File,
  Download,
  Eye,
  Trash2,
  Grid,
  List,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const categoryLabels = {
  agreement: "Agreement",
  claim_form: "Claim Form",
  id_front: "ID (Front)",
  id_back: "ID (Back)",
  notary_page: "Notary Page",
  supporting: "Supporting Doc",
  final_packet: "Final Packet",
  other: "Other",
};

const categoryColors = {
  agreement: "bg-blue-100 text-blue-700",
  claim_form: "bg-purple-100 text-purple-700",
  id_front: "bg-amber-100 text-amber-700",
  id_back: "bg-amber-100 text-amber-700",
  notary_page: "bg-emerald-100 text-emerald-700",
  supporting: "bg-slate-100 text-slate-700",
  final_packet: "bg-green-100 text-green-700",
  other: "bg-slate-100 text-slate-700",
};

export default function FileManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState("list");

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["all-documents"],
    queryFn: () => base44.entities.Document.list("-created_date", 500),
  });

  const { data: cases = [] } = useQuery({
    queryKey: ["cases-for-files"],
    queryFn: () => base44.entities.Case.list(),
  });

  const getCaseName = (caseId) => {
    const c = cases.find(c => c.id === caseId);
    return c?.owner_name || "Unknown";
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCaseName(doc.case_id).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith("image/")) return Image;
    return FileText;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
          <FolderOpen className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">File Manager</h1>
          <p className="text-slate-500">Browse all uploaded files across cases</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search files or cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total Files</p>
            <p className="text-2xl font-bold text-slate-900">{documents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Agreements</p>
            <p className="text-2xl font-bold text-slate-900">
              {documents.filter(d => d.category === "agreement").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Notary Pages</p>
            <p className="text-2xl font-bold text-slate-900">
              {documents.filter(d => d.category === "notary_page").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Final Packets</p>
            <p className="text-2xl font-bold text-slate-900">
              {documents.filter(d => d.category === "final_packet").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* File List/Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading files...</div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500">No files found</p>
        </div>
      ) : viewMode === "list" ? (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => {
                  const FileIcon = getFileIcon(doc.file_type);
                  return (
                    <TableRow key={doc.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                            <FileIcon className="w-5 h-5 text-slate-500" />
                          </div>
                          <span className="font-medium">{doc.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {getCaseName(doc.case_id)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${categoryColors[doc.category]} border-0`}>
                          {categoryLabels[doc.category] || doc.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {formatFileSize(doc.file_size)}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {doc.created_date ? format(new Date(doc.created_date), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {doc.file_url && (
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </a>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredDocuments.map((doc) => {
            const FileIcon = getFileIcon(doc.file_type);
            return (
              <Card key={doc.id} className="group cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="pt-6 text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <FileIcon className="w-6 h-6 text-slate-500" />
                  </div>
                  <p className="font-medium text-sm truncate">{doc.name}</p>
                  <p className="text-xs text-slate-500 truncate mt-1">
                    {getCaseName(doc.case_id)}
                  </p>
                  <Badge className={`${categoryColors[doc.category]} border-0 mt-2 text-xs`}>
                    {categoryLabels[doc.category] || doc.category}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}