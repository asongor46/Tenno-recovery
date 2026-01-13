import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Flame, Eye, MoreHorizontal, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default function CasesTable({ cases, isLoading, showTitle = true }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {showTitle && (
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Ongoing Cases</h2>
          </div>
        )}
        <div className="p-8">
          <LoadingState message="Loading cases..." />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
    >
      {showTitle && (
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Ongoing Cases</h2>
          <Link to={createPageUrl("Cases")}>
            <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700">
              View All <ArrowUpRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead className="font-semibold">Owner</TableHead>
              <TableHead className="font-semibold">Case #</TableHead>
              <TableHead className="font-semibold">County</TableHead>
              <TableHead className="font-semibold text-right">Surplus</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Stage</TableHead>
              <TableHead className="font-semibold">Updated</TableHead>
              <TableHead className="font-semibold w-10"></TableHead>
              <TableHead className="font-semibold w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                  No cases found
                </TableCell>
              </TableRow>
            ) : (
              cases?.map((caseItem, index) => (
                <TableRow key={caseItem.id} className="group hover:bg-slate-50/50 transition-colors">
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
                    {caseItem.county}, {caseItem.state}
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
                  <TableCell className="text-slate-500 text-sm">
                    {caseItem.updated_date
                      ? format(new Date(caseItem.updated_date), "MMM d, yyyy")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {caseItem.is_hot && (
                      <Flame className="w-5 h-5 text-orange-500" />
                    )}
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
                          <DropdownMenuItem>Edit Case</DropdownMenuItem>
                          <DropdownMenuItem>Send Portal Link</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
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
  );
}