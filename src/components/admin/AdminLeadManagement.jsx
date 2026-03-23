import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Upload, Trash2, Edit2, RefreshCw, CheckCircle, X, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

// ─── helpers ───────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { headers: [], rows: [] };
  // preserve original header names for display, but also make a normalized key
  const rawHeaders = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  const headers = rawHeaders.map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const rows = lines.slice(1).map((line) => {
    // handle quoted fields with commas inside
    const vals = [];
    let cur = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { vals.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    vals.push(cur.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ""; });
    return row;
  });
  return { headers, rawHeaders, rows };
}

function cleanAmount(val) {
  if (!val) return 0;
  const cleaned = String(val).replace(/[$,\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

const CORPORATE_KEYWORDS = [
  "LLC", "INC", "CORP", "LTD", "LP ", " LLP",
  "TRUST", "BANK", "N.A.", "ASSOCIATION",
  "COMPANY", " CO.", "PROPERTIES", "INVESTMENTS",
  "HOLDINGS", "SERVICES", "MORTGAGE", "CREDIT UNION",
  "SAVINGS", "DISCOUNT",
];

function isCorporateEntity(name) {
  const upper = (name || "").toUpperCase();
  return CORPORATE_KEYWORDS.some((kw) => upper.includes(kw));
}

// TENNO fields we want to map + their auto-detect hint keywords
const TENNO_FIELDS = [
  { key: "owner_name",       label: "Owner Name",       required: true,  hints: ["name", "payee", "defendant", "trustor", "owner", "borrower"] },
  { key: "surplus_amount",   label: "Surplus Amount",   required: false, hints: ["amount", "surplus", "balance", "proceeds", "excess"] },
  { key: "case_number",      label: "Case Number",      required: false, hints: ["docket", "case", "civil", "action", "number", "file"] },
  { key: "property_address", label: "Property Address", required: false, hints: ["address", "property", "location"] },
  { key: "sale_date",        label: "Sale Date",        required: false, hints: ["date", "sale_date", "deposit"] },
  { key: "parcel_number",    label: "Parcel Number",    required: false, hints: ["parcel", "tax_id", "folio", "pin"] },
  { key: "county",           label: "County",           required: false, hints: ["county"] },
  { key: "state",            label: "State",            required: false, hints: ["state"] },
  { key: "surplus_type",     label: "Surplus Type",     required: false, hints: ["type", "surplus_type"] },
];

function autoDetectMappings(headers) {
  const map = {};
  for (const field of TENNO_FIELDS) {
    const match = headers.find((h) =>
      field.hints.some((hint) => h.toLowerCase().includes(hint))
    );
    if (match) map[field.key] = match;
  }
  return map;
}

// ─── component ─────────────────────────────────────────────────────────────

export default function AdminLeadManagement() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef();

  const [uploadMode, setUploadMode] = useState("csv");
  const [csvData, setCsvData] = useState(null); // { headers, rawHeaders, rows }
  const [columnMap, setColumnMap] = useState({});
  const [batchState, setBatchState] = useState("");
  const [batchCounty, setBatchCounty] = useState("");
  const [batchType, setBatchType] = useState("tax_sale");
  const [includeCorporate, setIncludeCorporate] = useState(false);
  const [minSurplus, setMinSurplus] = useState(1000);
  const [includeLowValue, setIncludeLowValue] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pdfStatus, setPdfStatus] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [cleanupThreshold, setCleanupThreshold] = useState(1000);
  const [cleanupPreview, setCleanupPreview] = useState(null);

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

  // When CSV loads, auto-detect column mappings
  useEffect(() => {
    if (csvData?.headers) {
      setColumnMap(autoDetectMappings(csvData.headers));
    }
  }, [csvData]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportResult(null);
    if (uploadMode === "pdf") {
      handlePdfUpload(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const parsed = parseCSV(ev.target.result);
        setCsvData(parsed);
      };
      reader.readAsText(file);
    }
  };

  const handlePdfUpload = async (file) => {
    setUploading(true);
    setPdfStatus("Uploading PDF...");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPdfStatus("Extracting lead data with AI...");
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
      const inferredType = extractResult.document_type === "return_of_sale" ? "sheriff_sale" : batchType;
      let success = 0;
      for (const row of extractResult.cases) {
        if (!row.owner_name) continue;
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
          fund_status: "active", claim_flags: 0, times_imported: 0,
          uploaded_at: new Date().toISOString().split("T")[0],
          uploaded_by: "system",
        });
        success++;
      }
      qc.invalidateQueries({ queryKey: ["adminLeads"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: `Imported ${success} leads from PDF` });
      setPdfStatus("");
    } catch (err) {
      toast({ title: "PDF import failed: " + err.message, variant: "destructive" });
      setPdfStatus("");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  // Build a resolved lead object from a CSV row + current mapping
  function resolveRow(row) {
    const g = (key) => row[columnMap[key]] || "";
    const rawName =
      g("owner_name") || row.owner_name || row.name || row.defendant ||
      row["defendant/payee"] || row.defendant_payee || row.payee ||
      row.trustor || row.trustor_name || row.borrower || row.property_owner || "";
    const rawAmount =
      g("surplus_amount") || row.surplus_amount || row.surplus || row.amount ||
      row.case_balance || row.balance || row.excess || row.proceeds || row.excess_proceeds || "";
    const rawCase =
      (g("case_number") || row.case_number || row.docket || row.case_no ||
      row.civil_action_number || row.civil_action || row.action_number || row.file_number || "")
        .replace(/\*/g, "").trim();
    const rawAddress =
      g("property_address") || row.property_address || row.address || row.property || row.location || "";
    const rawDate =
      g("sale_date") || row.sale_date || row.date || row.deposit_date || row.sale || "";
    const rawParcel =
      g("parcel_number") || row.parcel_number || row.parcel || row.tax_id || row.folio || row.pin || "";

    return {
      owner_name: rawName,
      surplus_amount: cleanAmount(rawAmount),
      case_number: rawCase,
      property_address: rawAddress,
      sale_date: rawDate,
      parcel_number: rawParcel,
      county: g("county") || row.county || batchCounty,
      state: g("state") || row.state || batchState,
      surplus_type: g("surplus_type") || row.surplus_type || batchType,
      owner_email: row.owner_email || row.email || "",
      owner_phone: row.owner_phone || row.phone || "",
      city: row.city || "",
      sale_amount: cleanAmount(row.sale_amount || ""),
      judgment_amount: cleanAmount(row.judgment_amount || ""),
    };
  }

  // Stats derived from current mapping
  const csvRows = csvData?.rows || [];
  const resolvedRows = csvRows.map(resolveRow);
  const namedRows = resolvedRows.filter((r) => !!r.owner_name);
  const corporateRows = namedRows.filter((r) => isCorporateEntity(r.owner_name));
  const lowValueRows = namedRows.filter((r) => !isCorporateEntity(r.owner_name) && r.surplus_amount < minSurplus);
  const importableRows = namedRows.filter((r) => {
    if (!includeCorporate && isCorporateEntity(r.owner_name)) return false;
    if (!includeLowValue && r.surplus_amount < minSurplus) return false;
    return true;
  });
  const skippedNoName = csvRows.length - namedRows.length;

  const handleImport = async () => {
    if (!importableRows.length) return;
    setUploading(true);
    setImportResult(null);

    const today = new Date().toISOString().split("T")[0];
    let skippedCorp = 0;
    let skippedLowValue = 0;
    const leadsToCreate = [];

    for (const lead of resolvedRows) {
      if (!lead.owner_name) continue;
      if (!includeCorporate && isCorporateEntity(lead.owner_name)) { skippedCorp++; continue; }
      const isLow = lead.surplus_amount < minSurplus;
      if (!includeLowValue && isLow) { skippedLowValue++; continue; }
      leadsToCreate.push({
        ...lead,
        is_low_value: lead.surplus_amount < minSurplus,
        fund_status: "active", claim_flags: 0, times_imported: 0,
        uploaded_at: today,
        uploaded_by: "system",
      });
    }

    // Bulk create in chunks of 100 to avoid payload limits
    const CHUNK_SIZE = 100;
    let success = 0;
    for (let i = 0; i < leadsToCreate.length; i += CHUNK_SIZE) {
      const chunk = leadsToCreate.slice(i, i + CHUNK_SIZE);
      await base44.entities.Lead.bulkCreate(chunk);
      success += chunk.length;
    }

    setUploading(false);
    setCsvData(null);
    setColumnMap({});
    qc.invalidateQueries({ queryKey: ["adminLeads"] });
    qc.invalidateQueries({ queryKey: ["leads"] });
    if (fileRef.current) fileRef.current.value = "";

    if (success === 0) {
      setImportResult({ type: "warn", message: `0 leads imported. Check your column mapping — no rows had a valid Owner Name.` });
    } else {
      const parts = [];
      if (skippedCorp > 0) parts.push(`${skippedCorp} corporate entities`);
      if (skippedLowValue > 0) parts.push(`${skippedLowValue} low-value leads (under $${minSurplus.toLocaleString()})`);
      const skippedMsg = parts.length ? ` Skipped ${parts.join(" and ")}.` : "";
      const lowFlaggedCount = leadsToCreate.filter(l => l.is_low_value).length;
      const flaggedMsg = includeLowValue && lowFlaggedCount > 0 ? ` ${lowFlaggedCount} flagged as low-value.` : "";
      setImportResult({
        type: "success",
        message: `Imported ${success} leads from ${batchCounty || "batch"}, ${batchState || ""}.${skippedMsg}${flaggedMsg}`,
      });
    }
  };

  // Stats
  const totalByState = leads.reduce((acc, l) => { acc[l.state] = (acc[l.state] || 0) + 1; return acc; }, {});
  const staleCount = leads.filter((l) => {
    if (!l.uploaded_at) return false;
    return Math.floor((new Date() - new Date(l.uploaded_at)) / (1000 * 60 * 60 * 24)) >= 90;
  }).length;
  const flaggedCount = leads.filter((l) => l.claim_flags >= 1).length;

  const filteredLeads = leads.filter((l) => {
    if (statusFilter === "claimed") return l.fund_status === "claimed";
    if (statusFilter === "flagged") return l.claim_flags >= 1;
    if (statusFilter === "low_value") return l.is_low_value === true || (l.surplus_amount || 0) < 1000;
    if (statusFilter === "archived") return l.fund_status === "archived";
    if (statusFilter === "stale") {
      const days = Math.floor((new Date() - new Date(l.uploaded_at || 0)) / (1000 * 60 * 60 * 24));
      return days >= 90;
    }
    if (statusFilter === "all") return l.fund_status !== "archived";
    return true;
  });

  const handleCleanupPreview = () => {
    const count = leads.filter(l => (l.surplus_amount || 0) < cleanupThreshold && l.fund_status !== "archived").length;
    setCleanupPreview(count);
  };

  const handleArchiveLowValue = async () => {
    if (!cleanupPreview) return;
    const toArchive = leads.filter(l => (l.surplus_amount || 0) < cleanupThreshold && l.fund_status !== "archived");
    const CHUNK = 50;
    for (let i = 0; i < toArchive.length; i += CHUNK) {
      await Promise.all(toArchive.slice(i, i + CHUNK).map(l => base44.entities.Lead.update(l.id, { fund_status: "archived" })));
    }
    qc.invalidateQueries({ queryKey: ["adminLeads"] });
    setCleanupPreview(null);
    toast({ title: `Archived ${toArchive.length} low-value leads (under $${cleanupThreshold.toLocaleString()})` });
  };

  const csvHeaders = csvData?.headers || [];
  const previewRows = importableRows.slice(0, 5);

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
                onClick={() => { setUploadMode("csv"); setCsvData(null); setPdfStatus(""); setImportResult(null); }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${uploadMode === "csv" ? "bg-slate-500 text-white" : "text-slate-400 hover:text-white"}`}
              >
                CSV
              </button>
              <button
                onClick={() => { setUploadMode("pdf"); setCsvData(null); setPdfStatus(""); setImportResult(null); }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${uploadMode === "pdf" ? "bg-slate-500 text-white" : "text-slate-400 hover:text-white"}`}
              >
                PDF
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
          {!csvData && (
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
                  <p className="text-xs text-slate-500 mt-1">Any column names work — you'll map them below</p>
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
          )}

          {/* Min surplus + batch defaults */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-400">Min Surplus ($)</label>
              <Input type="number" value={minSurplus} onChange={(e) => setMinSurplus(parseFloat(e.target.value) || 0)} placeholder="1000" className="mt-1 bg-slate-700 border-slate-600 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Default State</label>
              <Input value={batchState} onChange={(e) => setBatchState(e.target.value)} placeholder="PA" className="mt-1 bg-slate-700 border-slate-600 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Default County</label>
              <Input value={batchCounty} onChange={(e) => setBatchCounty(e.target.value)} placeholder="Allegheny" className="mt-1 bg-slate-700 border-slate-600 text-sm" />
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

          {/* ── Column Mapping UI ── */}
          {csvData && csvHeaders.length > 0 && (
            <div className="space-y-3 border border-slate-700 rounded-xl p-4 bg-slate-900/40">
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Map your CSV columns</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TENNO_FIELDS.map((field) => (
                  <div key={field.key} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-32 shrink-0">
                      {field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}
                    </span>
                    <Select
                      value={columnMap[field.key] || "__none__"}
                      onValueChange={(v) =>
                        setColumnMap((prev) => ({ ...prev, [field.key]: v === "__none__" ? undefined : v }))
                      }
                    >
                      <SelectTrigger className="h-7 text-xs bg-slate-700 border-slate-600 flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          {field.key === "county" && batchCounty
                            ? `(use batch: ${batchCounty})`
                            : field.key === "state" && batchState
                            ? `(use batch: ${batchState})`
                            : field.key === "surplus_type"
                            ? `(use batch: ${batchType})`
                            : "(none)"}
                        </SelectItem>
                        {csvHeaders.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={includeCorporate} onChange={(e) => setIncludeCorporate(e.target.checked)} className="accent-emerald-500" />
                  Include corporate entities (LLC, Inc, Corp, etc.)
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={includeLowValue} onChange={(e) => setIncludeLowValue(e.target.checked)} className="accent-emerald-500" />
                  Include low-value leads (flagged)
                </label>
              </div>

              {/* Row stats */}
              <p className="text-xs text-slate-400">
                <span className="text-white font-medium">{csvRows.length}</span> rows loaded.{" "}
                <span className="text-emerald-400 font-medium">{namedRows.length}</span> have owner names.{" "}
                {skippedNoName > 0 && <span className="text-red-400">{skippedNoName} skipped (no name). </span>}
                {!includeCorporate && corporateRows.length > 0 && (
                  <span className="text-amber-400">{corporateRows.length} corporate entities filtered. </span>
                )}
                {!includeLowValue && lowValueRows.length > 0 && (
                  <span className="text-amber-400">{lowValueRows.length} low-value (under ${minSurplus.toLocaleString()}) filtered. </span>
                )}
                <span className="text-emerald-300 font-semibold">{importableRows.length} will be imported.</span>
              </p>

              {/* Preview table */}
              {previewRows.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-slate-400">Preview (first {Math.min(5, importableRows.length)} of {importableRows.length} rows):</p>
                  <div className="overflow-x-auto rounded-lg border border-slate-700">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-800">
                        <tr className="text-slate-400">
                          <th className="text-left px-3 py-2">Owner Name</th>
                          <th className="text-right px-3 py-2">Amount</th>
                          <th className="text-left px-3 py-2">Case #</th>
                          <th className="text-left px-3 py-2">County / State</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((r, i) => (
                          <tr key={i} className="border-t border-slate-700/50">
                            <td className="px-3 py-1.5 text-white">{r.owner_name}</td>
                            <td className="px-3 py-1.5 text-right text-emerald-400">
                              {r.surplus_amount > 0 ? `$${r.surplus_amount.toLocaleString()}` : "—"}
                            </td>
                            <td className="px-3 py-1.5 text-slate-300">{r.case_number || "—"}</td>
                            <td className="px-3 py-1.5 text-slate-300">{r.county || batchCounty}, {r.state || batchState}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleImport}
                  disabled={uploading || importableRows.length === 0}
                >
                  {uploading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Import {importableRows.length} Leads
                </Button>
                <Button
                  variant="ghost"
                  className="text-slate-400 hover:text-white"
                  onClick={() => { setCsvData(null); setColumnMap({}); setImportResult(null); if (fileRef.current) fileRef.current.value = ""; }}
                >
                  <X className="w-4 h-4 mr-1" /> Clear
                </Button>
              </div>
            </div>
          )}

          {/* Import result feedback */}
          {importResult && (
            <div className={`flex items-start gap-2 text-sm rounded-lg px-4 py-3 ${
              importResult.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            }`}>
              {importResult.type === "success"
                ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
              {importResult.message}
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
                      {lead.claim_flags > 0
                        ? <span className="text-orange-400 font-bold">{lead.claim_flags}</span>
                        : <span className="text-slate-500">0</span>}
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