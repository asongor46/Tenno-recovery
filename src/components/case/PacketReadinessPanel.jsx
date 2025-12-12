import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  Loader2,
  Package,
} from "lucide-react";
import { useStandardToast } from "@/components/shared/useStandardToast";

export default function PacketReadinessPanel({ caseData, countyData }) {
  const queryClient = useQueryClient();
  const toast = useStandardToast();

  const { data: documents = [] } = useQuery({
    queryKey: ["case-documents", caseData.id],
    queryFn: () => base44.entities.Document.filter({ case_id: caseData.id }),
  });

  const { data: countyForms = [] } = useQuery({
    queryKey: ["county-forms", countyData?.id],
    queryFn: () => base44.entities.CountyFormTemplate.filter({ county_id: countyData.id }),
    enabled: !!countyData?.id,
  });

  const generatePacket = useMutation({
    mutationFn: () => base44.functions.invoke("generateFilledPacket", {
      case_id: caseData.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-documents", caseData.id] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast.success("Packet generated successfully");
    },
    onError: (error) => {
      toast.error("Failed to generate packet: " + error.message);
    },
  });

  // Check readiness
  const hasAgreement = documents.some(d => d.category === "agreement" && d.is_primary);
  const hasIDFront = documents.some(d => d.category === "id_front");
  const hasIDBack = documents.some(d => d.category === "id_back");
  const hasNotary = caseData.notary_status === "uploaded" || caseData.notary_status === "approved";
  const hasCompletedInfo = caseData.stage !== "imported" && caseData.owner_email && caseData.owner_phone;
  
  const requiredForms = countyForms.filter(f => 
    f.form_type === "application" || f.form_type === "affidavit"
  );

  const missingItems = [];
  if (!hasAgreement) missingItems.push("Signed Agreement");
  if (!hasIDFront || !hasIDBack) missingItems.push("Owner ID (front & back)");
  if (!hasNotary) missingItems.push("Notarized Document");
  if (!hasCompletedInfo) missingItems.push("Complete Owner Information");
  if (requiredForms.length > 0 && !caseData.packet_url) {
    missingItems.push(`${requiredForms.length} County Forms`);
  }

  const isReady = missingItems.length === 0;
  const packetExists = !!caseData.packet_url;

  return (
    <Card className={isReady ? "border-emerald-200 bg-emerald-50/30" : "border-amber-200 bg-amber-50/30"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Packet Readiness
          {isReady ? (
            <Badge className="ml-auto bg-emerald-600">Ready</Badge>
          ) : (
            <Badge className="ml-auto bg-amber-600">{missingItems.length} Missing</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Checklist */}
        <div className="space-y-2">
          <ChecklistItem 
            label="Signed Agreement" 
            complete={hasAgreement}
          />
          <ChecklistItem 
            label="Owner ID (Front & Back)" 
            complete={hasIDFront && hasIDBack}
          />
          <ChecklistItem 
            label="Notarized Document" 
            complete={hasNotary}
          />
          <ChecklistItem 
            label="Complete Information" 
            complete={hasCompletedInfo}
          />
          {requiredForms.length > 0 && (
            <ChecklistItem 
              label={`County Forms (${requiredForms.length} required)`}
              complete={countyForms.length >= requiredForms.length}
            />
          )}
        </div>

        {/* Missing Items Alert */}
        {!isReady && (
          <div className="bg-amber-100 border border-amber-300 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900 mb-1">Missing Items:</p>
                <ul className="text-xs text-amber-800 space-y-0.5">
                  {missingItems.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* County-Specific Requirements */}
        {countyData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-900 mb-2">
              {countyData.name} County Requirements:
            </p>
            <div className="text-xs text-blue-800 space-y-1">
              <p>• Filing Method: {countyData.filing_method}</p>
              {countyData.notary_required && (
                <p>• Notary: {countyData.notary_type} ({countyData.notary_format})</p>
              )}
              {countyData.requires_separate_notary_page && (
                <p>• Separate notary page required</p>
              )}
              {countyData.assignment_required && (
                <p>• Assignment document required</p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {packetExists && (
            <a href={caseData.packet_url} target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="outline" className="w-full gap-2">
                <Download className="w-4 h-4" />
                Download Current Packet
              </Button>
            </a>
          )}
          
          <Button
            onClick={() => generatePacket.mutate()}
            disabled={!isReady || generatePacket.isPending}
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {generatePacket.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                {packetExists ? "Regenerate Packet" : "Generate Packet"}
              </>
            )}
          </Button>
        </div>

        {packetExists && (
          <p className="text-xs text-slate-500 text-center">
            Last generated: {new Date(caseData.packet_generated_at).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ChecklistItem({ label, complete }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-white rounded border">
      {complete ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
      )}
      <span className={`text-sm ${complete ? "text-slate-700" : "text-slate-500"}`}>
        {label}
      </span>
    </div>
  );
}