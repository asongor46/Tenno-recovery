import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import {
  Flame,
  Search,
  Eye,
  MoreHorizontal,
  TrendingUp,
  DollarSign,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

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

export default function HotCases() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["hotCases"],
    queryFn: async () => {
      const allCases = await base44.entities.Case.list("-surplus_amount", 500);
      return allCases.filter(c => c.surplus_amount >= 30000 || c.is_hot);
    },
  });

  const filteredCases = cases.filter(c =>
    c.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.case_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.county?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSurplus = filteredCases.reduce((sum, c) => sum + (c.surplus_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Hot Cases</h1>
            <p className="text-slate-500">Cases with surplus ≥ $30,000</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white"
        >
          <div className="flex items-center gap-3 mb-2">
            <Flame className="w-5 h-5" />
            <span className="font-medium">Hot Cases</span>
          </div>
          <p className="text-4xl font-bold">{filteredCases.length}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white"
        >
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="font-medium">Total Surplus</span>
          </div>
          <p className="text-4xl font-bold">${totalSurplus.toLocaleString()}</p>
        </motion.div>
      </div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-slate-100 p-4"
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search hot cases..."
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
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold">Priority</TableHead>
                <TableHead className="font-semibold">Owner</TableHead>
                <TableHead className="font-semibold">Case #</TableHead>
                <TableHead className="font-semibold">County</TableHead>
                <TableHead className="font-semibold text-right">Surplus</TableHead>
                <TableHead className="font-semibold">Stage</TableHead>
                <TableHead className="font-semibold">Updated</TableHead>
                <TableHead className="font-semibold w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Loading hot cases...
                  </TableCell>
                </TableRow>
              ) : filteredCases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    No hot cases found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCases.map((caseItem, index) => (
                  <TableRow key={caseItem.id} className="group hover:bg-orange-50/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white ${
                          index < 3 ? "bg-orange-500" : "bg-slate-400"
                        }`}>
                          {index + 1}
                        </div>
                        {caseItem.surplus_amount >= 50000 && (
                          <TrendingUp className="w-4 h-4 text-orange-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-orange-600">
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
                    <TableCell className="text-right">
                      <span className="font-bold text-lg text-orange-600">
                        ${caseItem.surplus_amount?.toLocaleString() || "0"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${stageColors[caseItem.stage]} border-0 font-medium`}>
                        {stageLabels[caseItem.stage]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {caseItem.updated_date
                        ? format(new Date(caseItem.updated_date), "MMM d")
                        : "—"}
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
                            <DropdownMenuItem>Prioritize</DropdownMenuItem>
                            <DropdownMenuItem>Send Portal Link</DropdownMenuItem>
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
    </div>
  );
}