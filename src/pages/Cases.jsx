import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Archive,
  Flame,
  Download,
  MoreHorizontal,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileUp, // ADDED for PDF import
  Globe, // ADDED for URL import
  Edit3, // ADDED for manual entry
  ChevronDown, // ADDED for dropdown
  FileText, // ADDED for text import
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { format } from "date-fns";
import NewCaseForm from "@/components/cases/NewCaseForm";
import PDFCaseBuilder from "@/components/cases/PDFCaseBuilder"; // ADDED
import URLCaseBuilder from "@/components/cases/URLCaseBuilder"; // ADDED
import ScreenshotCaseBuilder from "@/components/cases/ScreenshotCaseBuilder"; // ADDED
import TextCaseBuilder from "@/components/cases/TextCaseBuilder"; // ADDED
import AdvancedCaseBuilder from "@/components/cases/AdvancedCaseBuilder"; // ADDED: Universal County Mapping

// PHASE 4+ ENHANCEMENTS: Dashboard components
import CasesKPICards from "@/components/dashboard/CasesKPICards";
import TodayTasksPanel from "@/components/dashboard/TodayTasksPanel";
import CasePipelineKanban from "@/components/dashboard/CasePipelineKanban";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const stageColors = {
  imported: "bg-slate-100 text-slate-700",
  agreement_signed: "bg-blue-100 text-blue-700",
  info_completed: "bg-indigo-100 text-indigo-700",
  notary_completed: "bg-purple-100 text-purple-700",
  packet_ready: "bg-amber-100 text-amber-700",
  filed: "bg-emerald-100 text-emerald-700",
  approved: "bg-green-100 text-green-700",
  paid: "bg-teal-100 text-teal-700",
  closed: "bg-slate-200 text-slate-600",
};

const stageLabels = {
  imported: "Imported",
  agreement_signed: "Agreement Signed",
  info_completed: "Info Completed",
  notary_completed: "Notary Done",
  packet_ready: "Packet Ready",
  filed: "Filed",
  approved: "Approved",
  paid: "Paid",
  closed: "Closed",
};

const statusColors = {
  active: "bg-emerald-500",
  pending: "bg-amber-500",
  filed: "bg-blue-500",
  approved: "bg-green-500",
  paid: "bg-teal-500",
  closed: "bg-slate-400",
  archived: "bg-slate-300",
};

export default function Cases() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [selectedCases, setSelectedCases] = useState([]);
  const [showNewCaseDialog, setShowNewCaseDialog] = useState(false);
  const [importMethod, setImportMethod] = useState(null); // ADDED: "manual" | "pdf" | "url"
  const [page, setPage] = useState(1);
  const pageSize = 20;
  
  // PHASE 4+ ENHANCEMENT: View mode toggle
  const [viewMode, setViewMode] = useState("table"); // "pipeline" | "table"

  const queryClient = useQueryClient();

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["cases"],
    queryFn: () => base44.entities.Case.list("-updated_date", 500),
  });

  const { data: counties = [] } = useQuery({
    queryKey: ["counties"],
    queryFn: () => base44.entities.County.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map(id => base44.entities.Case.delete(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      setSelectedCases([]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ ids, data }) => Promise.all(ids.map(id => base44.entities.Case.update(id, data))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      setSelectedCases([]);
    },
  });

  // Filter cases
  const filteredCases = cases.filter(c => {
    const matchesSearch = 
      c.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.case_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.county?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesStage = stageFilter === "all" || c.stage === stageFilter;

    return matchesSearch && matchesStatus && matchesStage;
  });

  // Pagination
  const totalPages = Math.ceil(filteredCases.length / pageSize);
  const paginatedCases = filteredCases.slice((page - 1) * pageSize, page * pageSize);

  const toggleSelectAll = () => {
    if (selectedCases.length === paginatedCases.length) {
      setSelectedCases([]);
    } else {
      setSelectedCases(paginatedCases.map(c => c.id));
    }
  };

  const toggleSelectCase = (id) => {
    setSelectedCases(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selectedCases.length} cases?`)) {
      deleteMutation.mutate(selectedCases);
    }
  };

  const handleBulkArchive = () => {
    updateMutation.mutate({ ids: selectedCases, data: { status: "archived" } });
  };

  const handleMarkHot = () => {
    updateMutation.mutate({ ids: selectedCases, data: { is_hot: true } });
  };

  return (
    <div className="space-y-6">
      {/* PHASE 4+ ENHANCEMENT: KPI Cards - Dashboard Overview */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <CasesKPICards cases={cases} />
      </motion.div>

      {/* PHASE 4+ ENHANCEMENT: Today's Tasks & Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <TodayTasksPanel />
      </motion.div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Cases</h1>
          <p className="text-slate-500 mt-1">{filteredCases.length} total cases</p>
        </div>
        
        {/* MODIFIED: New Case Dropdown with 6 methods - COMPLETE INGESTION ENGINE */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              New Case
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem onClick={() => {
              setImportMethod("manual");
              setShowNewCaseDialog(true);
            }}>
              <Edit3 className="w-4 h-4 mr-2" />
              Manual Entry
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setImportMethod("pdf");
              setShowNewCaseDialog(true);
            }}>
              <FileUp className="w-4 h-4 mr-2" />
              Upload PDF (Auto Extract)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setImportMethod("screenshot");
              setShowNewCaseDialog(true);
            }}>
              <FileUp className="w-4 h-4 mr-2 text-purple-600" />
              Upload Screenshot (OCR)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setImportMethod("text");
              setShowNewCaseDialog(true);
            }}>
              <FileText className="w-4 h-4 mr-2 text-blue-600" />
              Paste Text (Parse)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setImportMethod("url");
              setShowNewCaseDialog(true);
            }}>
              <Globe className="w-4 h-4 mr-2" />
              Import From URL (Web Crawler)
            </DropdownMenuItem>
            {/* ADDED: Advanced Import option */}
            <DropdownMenuItem 
              onClick={() => {
                setImportMethod("advanced");
                setShowNewCaseDialog(true);
              }}
              className="border-t mt-1 pt-2"
            >
              <ChevronDown className="w-4 h-4 mr-2 text-purple-600" />
              <div>
                <div className="font-medium">Advanced Import</div>
                <div className="text-xs text-slate-500">Universal County Mapping</div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* MODIFIED: Dialog for all 6 import methods - COMPLETE INGESTION ENGINE */}
        <Dialog open={showNewCaseDialog} onOpenChange={(open) => {
          setShowNewCaseDialog(open);
          if (!open) setImportMethod(null);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {importMethod === "manual" && "Create New Case - Manual Entry"}
                {importMethod === "pdf" && "Create Cases - Upload PDF"}
                {importMethod === "screenshot" && "Create Cases - Upload Screenshot (OCR)"}
                {importMethod === "text" && "Create Cases - Paste Text"}
                {importMethod === "url" && "Create Cases - Import From URL"}
                {importMethod === "advanced" && "Advanced Import - Universal County Mapping"}
              </DialogTitle>
            </DialogHeader>

            {importMethod === "manual" && (
              <NewCaseForm 
                counties={counties} 
                onSuccess={() => {
                  setShowNewCaseDialog(false);
                  setImportMethod(null);
                  queryClient.invalidateQueries({ queryKey: ["cases"] });
                }} 
              />
            )}

            {importMethod === "pdf" && (
              <PDFCaseBuilder
                onSuccess={() => {
                  setShowNewCaseDialog(false);
                  setImportMethod(null);
                  queryClient.invalidateQueries({ queryKey: ["cases"] });
                }}
                onCancel={() => {
                  setShowNewCaseDialog(false);
                  setImportMethod(null);
                }}
              />
            )}

            {importMethod === "screenshot" && (
              <ScreenshotCaseBuilder
                onSuccess={() => {
                  setShowNewCaseDialog(false);
                  setImportMethod(null);
                  queryClient.invalidateQueries({ queryKey: ["cases"] });
                }}
                onCancel={() => {
                  setShowNewCaseDialog(false);
                  setImportMethod(null);
                }}
              />
            )}

            {importMethod === "text" && (
              <TextCaseBuilder
                onSuccess={() => {
                  setShowNewCaseDialog(false);
                  setImportMethod(null);
                  queryClient.invalidateQueries({ queryKey: ["cases"] });
                }}
                onCancel={() => {
                  setShowNewCaseDialog(false);
                  setImportMethod(null);
                }}
              />
            )}

            {importMethod === "url" && (
              <URLCaseBuilder
                onSuccess={() => {
                  setShowNewCaseDialog(false);
                  setImportMethod(null);
                  queryClient.invalidateQueries({ queryKey: ["cases"] });
                }}
                onCancel={() => {
                  setShowNewCaseDialog(false);
                  setImportMethod(null);
                }}
              />
            )}

            {importMethod === "advanced" && (
              <AdvancedCaseBuilder
                onSuccess={() => {
                  setShowNewCaseDialog(false);
                  setImportMethod(null);
                  queryClient.invalidateQueries({ queryKey: ["cases"] });
                }}
                onCancel={() => {
                  setShowNewCaseDialog(false);
                  setImportMethod(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-100 p-4"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by owner, case #, county..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="filed">Filed</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {Object.entries(stageLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* ADDED: Additional filter for county (optional enhancement) */}
        </div>

        {/* Bulk Actions */}
        {selectedCases.length > 0 && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t">
            <span className="text-sm text-slate-600">{selectedCases.length} selected</span>
            <Button variant="outline" size="sm" onClick={handleMarkHot}>
              <Flame className="w-4 h-4 mr-1" /> Mark Hot
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkArchive}>
              <Archive className="w-4 h-4 mr-1" /> Archive
            </Button>
            <Button variant="outline" size="sm" className="text-red-600" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </div>
        )}
      </motion.div>

      {/* PHASE 4+ ENHANCEMENT: View Mode Tabs - Pipeline vs Table */}
      <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pipeline">Pipeline View</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>

        {/* Pipeline/Kanban View */}
        <TabsContent value="pipeline" className="mt-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-slate-100 p-6"
          >
            <CasePipelineKanban cases={filteredCases} />
          </motion.div>
        </TabsContent>

        {/* Table View (existing) */}
        <TabsContent value="table" className="mt-6">
          {/* Table */}
          <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="w-12">
                  <Checkbox 
                    checked={selectedCases.length === paginatedCases.length && paginatedCases.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="font-semibold">Owner</TableHead>
                <TableHead className="font-semibold">Case #</TableHead>
                <TableHead className="font-semibold">County</TableHead>
                <TableHead className="font-semibold">Property Address</TableHead>{/* ADDED */}
                <TableHead className="font-semibold text-right">Surplus</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Stage</TableHead>
                <TableHead className="font-semibold">Verified</TableHead>
                <TableHead className="font-semibold">Updated</TableHead>
                <TableHead className="font-semibold w-10"></TableHead>
                <TableHead className="font-semibold w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-slate-500">{/* MODIFIED: colspan */}
                    Loading cases...
                  </TableCell>
                </TableRow>
              ) : paginatedCases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-slate-500">{/* MODIFIED: colspan */}
                    No cases found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCases.map((caseItem) => (
                  <TableRow key={caseItem.id} className="group hover:bg-slate-50/50">
                    <TableCell>
                      <Checkbox 
                        checked={selectedCases.includes(caseItem.id)}
                        onCheckedChange={() => toggleSelectCase(caseItem.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-slate-600">
                            {caseItem.owner_name?.charAt(0) || "?"}
                          </span>
                        </div>
                        <span className="font-medium text-slate-900">{caseItem.owner_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-slate-600">
                      {caseItem.case_number}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {caseItem.county}{caseItem.state ? `, ${caseItem.state}` : ""}
                    </TableCell>
                    {/* ADDED: Property Address column */}
                    <TableCell className="text-slate-600 text-sm max-w-xs truncate">
                      {caseItem.property_address || "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900">
                      ${caseItem.surplus_amount?.toLocaleString() || "0"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${statusColors[caseItem.status]}`} />
                        <span className="capitalize text-slate-600">{caseItem.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${stageColors[caseItem.stage]} border-0 font-medium`}>
                        {stageLabels[caseItem.stage]}
                      </Badge>
                    </TableCell>
                    {/* MODIFIED: Verification status with better visibility */}
                    <TableCell>
                      {caseItem.verification_status && caseItem.verification_status !== "pending" ? (
                        <Badge 
                          variant="outline" 
                          className={`text-xs border-0 ${
                            caseItem.verification_status === "green" ? "bg-emerald-100 text-emerald-700" :
                            caseItem.verification_status === "yellow" ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          }`}
                        >
                          {caseItem.verification_status === "green" ? "✓" :
                           caseItem.verification_status === "yellow" ? "⚠" : "✗"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-slate-100 text-slate-500 border-0">
                          —
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {caseItem.updated_date
                        ? format(new Date(caseItem.updated_date), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {caseItem.is_hot && <Flame className="w-5 h-5 text-orange-500" />}
                        {caseItem.risk_flags?.length > 0 && (
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                            {caseItem.risk_flags.length} flags
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link to={createPageUrl(`CaseDetail?id=${caseItem.id}`)}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="w-4 h-4 text-slate-600" />
                          </Button>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4 text-slate-600" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={createPageUrl(`CaseDetail?id=${caseItem.id}`)}>
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>Send Portal Link</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => {
                                if (window.confirm("Delete this case?")) {
                                  deleteMutation.mutate([caseItem.id]);
                                }
                              }}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <p className="text-sm text-slate-500">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredCases.length)} of {filteredCases.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}