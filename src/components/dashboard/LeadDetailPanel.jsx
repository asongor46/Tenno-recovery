import React from "react";
import { X, MapPin, DollarSign, Calendar, AlertTriangle, Flag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

function freshnessInfo(uploadedAt) {
  if (!uploadedAt) return { label: "Unknown", color: "text-slate-400", dot: "bg-slate-500" };
  const days = Math.floor((new Date() - new Date(uploadedAt)) / (1000 * 60 * 60 * 24));
  if (days < 30) return { label: `${days}d ago`, color: "text-emerald-400", dot: "bg-emerald-400" };
  if (days < 90) return { label: `${days}d ago`, color: "text-yellow-400", dot: "bg-yellow-400" };
  return { label: `${days}d ago`, color: "text-red-400", dot: "bg-red-400" };
}

export default function LeadDetailPanel({ lead, onClose, onAdd, onFlag, alreadyFlagged, isPro }) {
  if (!lead) return null;
  const fresh = freshnessInfo(lead.uploaded_at);
  const isClaimed = lead.fund_status === "claimed" || lead.claim_flags >= 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">{lead.owner_name}</h3>
            <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" /> {lead.property_address}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Surplus */}
        <div className="bg-slate-900/60 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Surplus Amount</p>
            <p className="text-3xl font-bold text-emerald-400">${lead.surplus_amount?.toLocaleString()}</p>
            {(!lead.surplus_amount || lead.surplus_amount === 0) ? (
              <Badge className="mt-1 bg-slate-600 text-slate-300 border-0 text-xs">Verify amount</Badge>
            ) : lead.surplus_amount < 500 ? (
              <Badge className="mt-1 bg-red-500/20 text-red-400 border-0 text-xs">Very low value</Badge>
            ) : lead.surplus_amount < 1000 ? (
              <Badge className="mt-1 bg-amber-500/20 text-amber-400 border-0 text-xs">Low value</Badge>
            ) : null}
          </div>
          <Badge className={lead.surplus_type === "tax_sale" ? "bg-emerald-500/20 text-emerald-400 border-0" : "bg-blue-500/20 text-blue-400 border-0"}>
            {lead.surplus_type === "tax_sale" ? "Tax Sale" : "Sheriff Sale"}
          </Badge>
        </div>
        {lead.surplus_amount > 0 && lead.surplus_amount < 1000 && (
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            At 20% fee, this lead would earn ~${Math.round(lead.surplus_amount * 0.2).toLocaleString()}. Consider prioritizing higher-value cases.
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-500 text-xs">County / State</p>
            <p className="text-white">{lead.county}, {lead.state}</p>
          </div>
          {lead.sale_amount && (
            <div>
              <p className="text-slate-500 text-xs">Sale Amount</p>
              <p className="text-white">${lead.sale_amount?.toLocaleString()}</p>
            </div>
          )}
          {lead.sale_date && (
            <div>
              <p className="text-slate-500 text-xs">Sale Date</p>
              <p className="text-white">{lead.sale_date}</p>
            </div>
          )}
          {lead.case_number && (
            <div>
              <p className="text-slate-500 text-xs">Case #</p>
              <p className="text-white font-mono">{lead.case_number}</p>
            </div>
          )}
          <div>
            <p className="text-slate-500 text-xs">Data Freshness</p>
            <p className={`flex items-center gap-1.5 ${fresh.color}`}>
              <span className={`w-2 h-2 rounded-full ${fresh.dot}`} />
              {fresh.label}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Source</p>
            <p className="text-slate-300">County surplus list</p>
          </div>
        </div>

        {/* Warning */}
        {isClaimed && (
          <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2 text-sm text-orange-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              May be claimed
              {isPro && lead.claim_flags >= 1 ? ` (${lead.claim_flags} flagged)` : ""}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={onAdd}>
            <Plus className="w-4 h-4 mr-1" /> Add to My Cases
          </Button>
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={onFlag}
            disabled={alreadyFlagged}
          >
            <Flag className="w-4 h-4 mr-1" />
            {alreadyFlagged ? "Flagged" : "Flag Claimed"}
          </Button>
        </div>
      </div>
    </div>
  );
}