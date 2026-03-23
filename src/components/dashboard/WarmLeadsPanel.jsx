import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Flame, Lock, Clock, CheckCircle, ArrowRight, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow, format, differenceInHours } from "date-fns";
import { Link } from "react-router-dom";

function DeadlineCountdown({ deadline }) {
  const hoursLeft = differenceInHours(new Date(deadline), new Date());
  const color = hoursLeft < 12 ? "text-red-400" : hoursLeft < 24 ? "text-orange-400" : "text-yellow-400";
  return (
    <span className={`text-xs font-semibold ${color}`}>
      ⏰ {hoursLeft}h left
    </span>
  );
}

export default function WarmLeadsPanel({ user, profile }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isPro = profile?.plan === "pro" || user?.role === "admin";

  const [claimedIds, setClaimedIds] = useState({}); // claim_request_id -> { case_id, contact_deadline }
  const [claimingId, setClaimingId] = useState(null);

  // Get new claim requests (not claimed by anyone)
  const { data: allClaims = [], isLoading } = useQuery({
    queryKey: ["warmLeads"],
    queryFn: () => base44.entities.ClaimRequest.filter({ status: "new" }),
    enabled: !!user,
    refetchInterval: 60000,
  });

  // Also get my claimed leads
  const { data: myClaimed = [] } = useQuery({
    queryKey: ["myClaimedLeads", user?.email],
    queryFn: () => base44.entities.ClaimRequest.filter({ claimed_by_agent_id: user?.id || user?.email }),
    enabled: !!user,
    refetchInterval: 60000,
  });

  // Count this week
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thisWeekCount = allClaims.filter((c) => c.created_date >= oneWeekAgo).length
    + myClaimed.filter((c) => c.created_date >= oneWeekAgo && c.status !== "new").length;

  const handleClaim = async (claim) => {
    setClaimingId(claim.id);
    try {
      const res = await base44.functions.invoke("claimWarmLead", { claim_request_id: claim.id });
      if (res.data?.success) {
        setClaimedIds((prev) => ({ ...prev, [claim.id]: { case_id: res.data.case_id, contact_deadline: res.data.contact_deadline } }));
        qc.invalidateQueries({ queryKey: ["warmLeads"] });
        qc.invalidateQueries({ queryKey: ["myClaimedLeads"] });
        qc.invalidateQueries({ queryKey: ["cases"] });
        toast({
          title: "Lead claimed! Case created.",
          description: "Contact the homeowner within 72 hours to keep this lead.",
        });
      } else {
        toast({ title: res.data?.error || "Could not claim lead.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Failed to claim lead.", variant: "destructive" });
    }
    setClaimingId(null);
  };

  const activeClaims = myClaimed.filter((c) => c.status === "claimed" && !c.contacted_at);
  const allVisible = allClaims; // only 'new' status — already claimed are hidden

  return (
    <div className="bg-slate-800/30 border border-slate-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          <h2 className="text-base font-bold text-white">Warm Leads</h2>
          {thisWeekCount > 0 && (
            <Badge className="bg-orange-500/20 text-orange-400 border-0 text-xs">{thisWeekCount} this week</Badge>
          )}
        </div>
        {isPro && (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">Pro</Badge>
        )}
      </div>

      <div className="p-4">
        {!isPro ? (
          /* Starter lock state */
          <div className="text-center py-6">
            <Lock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 font-semibold mb-1">
              {thisWeekCount > 0 ? `${thisWeekCount} client${thisWeekCount > 1 ? "s" : ""} requested help this week.` : "Clients searching for help."}
            </p>
            <p className="text-slate-500 text-sm mb-5">Upgrade to Pro to claim warm leads and have cases pre-filled.</p>
            <Button className="bg-amber-500 hover:bg-amber-400 text-black font-bold">
              <Crown className="w-4 h-4 mr-2" /> Upgrade to Pro — $97/month
            </Button>
          </div>
        ) : (
          <>
            {/* My active claimed leads (deadline countdown) */}
            {activeClaims.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">My Active Claims</p>
                {activeClaims.map((claim) => {
                  const info = claimedIds[claim.id] || {};
                  return (
                    <div key={claim.id} className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-white text-sm font-semibold">{claim.homeowner_name || claim.search_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <DeadlineCountdown deadline={claim.contact_deadline} />
                          <span className="text-slate-500 text-xs">Contact to keep this lead</span>
                        </div>
                      </div>
                      {(info.case_id || claim.id) && (
                        <Link to={`/CaseDetail?id=${info.case_id || ""}`}>
                          <Button size="sm" variant="outline" className="border-slate-600 text-xs h-7">
                            View Case <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Available warm leads */}
            {allVisible.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Flame className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No new warm leads right now.</p>
                <p className="text-xs mt-1">Check back soon — homeowners search daily.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allVisible.map((claim) => {
                  const isClaiming = claimingId === claim.id;
                  const justClaimed = !!claimedIds[claim.id];
                  const ld = claim.matched_lead_data || {};
                  const timeAgo = claim.created_date
                    ? formatDistanceToNow(new Date(claim.created_date), { addSuffix: true })
                    : "";

                  return (
                    <div key={claim.id} className={`bg-slate-800/60 border rounded-xl p-4 transition-all ${justClaimed ? "border-emerald-500/30" : "border-slate-700"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-white font-semibold text-sm">{claim.homeowner_name || claim.search_name}</p>
                            <span className="text-slate-500 text-xs">{timeAgo}</span>
                          </div>
                          <p className="text-slate-400 text-xs mb-2">
                            {claim.homeowner_phone && <span className="mr-3">{claim.homeowner_phone}</span>}
                            {claim.homeowner_email && <span>{claim.homeowner_email}</span>}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {ld.county && (
                              <span className="text-slate-300 text-xs">{ld.county}, {ld.state}</span>
                            )}
                            {ld.surplus_amount && (
                              <span className="text-emerald-400 font-bold text-sm">${ld.surplus_amount?.toLocaleString()}</span>
                            )}
                            {ld.surplus_type && (
                              <Badge className={ld.surplus_type === "tax_sale"
                                ? "bg-emerald-500/20 text-emerald-400 border-0 text-xs"
                                : "bg-blue-500/20 text-blue-400 border-0 text-xs"
                              }>
                                {ld.surplus_type === "tax_sale" ? "Tax Sale" : "Sheriff"}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {justClaimed ? (
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold mb-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Claimed
                              </div>
                              <Link to={`/CaseDetail?id=${claimedIds[claim.id]?.case_id}`}>
                                <Button size="sm" variant="outline" className="border-slate-600 text-xs h-7">
                                  View Case →
                                </Button>
                              </Link>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-500 text-white"
                              onClick={() => handleClaim(claim)}
                              disabled={isClaiming}
                            >
                              {isClaiming ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                "Claim & Contact"
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-slate-500 mt-4 text-center">
              Contact within 72 hours of claiming. Unclaimed leads return to the pool.
            </p>
            
          </>
        )}
      </div>
    </div>
  );
}