import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ExternalLink,
  Search,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
  Globe,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * URL Case Builder - Web crawler for surplus list pages
 * Scrapes structured data from county websites, bid4assets, etc.
 */
export default function URLCaseBuilder({ onSuccess, onCancel }) {
  const [url, setUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scrapedCases, setScrapedCases] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  // STEP 1: Scan URL
  const handleScan = async () => {
    if (!url) return;

    setIsScanning(true);

    try {
      // First try web scraping
      const { data } = await base44.functions.invoke("scrapeSurplusPage", {
        url,
      });

      if (data.status === "success" && data.cases?.length > 0) {
        setScrapedCases(data.cases || []);
        setSelectedRows(data.cases?.map((_, i) => i) || []);
        
        if (data.filtered_out > 0) {
          alert(
            `Found ${data.total_found || data.cases.length} entries.\n` +
            `${data.filtered_out} filtered out (corporate/LLC or no surplus).\n` +
            `${data.cases.length} valid cases ready to import.`
          );
        }
      } else {
        // Fallback: Try LLM extraction if scraping didn't work
        const { data: llmData } = await base44.functions.invoke("extractPDFData", {
          file_url: url,
          extraction_type: "surplus_list",
          county: null,
          state: "PA",
        });

        if (llmData.status === "success") {
          setScrapedCases(llmData.cases || []);
          setSelectedRows(llmData.cases?.map((_, i) => i) || []);
          
          if (llmData.filtered_out > 0) {
            alert(
              `Found ${llmData.total_found} entries.\n` +
              `${llmData.filtered_out} filtered out (corporate/LLC or no surplus).\n` +
              `${llmData.surplus_cases_found} valid cases ready to import.`
            );
          }
        } else {
          alert("Scan failed: " + (data.error || llmData.details || "Could not extract data"));
        }
      }
    } catch (error) {
      alert("Scan error: " + error.message);
    }

    setIsScanning(false);
  };

  // STEP 2: Edit scraped data
  const handleEditCell = (index, field, value) => {
    const updated = [...scrapedCases];
    updated[index][field] = value;
    setScrapedCases(updated);
  };

  // STEP 3: Import selected cases
  const handleImport = async () => {
    const casesToImport = scrapedCases.filter((_, i) => selectedRows.includes(i));

    if (casesToImport.length === 0) {
      alert("Please select at least one case to import");
      return;
    }

    setIsImporting(true);

    // Create cases
    for (const caseData of casesToImport) {
      await base44.entities.Case.create({
        ...caseData,
        source_type: "api", // Using "api" to indicate web import
        status: "active",
        stage: "imported",
      });
    }

    setIsImporting(false);
    alert(`Successfully imported ${casesToImport.length} cases`);
    onSuccess?.();
  };

  const toggleRowSelection = (index) => {
    setSelectedRows((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === scrapedCases.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(scrapedCases.map((_, i) => i));
    }
  };

  return (
    <div className="space-y-6">
      {/* STEP 1: URL Input */}
      {!scrapedCases.length && (
        <div className="space-y-4">
          <div className="border-2 border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-8 h-8 text-emerald-600" />
              <div>
                <p className="font-semibold text-slate-900">
                  Enter Surplus List or Sheriff Sale URL
                </p>
                <p className="text-sm text-slate-500">
                  Web crawler will extract cases from the page
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Page URL</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.bid4assets.com/surplus-sales/county-name"
                className="font-mono"
              />
              <p className="text-xs text-slate-500">
                Examples: bid4assets.com, sheriff websites, county clerk surplus pages
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleScan}
              disabled={isScanning || !url}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isScanning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              {isScanning ? "Scanning Page..." : "Scan Page"}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Preview & Edit Scraped Data */}
      {scrapedCases.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">
                {scrapedCases.length} Cases Found
              </p>
              <p className="text-sm text-slate-500">
                Review and select cases to import
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScrapedCases([])}
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>

          {/* Scraped Cases Table */}
          <div className="border rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRows.length === scrapedCases.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Owner Name</TableHead>
                  <TableHead>Property Address</TableHead>
                  <TableHead>County</TableHead>
                  <TableHead>Case #</TableHead>
                  <TableHead>Surplus</TableHead>
                  <TableHead>Sale Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scrapedCases.map((caseData, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.includes(index)}
                        onCheckedChange={() => toggleRowSelection(index)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={caseData.owner_name || ""}
                        onChange={(e) =>
                          handleEditCell(index, "owner_name", e.target.value)
                        }
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={caseData.property_address || ""}
                        onChange={(e) =>
                          handleEditCell(index, "property_address", e.target.value)
                        }
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={caseData.county || ""}
                        onChange={(e) =>
                          handleEditCell(index, "county", e.target.value)
                        }
                        className="h-8 w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={caseData.case_number || ""}
                        onChange={(e) =>
                          handleEditCell(index, "case_number", e.target.value)
                        }
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={caseData.surplus_amount || ""}
                        onChange={(e) =>
                          handleEditCell(
                            index,
                            "surplus_amount",
                            parseFloat(e.target.value)
                          )
                        }
                        className="h-8 w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={caseData.sale_date || ""}
                        onChange={(e) =>
                          handleEditCell(index, "sale_date", e.target.value)
                        }
                        className="h-8"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Import Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleImport}
              disabled={isImporting || selectedRows.length === 0}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {isImporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {isImporting
                ? "Importing..."
                : `Import ${selectedRows.length} Selected Cases`}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}