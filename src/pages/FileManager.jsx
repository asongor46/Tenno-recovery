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
  Upload, // ADDED: For upload button
  X, // ADDED: For tag removal
  Tag, // ADDED: For tag icon
  CheckSquare, // ADDED: For bulk selection
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
// ADDED: Import dialog and checkbox for upload and bulk actions
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// MODIFIED: Expanded category labels to match entity enum
const categoryLabels = {
  agreement: "Agreement",
  claim_form: "Claim Form",
  id_front: "ID (Front)",
  id_back: "ID (Back)",
  notary_page: "Notary Page",
  supporting: "Supporting Doc",
  final_packet: "Final Packet",
  surplus_list: "Surplus List",
  instruction: "Instructions",
  deed: "Deed",
  tax_bill: "Tax Bill",
  notice: "Notice",
  correspondence: "Correspondence",
  court_filing: "Court Filing",
  sheriff_deed: "Sheriff Deed",
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
  // ADDED: State for upload dialog
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadData, setUploadData] = useState({
    case_id: "",
    name: "",
    category: "other",
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  // ADDED: State for tag filter
  const [selectedTags, setSelectedTags] = useState([]);
  // ADDED: State for bulk selection
  const [selectedDocs, setSelectedDocs] = useState([]);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["all-documents"],
    queryFn: () => base44.entities.Document.list("-created_date", 500),
  });

  const { data: cases = [] } = useQuery({
    queryKey: ["cases-for-files"],
    queryFn: () => base44.entities.Case.list(),
  });

  // ADDED: Collect all unique tags across documents
  const allTags = [...new Set(documents.flatMap(doc => doc.tags || []))].sort();

  const getCaseName = (caseId) => {
    const c = cases.find(c => c.id === caseId);
    return c?.owner_name || "Unknown";
  };

  // MODIFIED: Enhanced filtering to include tags
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCaseName(doc.case_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    const matchesTags = selectedTags.length === 0 || 
      (doc.tags || []).some(tag => selectedTags.includes(tag));
    return matchesSearch && matchesCategory && matchesTags;
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

  // ADDED: Upload handler
  const handleUpload = async () => {
    if (!uploadFile || !uploadData.case_id) {
      alert("Please select a file and case");
      return;
    }

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadFile });
      
      await base44.entities.Document.create({
        ...uploadData,
        file_url,
        file_type: uploadFile.type,
        file_size: uploadFile.size,
        uploaded_by: (await base44.auth.me()).email,
      });

      queryClient.invalidateQueries({ queryKey: ["all-documents"] });
      setShowUploadDialog(false);
      setUploadFile(null);
      setUploadData({ case_id: "", name: "", category: "other", tags: [] });
      setTagInput("");
      alert("Document uploaded successfully");
    } catch (error) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // ADDED: Tag management
  const addTag = () => {
    if (tagInput.trim() && !uploadData.tags.includes(tagInput.trim())) {
      setUploadData({ ...uploadData, tags: [...uploadData.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove) => {
    setUploadData({ ...uploadData, tags: uploadData.tags.filter(t => t !== tagToRemove) });
  };

  // ADDED: Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedDocs.length === filteredDocuments.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(filteredDocuments.map(d => d.id));
    }
  };

  const toggleSelectDoc = (id) => {
    setSelectedDocs(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // ADDED: Bulk delete handler
  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedDocs.length} document(s)?`)) return;
    
    try {
      await Promise.all(selectedDocs.map(id => base44.entities.Document.delete(id)));
      queryClient.invalidateQueries({ queryKey: ["all-documents"] });
      setSelectedDocs([]);
      alert("Documents deleted successfully");
    } catch (error) {
      alert(`Delete failed: ${error.message}`);
    }
  };

  const queryClient = useQueryClient();

  return (
    <div className="space-y-6">
      {/* Header - MODIFIED: Added upload button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">File Manager</h1>
            <p className="text-slate-500">Browse all uploaded files across cases</p>
          </div>
        </div>
        {/* ADDED: Upload button */}
        <Button onClick={() => setShowUploadDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Filters - MODIFIED: Added tag filter section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search files, cases, or tags..."
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

          {/* ADDED: Tag filter pills */}
          {allTags.length > 0 && (
            <div>
              <Label className="text-xs text-slate-600 mb-2 flex items-center gap-1">
                <Tag className="w-3 h-3" /> FILTER BY TAGS
              </Label>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-slate-100"
                    onClick={() => {
                      setSelectedTags(prev =>
                        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                      );
                    }}
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
                {selectedTags.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTags([])}
                    className="h-6 text-xs"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ADDED: Bulk actions bar */}
          {selectedDocs.length > 0 && (
            <div className="flex items-center gap-3 mt-4 pt-4 border-t">
              <CheckSquare className="w-4 h-4 text-slate-600" />
              <span className="text-sm text-slate-600">{selectedDocs.length} selected</span>
              <Button variant="outline" size="sm" className="text-red-600" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete Selected
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedDocs([])}>
                Clear Selection
              </Button>
            </div>
          )}
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
                  {/* ADDED: Checkbox column for bulk selection */}
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedDocs.length === filteredDocuments.length && filteredDocuments.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Category</TableHead>
                  {/* ADDED: Tags column */}
                  <TableHead>Tags</TableHead>
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
                      {/* ADDED: Checkbox cell */}
                      <TableCell>
                        <Checkbox
                          checked={selectedDocs.includes(doc.id)}
                          onCheckedChange={() => toggleSelectDoc(doc.id)}
                        />
                      </TableCell>
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
                      {/* ADDED: Tags cell */}
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(doc.tags || []).length > 0 ? (
                            doc.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                <Tag className="w-2 h-2 mr-1" />
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </div>
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
                  {/* ADDED: Tags display in grid view */}
                  {(doc.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 justify-center">
                      {doc.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {doc.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{doc.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ADDED: Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* File input */}
            <div>
              <Label>Select File *</Label>
              <Input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadFile(file);
                    if (!uploadData.name) {
                      setUploadData({ ...uploadData, name: file.name });
                    }
                  }
                }}
                className="mt-2"
              />
              {uploadFile && (
                <p className="text-sm text-slate-500 mt-1">
                  {uploadFile.name} ({formatFileSize(uploadFile.size)})
                </p>
              )}
            </div>

            {/* Case selection */}
            <div>
              <Label>Associated Case *</Label>
              <Select value={uploadData.case_id} onValueChange={(value) => setUploadData({ ...uploadData, case_id: value })}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a case..." />
                </SelectTrigger>
                <SelectContent>
                  {cases.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.owner_name} - {c.case_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Document name */}
            <div>
              <Label>Document Name *</Label>
              <Input
                value={uploadData.name}
                onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                placeholder="Enter document name..."
                className="mt-2"
              />
            </div>

            {/* Category */}
            <div>
              <Label>Category *</Label>
              <Select value={uploadData.category} onValueChange={(value) => setUploadData({ ...uploadData, category: value })}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div>
              <Label>Tags (optional)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="Type tag and press Enter..."
                />
                <Button type="button" onClick={addTag} variant="outline">
                  Add
                </Button>
              </div>
              {uploadData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {uploadData.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-red-600"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)} disabled={isUploading}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={isUploading || !uploadFile || !uploadData.case_id} className="bg-indigo-600 hover:bg-indigo-700">
                {isUploading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                    />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}