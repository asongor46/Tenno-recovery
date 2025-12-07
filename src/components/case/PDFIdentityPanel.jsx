import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Phone, Mail, MapPin, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Displays identity data extracted from PDFs for a case
 * Shows owner names, addresses, phones, emails from deeds, tax bills, etc.
 */
export default function PDFIdentityPanel({ caseId, onUseData }) {
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ["identity-docs", caseId],
    queryFn: () => base44.entities.Document.filter({ 
      case_id: caseId, 
      usable_for_identity: true 
    }),
    enabled: !!caseId,
  });

  const updateCase = useMutation({
    mutationFn: ({ caseId, data }) => base44.entities.Case.update(caseId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["case", caseId] }),
  });

  const useExtractedData = async (doc, field) => {
    if (!doc.extracted_data) return;

    const updates = {};
    
    if (field === "owner_name" && doc.extracted_data.owner_name) {
      updates.owner_name = doc.extracted_data.owner_name;
    }
    if (field === "mailing_address" && doc.extracted_data.mailing_address) {
      updates.owner_address = doc.extracted_data.mailing_address;
    }
    if (field === "phone" && doc.extracted_data.phone) {
      updates.owner_phone = doc.extracted_data.phone;
    }
    if (field === "email" && doc.extracted_data.email) {
      updates.owner_email = doc.extracted_data.email;
    }

    if (Object.keys(updates).length > 0) {
      await updateCase.mutateAsync({ caseId, data: updates });
      if (onUseData) onUseData(field, updates);
    }
  };

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-8 text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>No identity-related documents uploaded yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Upload deeds, tax bills, or notices to extract owner data
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-4 h-4" />
          From PDFs on This Case
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {documents.map((doc) => (
          <div key={doc.id} className="p-4 border rounded-lg bg-slate-50">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-medium text-sm">{doc.name}</p>
                <Badge variant="secondary" className="text-xs mt-1 capitalize">
                  {doc.category?.replace(/_/g, " ")}
                </Badge>
              </div>
              {doc.extraction_status === "completed" && (
                <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Extracted
                </Badge>
              )}
            </div>

            {doc.extracted_data && (
              <div className="space-y-2">
                {doc.extracted_data.owner_name && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-slate-500">Owner:</span>
                      <span className="font-medium">{doc.extracted_data.owner_name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-emerald-600 h-7 text-xs"
                      onClick={() => useExtractedData(doc, "owner_name")}
                    >
                      Use
                    </Button>
                  </div>
                )}

                {doc.extracted_data.mailing_address && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 flex-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-600 truncate">{doc.extracted_data.mailing_address}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-emerald-600 h-7 text-xs"
                      onClick={() => useExtractedData(doc, "mailing_address")}
                    >
                      Use
                    </Button>
                  </div>
                )}

                {doc.extracted_data.phone && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 flex-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-600">{doc.extracted_data.phone}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-emerald-600 h-7 text-xs"
                      onClick={() => useExtractedData(doc, "phone")}
                    >
                      Use
                    </Button>
                  </div>
                )}

                {doc.extracted_data.email && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 flex-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-600">{doc.extracted_data.email}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-emerald-600 h-7 text-xs"
                      onClick={() => useExtractedData(doc, "email")}
                    >
                      Use
                    </Button>
                  </div>
                )}

                {doc.extracted_data.deceased_indicator && (
                  <Badge className="bg-red-100 text-red-700 text-xs mt-2">
                    ⚠ Deceased indicator found
                  </Badge>
                )}

                {doc.extracted_data.co_owners && doc.extracted_data.co_owners.length > 0 && (
                  <div className="mt-2 text-xs text-slate-600">
                    Co-owners: {doc.extracted_data.co_owners.join(", ")}
                  </div>
                )}
              </div>
            )}

            {(!doc.extracted_data || doc.extraction_status === "pending") && (
              <p className="text-xs text-slate-400 italic">Extraction pending...</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}