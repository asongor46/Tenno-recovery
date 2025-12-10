import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileText,
  Loader2,
  CheckCircle,
  X,
  Sparkles,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

/**
 * Text Case Builder - Parse pasted auction text
 * Handles Bid4Assets HTML, auction table rows, and other text-based data
 */
export default function TextCaseBuilder({ onSuccess, onCancel }) {
  const [text, setText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedCases, setParsedCases] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  // STEP 1: Parse pasted text
  const handleParse = async () => {
    if (!text.trim()) return;

    setIsParsing(true);

    try {
      // Use LLM to parse text into structured data
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are parsing surplus property sale data from text (HTML, table, or plain text).

Extract ALL cases/properties from the provided text and return structured data.

For each case, extract:
- case_number (docket, file number, case ID)
- owner_name (defendant, property owner)
- property_address (full street address)
- county (county name)
- state (2-letter abbreviation)
- sale_amount (winning bid, sale price)
- judgment_amount (upset price, judgment, debt)
- surplus_amount (excess, overplus, surplus)
- sale_date (YYYY-MM-DD format)
- plaintiff (bank, lender)
- defendant (same as owner_name)
- parcel_number (tax ID, parcel ID)

RULES:
- Ignore banks, LLCs, trusts, corporations (only extract individual homeowners)
- Only include cases with positive surplus
- Calculate surplus as: sale_amount - judgment_amount if not explicitly stated

Provided text:
${text}`,
        response_json_schema: {
          type: "object",
          properties: {
            cases: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  case_number: { type: "string" },
                  owner_name: { type: "string" },
                  property_address: { type: "string" },
                  county: { type: "string" },
                  state: { type: "string" },
                  sale_amount: { type: "number" },
                  judgment_amount: { type: "number" },
                  surplus_amount: { type: "number" },
                  sale_date: { type: "string" },
                  plaintiff: { type: "string" },
                  defendant: { type: "string" },
                  parcel_number: { type: "string" },
                },
              },
            },
          },
        },
      });

      if (result.cases && result.cases.length > 0) {
        const normalized = result.cases.map((c) => ({
          ...c,
          source_type: "text_paste",
          is_hot: (c.surplus_amount || 0) >= 30000,
        }));

        setParsedCases(normalized);
        setSelectedRows(normalized.map((_, i) => i));
        alert(`Parsed ${normalized.length} cases from text`);
      } else {
        alert("No cases found in the provided text");
      }
    } catch (error) {
      alert("Parsing error: " + error.message);
    }

    setIsParsing(false);
  };

  // STEP 2: Edit parsed data
  const handleEditCell = (index, field, value) => {
    const updated = [...parsedCases];
    updated[index][field] = value;
    setParsedCases(updated);
  };

  // STEP 3: Import cases
  const handleImport = async () => {
    const casesToImport = parsedCases.filter((_, i) =>
      selectedRows.includes(i)
    );

    if (casesToImport.length === 0) {
      alert("Please select at least one case to import");
      return;
    }

    setIsImporting(true);

    try {
      for (const caseData of casesToImport) {
        await base44.entities.Case.create({
          ...caseData,
          status: "active",
          stage: "imported",
        });
      }

      alert(`Successfully imported ${casesToImport.length} cases`);
      onSuccess?.();
    } catch (error) {
      alert("Import error: " + error.message);
    }

    setIsImporting(false);
  };

  const toggleRowSelection = (index) => {
    setSelectedRows((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === parsedCases.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(parsedCases.map((_, i) => i));
    }
  };

  return (
    <div className="space-y-6">
      {/* STEP 1: Text Input */}
      {!parsedCases.length && (
        <div className="space-y-4">
          <div className="border-2 border-slate-200 rounded-xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  Paste Auction Data
                </p>
                <p className="text-sm text-slate-500">
                  Copy auction rows from Bid4Assets, tables, or HTML
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Paste Text Here</Label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste HTML table rows, auction data, or structured text here...

Example:
Case #12345 | John Doe | 123 Main St | $150,000 | $100,000 | $50,000 surplus
Case #12346 | Jane Smith | 456 Oak Ave | $200,000 | $175,000 | $25,000 surplus"
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-slate-500">
                Works with: HTML tables, CSV-like text, auction listings, or any structured surplus data
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleParse}
              disabled={isParsing || !text.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isParsing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {isParsing ? "Parsing..." : "Parse Text"}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Preview & Edit Parsed Data */}
      {parsedCases.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">
                {parsedCases.length} Cases Parsed
              </p>
              <p className="text-sm text-slate-500">
                Review and select cases to import
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setParsedCases([]);
                setSelectedRows([]);
              }}
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>

          {/* Parsed Cases Table */}
          <div className="border rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRows.length === parsedCases.length}
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
                {parsedCases.map((caseData, index) => (
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
                          handleEditCell(
                            index,
                            "property_address",
                            e.target.value
                          )
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