import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, Plus, AlertTriangle, MapPin, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import LeadFeedSidebar from "./LeadFeedSidebar";
import LeadDetailPanel from "./LeadDetailPanel";

function freshnessInfo(uploadedAt) {
  if (!uploadedAt) return { dot: "bg-slate-500", title: "Unknown" };
  const days = Math.floor((new Date() - new Date(uploadedAt)) / (1000 * 60 * 60 * 24));
  if (days < 30) return { dot: "bg-emerald-400", title: `Fresh (${days}d)` };
  if (days < 90) return { dot: "bg-yellow-400", title: `Aging (${days}d)` };
  return { dot: "bg-red-400", title: `Stale (${days}d)` };
}

export default function LeadFeed({ user, profile }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedState, setSelectedState] = useState("ALL");
  const [surplusType, setSurplusType] = useState("all");
  const [amountRange, setAmountRange] = useState("all");
  const [search, setSearch] = useState("");
  const [detailLead, setDetailLead] = useState(null);

  const isPro = profile?.plan === "pro" || user?.role === "admin";
  const agentStates = profile?.states_active || [];

  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list("-uploaded_at", 500),
  });

  const { data: myFlags = [] } = useQuery({
    queryKey: ["myLeadFlags", user?.email],
    queryFn: () => base44.entities.LeadFlag.filter({ agent_id: user?.id || user?.email }),
    enabled: !!user,
  });

  const { data: myCases = [] } = useQuery({
    queryKey: ["myCasesForLeads"],
    queryFn: () => base44.entities.Case.filter({ source_type: "lead_pool" }),
    enabled: !!user,
  });

  const addLeadMutation = useMutation({
    mutationFn: async (lead) => {
      // Determine fee: use state compliance cap vs agent default
      const feePercent = profile?.default_fee_percent || 20;

      const newCase = await base44.entities.Case.create({
        agent_id: profile?.id,
        owner_name: lead.owner_name,
        owner_email: lead.owner_email || "",
        owner_phone: lead.owner_phone || "",
        owner_address: lead.owner_address || "",
        property_address: lead.property_address,
        county: lead.county,
        state: lead.state,
        case_number: lead.case_number || `LEAD-${lead.id.slice(-6).toUpperCase()}`,
        parcel_number: lead.parcel_number || "",
        surplus_type: lead.surplus_type,
        surplus_amount: lead.surplus_amount,
        sale_amount: lead.sale_amount,
        sale_date: lead.sale_date,
        judgment_amount: lead.judgment_amount,
        fee_percent: feePercent,
        source_type: "lead_pool",
        source_lead_id: lead.id,
        stage: "imported",
      });

      // Increment times_imported
      await base44.entities.Lead.update(lead.id, {
        times_imported: (lead.times_imported || 0) + 1,
      });

      qc.invalidateQueries({ queryKey: ["myCasesForLeads"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["cases"] });

      return newCase;
    },
    onSuccess: (newCase, lead) => {
      toast({
        title: "Lead added to your cases",
        description: (
          <span>
            <a
              href={`/CaseDetail?id=${newCase.id}`}
              className="text-emerald-400 underline"
            >
              View case →
            </a>
          </span>
        ),
      });
      setDetailLead(null);
    },
  });

  const flagMutation = useMutation({
    mutationFn: async (lead) => {
      const flag = await base44.entities.LeadFlag.create({
        lead_id: lead.id,
        agent_id: user?.id || user?.email,
        flag_type: "claimed",
      });

      const newCount = (lead.claim_flags || 0) + 1;
      await base44.entities.Lead.update(lead.id, {
        claim_flags: newCount,
        ...(newCount >= 3 ? { fund_status: "claimed" } : {}),
      });

      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["myLeadFlags"] });
      return flag;
    },
    onSuccess: () => {
      toast({ title: "Flagged. Thanks for keeping the data clean." });
      setDetailLead(null);
    },
  });

  // Filter leads
  const filtered = leads.filter((lead) => {
    if (selectedState !== "ALL" && lead.state !== selectedState) return false;
    if (surplusType !== "all" && lead.surplus_type !== surplusType) return false;
    if (search && !lead.owner_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (amountRange !== "all") {
      const amt = lead.surplus_amount || 0;
      if (amountRange === "0-10k" && amt > 10000) return false;
      if (amountRange === "10-25k" && (amt < 10000 || amt > 25000)) return false;
      if (amountRange === "25-50k" && (amt < 25000 || amt > 50000)) return false;
      if (amountRange === "50k+" && amt < 50000) return false;
    }
    return true;
  });

  const handleAdd = async (lead) => {
    const existing = myCases.find((c) => c.source_lead_id === lead.id);
    if (existing) {
      const confirm = window.confirm(
        `You already imported this lead. Import again?`
      );
      if (!confirm) return;
    }
    addLeadMutation.mutate(lead);
  };

  const isAlreadyFlagged = (lead) =>
    myFlags.some((f) => f.lead_id === lead.id);

  const detailLeadFull = detailLead ? leads.find((l) => l.id === detailLead) : null;

  return (
    <div className="bg-slate-800/30 border border-slate-700 rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: 480 }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Find Leads</h2>
          <p className="text-xs text-slate-400">{leads.length} available leads</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* State Sidebar */}
        <LeadFeedSidebar
          leads={leads}
          selectedState={selectedState}
          onSelectState={setSelectedState}
          agentStates={agentStates}
        />

        {/* Main Table Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Filters */}
          <div className="flex items-center gap-2 p-3 border-b border-slate-700 flex-wrap">
            <div className="relative flex-1 min-w-36">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Search owner..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-700 border-slate-600"
              />
            </div>
            <Select value={surplusType} onValueChange={setSurplusType}>
              <SelectTrigger className="h-8 text-xs w-32 bg-slate-700 border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="tax_sale">Tax Sale</SelectItem>
                <SelectItem value="sheriff_sale">Sheriff Sale</SelectItem>
              </SelectContent>
            </Select>
            <Select value={amountRange} onValueChange={setAmountRange}>
              <SelectTrigger className="h-8 text-xs w-32 bg-slate-700 border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Amounts</SelectItem>
                <SelectItem value="0-10k">$0–10K</SelectItem>
                <SelectItem value="10-25k">$10–25K</SelectItem>
                <SelectItem value="25-50k">$25–50K</SelectItem>
                <SelectItem value="50k+">$50K+</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-slate-500 ml-auto">{filtered.length} leads</span>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <MapPin className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No leads match your filters</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-800 z-10">
                  <tr className="text-xs text-slate-400 border-b border-slate-700">
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-left px-3 py-2">Owner</th>
                    <th className="text-left px-3 py-2 hidden sm:table-cell">County</th>
                    <th className="text-right px-3 py-2">Surplus</th>
                    <th className="text-center px-3 py-2">Fresh</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => {
                    const isClaimed = lead.fund_status === "claimed" || lead.claim_flags >= 1;
                    const fresh = freshnessInfo(lead.uploaded_at);
                    return (
                      <tr
                        key={lead.id}
                        className={`border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors ${isClaimed ? "opacity-50" : ""}`}
                        onClick={() => setDetailLead(lead.id)}
                      >
                        <td className="px-3 py-2">
                          <Badge className={lead.surplus_type === "tax_sale"
                            ? "bg-emerald-500/20 text-emerald-400 border-0 text-xs"
                            : "bg-blue-500/20 text-blue-400 border-0 text-xs"
                          }>
                            {lead.surplus_type === "tax_sale" ? "Tax" : "Sheriff"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <p className="text-white font-medium text-xs">{lead.owner_name}</p>
                          {isClaimed && (
                            <p className="text-orange-400 text-xs flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              May be claimed{isPro && lead.claim_flags >= 1 ? ` (${lead.claim_flags})` : ""}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-300 text-xs hidden sm:table-cell">{lead.county}</td>
                        <td className="px-3 py-2 text-right font-bold text-white">${lead.surplus_amount?.toLocaleString()}</td>
                        <td className="px-3 py-2 text-center">
                          <span title={fresh.title} className={`inline-block w-2.5 h-2.5 rounded-full ${fresh.dot}`} />
                        </td>
                        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleAdd(lead)}
                            disabled={addLeadMutation.isPending}
                          >
                            <Plus className="w-3 h-3 mr-0.5" /> Add
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {detailLeadFull && (
        <LeadDetailPanel
          lead={detailLeadFull}
          onClose={() => setDetailLead(null)}
          onAdd={() => handleAdd(detailLeadFull)}
          onFlag={() => flagMutation.mutate(detailLeadFull)}
          alreadyFlagged={isAlreadyFlagged(detailLeadFull)}
          isPro={isPro}
        />
      )}
    </div>
  );
}