// [NEW - Tier 3] Auto-generate filing packets with county-specific forms
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  PackageCheck,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useStandardToast } from "@/components/shared/useStandardToast";

export default function AutoFilingPacketGenerator({ caseData, countyData }) {
  const [generating, setGenerating] = useState(false);
  const [packetUrl, setPacketUrl] = useState(null);
  const [missingItems, setMissingItems] = useState([]);
  const queryClient = useQueryClient();
  const toast = useStandardToast();

  // Check readiness
  const checkReadiness = () => {
    const missing = [];
    
    if (!caseData.agreement_status || caseData.agreement_status !== 'signed') {
      missing.push("Fee agreement not signed");
    }
    
    if (!caseData.id_front_url || !caseData.id_back_url) {
      missing.push("ID documents not uploaded");
    }
    
    if (countyData?.requires_notarized_authorization && !caseData.notary_packet_uploaded) {
      missing.push("Notarized authorization not uploaded");
    }
    
    if (!caseData.surplus_amount || caseData.surplus_amount <= 0) {
      missing.push("Surplus amount not set");
    }

    if (!caseData.property_address) {
      missing.push("Property address missing");
    }

    setMissingItems(missing);
    return missing.length === 0;
  };

  const handleGenerate = async () => {
    if (!checkReadiness()) {
      toast.error("Case not ready for packet generation");
      return;
    }

    setGenerating(true);
    try {
      const { data } = await base44.functions.invoke("generateFilledPacket", {
        case_id: caseData.id
      });

      if (data.success) {
        setPacketUrl(data.packet_url);
        
        // Update case stage
        await base44.entities.Case.update(caseData.id, {
          stage: "packet_ready",
          packet_url: data.packet_url,
          packet_generated_at: new Date().toISOString()
        });

        // Log activity
        await base44.entities.ActivityLog.create({
          case_id: caseData.id,
          action: "Filing Packet Generated",
          description: `Auto-generated filing packet for ${countyData?.name || "county"}`,
          performed_by: "system"
        });

        queryClient.invalidateQueries({ queryKey: ["case", caseData.id] });
        queryClient.invalidateQueries({ queryKey: ["documents", caseData.id] });
        toast.success("Filing packet generated successfully!");
      } else {
        toast.error(data.error || "Failed to generate packet");
      }
    } catch (error) {
      toast.error("Error generating packet: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  React.useEffect(() => {
    checkReadiness();
  }, [caseData, countyData]);

  const isReady = missingItems.length === 0;
  const hasExistingPacket = !!caseData.packet_url;

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Filing Packet Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* County Info */}
        {countyData && (
          <div className="p-3 bg-white rounded-lg border">
            <p className="text-sm font-semibold text-slate-900">{countyData.name} County</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {countyData.filing_method || "mail"}
              </Badge>
              {countyData.requires_notarized_authorization && (
                <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
                  Notary Required
                </Badge>
              )}
              {countyData.claim_deadline_days && (
                <Badge variant="outline" className="text-xs">
                  {countyData.claim_deadline_days}-day deadline
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Readiness Checklist */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-900">Readiness Check:</p>
          {[
            { label: "Fee agreement signed", ready: caseData.agreement_status === 'signed' },
            { label: "ID documents uploaded", ready: !!caseData.id_front_url && !!caseData.id_back_url },
            { 
              label: "Notarized authorization", 
              ready: !countyData?.requires_notarized_authorization || !!caseData.notary_packet_uploaded,
              skip: !countyData?.requires_notarized_authorization
            },
            { label: "Surplus amount set", ready: !!caseData.surplus_amount },
            { label: "Property address", ready: !!caseData.property_address },
          ].filter(item => !item.skip).map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {item.ready ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600" />
              )}
              <span className={item.ready ? "text-slate-700" : "text-amber-700"}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Missing Items Alert */}
        {!isReady && (
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              <p className="font-semibold mb-1">Cannot generate packet yet:</p>
              <ul className="text-sm space-y-1">
                {missingItems.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Forms Included */}
        {countyData?.filing_forms && countyData.filing_forms.length > 0 && (
          <div className="p-3 bg-white rounded-lg border">
            <p className="text-xs font-semibold text-slate-700 mb-2">Forms to be included:</p>
            <div className="space-y-1">
              {countyData.filing_forms.map((formId, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                  <FileText className="w-3 h-3" />
                  Form {i + 1}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Existing Packet */}
        {hasExistingPacket && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <PackageCheck className="w-4 h-4 text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-900">Packet Already Generated</p>
            </div>
            {caseData.packet_generated_at && (
              <p className="text-xs text-emerald-700">
                Generated: {new Date(caseData.packet_generated_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <Button
            onClick={handleGenerate}
            disabled={!isReady || generating}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {hasExistingPacket ? "Regenerate" : "Generate"} Filing Packet
              </>
            )}
          </Button>

          {(packetUrl || hasExistingPacket) && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const url = packetUrl || caseData.packet_url;
                window.open(url, '_blank');
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Packet
            </Button>
          )}
        </div>

        {/* Info */}
        <p className="text-xs text-slate-500">
          The AI will auto-fill all county-specific forms with case data, merge with your documents, 
          and create a complete filing-ready packet.
        </p>
      </CardContent>
    </Card>
  );
}