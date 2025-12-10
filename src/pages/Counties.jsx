import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Building2,
  CheckCircle,
  XCircle,
  Eye,
  MoreHorizontal,
  Edit2,
  Trash2,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import CountyForm from "@/components/counties/CountyForm";
// ADDED: Import for uploading county packets
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const filingMethodColors = {
  mail: "bg-blue-100 text-blue-700",
  efile: "bg-purple-100 text-purple-700",
  in_person: "bg-amber-100 text-amber-700",
};

const notaryTypeLabels = {
  wet: "Wet Ink",
  ron: "RON Only",
  either: "Either",
};

export default function Counties() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewCountyDialog, setShowNewCountyDialog] = useState(false);
  const [editingCounty, setEditingCounty] = useState(null);

  const queryClient = useQueryClient();

  const { data: counties = [], isLoading } = useQuery({
    queryKey: ["counties"],
    queryFn: () => base44.entities.County.list("name", 500),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.County.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["counties"] }),
  });

  const filteredCounties = counties.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.state?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">County Directory</h1>
            <p className="text-slate-500">{filteredCounties.length} counties</p>
          </div>
        </div>
        <Dialog open={showNewCountyDialog} onOpenChange={setShowNewCountyDialog}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Add County
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New County</DialogTitle>
            </DialogHeader>
            <CountyForm 
              onSuccess={() => {
                setShowNewCountyDialog(false);
                queryClient.invalidateQueries({ queryKey: ["counties"] });
              }} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-100 p-4"
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search counties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

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
                <TableHead className="font-semibold">County</TableHead>
                <TableHead className="font-semibold">State</TableHead>
                <TableHead className="font-semibold text-center">Rep Allowed</TableHead>
                <TableHead className="font-semibold text-center">Assignment</TableHead>
                <TableHead className="font-semibold text-center">Notary Required</TableHead>
                <TableHead className="font-semibold">Notary Type</TableHead>
                <TableHead className="font-semibold">Filing Method</TableHead>
                <TableHead className="font-semibold w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Loading counties...
                  </TableCell>
                </TableRow>
              ) : filteredCounties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    No counties found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCounties.map((county) => (
                  <TableRow key={county.id} className="group hover:bg-slate-50/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium text-slate-900">{county.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">{county.state}</TableCell>
                    <TableCell className="text-center">
                      {county.rep_allowed ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {county.assignment_required ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-slate-300 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {county.notary_required ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-slate-300 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {notaryTypeLabels[county.notary_type] || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${filingMethodColors[county.filing_method]} border-0 capitalize`}>
                        {county.filing_method?.replace(/_/g, " ") || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link to={createPageUrl(`CountyDetail?id=${county.id}`)}>
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
                              <Link to={createPageUrl(`CountyDetail?id=${county.id}`)}>
                                View Profile
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingCounty(county)}>
                              <Edit2 className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => {
                                if (window.confirm("Delete this county?")) {
                                  deleteMutation.mutate(county.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
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
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={!!editingCounty} onOpenChange={() => setEditingCounty(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit County</DialogTitle>
          </DialogHeader>
          {editingCounty && (
            <CountyForm 
              county={editingCounty}
              onSuccess={() => {
                setEditingCounty(null);
                queryClient.invalidateQueries({ queryKey: ["counties"] });
              }} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}