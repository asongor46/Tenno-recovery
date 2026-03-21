import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Upload, Trash2, Edit2, RefreshCw, CheckCircle, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

const REQUIRED_FIELDS = ["owner_name", "property_address", "county", "state", "surplus_type", "surplus_amount"];

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, "").toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/"/g, ""));
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ""; });
    return row;
  });
}

export default function AdminLeadManagement() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef();

  const [uploadMode, setUploadMode] = useState("csv"); // "csv" | "pdf"
  const [csvRows, setCsvRows] = useState([]);
  const [batchState, setBatchState] = useState("");
  const [batchCounty, setBatchCounty] = useState("");
  const [batchType, setBatchType] = useState("tax_sale");
  const [uploading, setUploading] = useState(false);
  const [pdfStatus, setPdfStatus] = useState(""); // status message during PDF processing
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["adminLeads"],
    queryFn: () => base44.entities.Lead.list("-uploaded_at", 500),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Lead.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["adminLeads"] }); toast({ title: "Lead deleted" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["adminLeads"] }); setEditingId(null); toast({ title: "Lead updated" }); },
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (uploadMode === "pdf") {
      handlePdfUpload(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const rows = parseCSV(ev.target.result);
        setCsvRows(rows);
      };
      reader.readAsText(file);
    }
  };

  const handlePdfUpload = async (file) => {
    setUploading(true);
    setPdfStatus("Uploading PDF...");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPdfStatus("Extracting lead data with AI (surplus-aware)...");

      const { data: extractResult } = await base44.functions.invoke("extractPDFData", {
        file_url,
        county: batchCounty,
        state: batchState,
      });

      if (!extractResult?.cases?.length) {
        toast({ title: `Could not extract leads from PDF. ${extractResult?.details || ""}`, variant: "destructive" });
        setPdfStatus("");
        setUploading(false);
        return;
      }

      // extractPDFData returns { cases, document_type, surplus_cases_found }
      const detectedType = extractResult.document_type; // e.g. "return_of_sale"
      const rows = extractResult.cases;
      setPdfStatus(`Extracted ${rows.length} leads. Importing...`);

      // Infer surplus_type from document_type if not set per-row
      const inferredType = detectedType === "return_of_sale" ? "sheriff_sale" : batchType;

      let success = 0;
      for (const row of rows) {
        if (!row.owner_name || !row.property_address) continue;
        await base44.entities.Lead.create({
          owner_name: row.owner_name,
          property_address: row.property_address,
          county: row.county || batchCounty,
          state: row.state || batchState,
          surplus_type: row.surplus_type || inferredType,
          surplus_amount: row.surplus_amount || 0,
          sale_amount: row.sale_amount || null,
          sale_date: row.sale_date || "",
          case_number: row.case_number || "",
          parcel_number: row.parcel_number || "",
          fund_status: "active",
          claim_flags: 0,
          times_imported: 0,
          uploaded_at: new Date().toISOString().split("T")[0],
          uploaded_by: "system",
        });
        success++;
      }

      qc.invalidateQueries({ queryKey: ["adminLeads"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: `Imported ${success} leads from PDF (${detectedType || "unknown"} document)` });
      setPdfStatus("");
    } catch (err) {
      toast({ title: "PDF import failed: " + err.message, variant: "destructive" });
      setPdfStatus("");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleImport = async () => {
    if (!csvRows.length) return;
    setUploading(true);
    let success = 0;
    for (const row of csvRows) {
      const lead = {
        owner_name: row.owner_name || row.name || "",
        owner_email: row.owner_email || row.email || "",
        owner_phone: row.owner_phone || row.phone || "",
        property_address: row.property_address || row.address || "",
        city: row.city || "",
        county: row.county || batchCounty,
        state: row.state || batchState,
        case_number: row.case_number || "",
        parcel_number: row.parcel_number || "",
        surplus_type: row.surplus_type || batchType,
        surplus_amount: parseFloat(row.surplus_amount || row.surplus || 0),
        sale_amount: parseFloat(row.sale_amount || 0) || null,
        sale_date: row.sale_date || "",
        judgment_amount: parseFloat(row.judgment_amount || 0) || null,
        fund_status: "active",
        claim_flags: 0,
        times_imported: 0,
        uploaded_at: new Date().toISOString().split("T")[0],
        uploaded_by: "system",
      };
      if (!lead.owner_name || !lead.property_address) continue;
      await base44.entities.Lead.create(lead);
      success++;
    }
    setUploading(false);
    setCsvRows([]);
    qc.invalidateQueries({ queryKey: ["adminLeads"] });
    qc.invalidateQueries({ queryKey: ["leads"] });
    toast({ title: `Imported ${success} leads` });
  };

  // Stats
  const totalByState = leads.reduce((acc, l) => { acc[l.state] = (acc[l.state] || 0) + 1; return acc; }, {});
  const staleCount = leads.filter((l) => {
    if (!l.uploaded_at) return false;
    return Math.floor((new Date() - new Date(l.uploaded_at)) / (1000 * 60 * 60 * 24)) >= 90;
  }).length;
  const flaggedCount = leads.filter((l) => l.claim_flags >= 1).length;
  const mostImported = [...leads].sort((a, b) => (b.times_imported || 0) - (a.times_imported || 0)).slice(0, 3);

  const filteredLeads = leads.filter((l) => {
    if (statusFilter === "claimed") return l.fund_status === "claimed";
    if (statusFilter === "flagged") return l.claim_flags >= 1;
    if (statusFilter === "stale") {
      const days = Math.floor((new Date() - new Date(l.uploaded_at || 0)) / (1000 * 60 * 60 * 24));
      return days >= 90;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-white">Lead Management</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-slate-400">Total Leads</p>
            <p className="text-2xl font-bold text-white">{leads.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-slate-400">Flagged</p>
            <p className="text-2xl font-bold text-orange-400">{flaggedCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-slate-400">Stale (90d+)</p>
            <p className="text-2xl font-bold text-red-400">{staleCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-slate-400">States</p>
            <p className="text-2xl font-bold text-blue-400">{Object.keys(totalByState).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-sm">Upload Leads</CardTitle>
            <div className="flex gap-1 bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => { setUploadMode("csv"); setCsvRows([]); setPdfStatus(""); }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${uploadMode === "csv" ? "bg-slate-500 text-white" : "text-slate-400 hover:text-white"}`}
              >
                CSV
              </button>
              <button
                onClick={() => { setUploadMode("pdf"); setCsvRows([]); setPdfStatus(""); }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${uploadMode === "pdf" ? "bg-slate-500 text-white" : "text-slate-400 hover:text-white"}`}
              >
                PDF
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-500 transition-colors"
            onClick={() => !uploading && fileRef.current?.click()}
          >
            {uploading ? (
              <>
                <RefreshCw className="w-8 h-8 text-emerald-400 mx-auto mb-2 animate-spin" />
                <p className="text-sm text-emerald-400">{pdfStatus || "Processing..."}</p>
              </>
            ) : uploadMode === "pdf" ? (
              <>
                <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-300">Click to upload PDF</p>
                <p className="text-xs text-slate-500 mt-1">AI will extract owner names, surplus amounts, counties, and case numbers</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-300">Click to upload CSV</p>
                <p className="text-xs text-slate-500 mt-1">Columns: owner_name, property_address, county, state, surplus_type, surplus_amount, sale_date, case_number</p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept={uploadMode === "pdf" ? ".pdf" : ".csv"}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Batch defaults — shown for both modes */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400">Default State</label>
              <Input value={batchState} onChange={(e) => setBatchState(e.target.value)} placeholder="FL" className="mt-1 bg-slate-700 border-slate-600 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Default County</label>
              <Input value={batchCounty} onChange={(e) => setBatchCounty(e.target.value)} placeholder="Broward" className="mt-1 bg-slate-700 border-slate-600 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Default Type</label>
              <Select value={batchType} onValueChange={setBatchType}>
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tax_sale">Tax Sale</SelectItem>
                  <SelectItem value="sheriff_sale">Sheriff Sale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {csvRows.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-emerald-400">{csvRows.length} rows loaded</p>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleImport} disabled={uploading}>
                {uploading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Import {csvRows.length} Leads
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white text-sm">All Leads ({filteredLeads.length})</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 text-xs bg-slate-700 border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="claimed">Claimed</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
              <SelectItem value="stale">Stale 90d+</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-800 border-b border-slate-700">
                <tr className="text-slate-400">
                  <th className="text-left px-3 py-2">Owner</th>
                  <th className="text-left px-3 py-2">County / State</th>
                  <th className="text-right px-3 py-2">Surplus</th>
                  <th className="text-center px-3 py-2">Imported</th>
                  <th className="text-center px-3 py-2">Flags</th>
                  <th className="text-center px-3 py-2">Status</th>
                  <th className="text-center px-3 py-2">Uploaded</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="px-3 py-2 text-white font-medium">{lead.owner_name}</td>
                    <td className="px-3 py-2 text-slate-300">{lead.county}, {lead.state}</td>
                    <td className="px-3 py-2 text-right font-bold text-white">${lead.surplus_amount?.toLocaleString()}</td>
                    <td className="px-3 py-2 text-center text-slate-300">{lead.times_imported || 0}</td>
                    <td className="px-3 py-2 text-center">
                      {lead.claim_flags > 0 ? (
                        <span className="text-orange-400 font-bold">{lead.claim_flags}</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {editingId === lead.id ? (
                        <Select
                          value={editData.fund_status || lead.fund_status}
                          onValueChange={(v) => setEditData((d) => ({ ...d, fund_status: v }))}
                        >
                          <SelectTrigger className="h-6 text-xs w-24 bg-slate-700 border-slate-600">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="claimed">Claimed</SelectItem>
                            <SelectItem value="unknown">Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={
                          lead.fund_status === "active" ? "bg-emerald-500/20 text-emerald-400 border-0" :
                          lead.fund_status === "claimed" ? "bg-red-500/20 text-red-400 border-0" :
                          "bg-slate-600 text-slate-300 border-0"
                        }>
                          {lead.fund_status}
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-400">
                      {lead.uploaded_at ? format(new Date(lead.uploaded_at), "MMM d") : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {editingId === lead.id ? (
                          <>
                            <button onClick={() => updateMutation.mutate({ id: lead.id, data: editData })} className="text-emerald-400 hover:text-emerald-300">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-white">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditingId(lead.id); setEditData({}); }} className="text-slate-400 hover:text-white">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => window.confirm("Delete this lead?") && deleteMutation.mutate(lead.id)} className="text-slate-400 hover:text-red-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredLeads.length === 0 && (
              <p className="text-center text-slate-500 py-8 text-sm">No leads</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}