import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Download, 
  Eye, 
  DollarSign,
  Receipt
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

/**
 * ADDED: Documents & Invoices Section
 * Allows clients to view/download documents and invoices
 */
export default function DocumentsSection({ caseId }) {
  // Fetch documents
  const { data: documents = [] } = useQuery({
    queryKey: ["portal-documents", caseId],
    queryFn: () => base44.entities.Document.filter({ case_id: caseId }),
    enabled: !!caseId,
  });

  // Fetch invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ["portal-invoices", caseId],
    queryFn: () => base44.entities.Invoice.filter({ case_id: caseId }),
    enabled: !!caseId,
  });

  const clientDocuments = documents.filter(
    (d) => ["agreement", "final_packet", "id_front", "id_back", "notary_page"].includes(d.category)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Your Documents & Invoices
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Documents */}
        {clientDocuments.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm text-slate-600 mb-2">Documents</h3>
            <div className="space-y-2">
              {clientDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{doc.name}</p>
                      <p className="text-xs text-slate-500">
                        {doc.created_date ? format(new Date(doc.created_date), "MMM d, yyyy") : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.file_url && (
                      <>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </a>
                        <a href={doc.file_url} download>
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </a>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invoices */}
        {invoices.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm text-slate-600 mb-2">Invoices</h3>
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Invoice #{invoice.invoice_number}</p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(invoice.invoice_date), "MMM d, yyyy")} • 
                        <span className="font-semibold ml-1">${invoice.total_amount?.toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-xs ${
                        invoice.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : invoice.status === "overdue"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {invoice.status}
                    </Badge>
                    {invoice.pdf_url && (
                      <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {clientDocuments.length === 0 && invoices.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No documents or invoices yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}