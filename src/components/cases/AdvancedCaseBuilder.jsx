import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Globe,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Target,
  Sparkles,
} from "lucide-react";
import {
  detectSourceType,
  detectCounty,
  getMappingProfile,
  calculateSurplus,
  resolveOwner,
  calculateConfidence,
  COUNTY_PROFILES,
} from "@/utils/countyMappingEngine";

// ADDED: Advanced Case Builder for Universal County Mapping
export default function AdvancedCaseBuilder({ onSuccess, onCancel }) {
  const [url, setUrl] = useState("");
  const [sourceType, setSourceType] = useState("auto"); // auto, pdf, html_table, auction_platform
  const [countyOverride, setCountyOverride] = useState("");
  const [stateOverride, setStateOverride] = useState("");
  const [rawData, setRawData] = useState(""); // For manual paste
  const [isScanning, setIsScanning] = useState(false);
  const [extractedCases, setExtractedCases] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [detectedInfo, setDetectedInfo] = useState(null);
  const [mappingProfile, setMappingProfile] = useState(null);

  // Step 1: Analyze source
  const handleAnalyze = async () => {
    setIsScanning(true);
    try {
      // ADDED: Auto-detect source type and county
      const detected = detectSourceType({ url, content: rawData });
      const countyInfo = detectCounty(url);
      
      setDetectedInfo({
        ...detected,
        ...countyInfo,
      });

      // ADDED: Get appropriate mapping profile
      const profile = getMappingProfile(
        countyOverride || countyInfo?.county,
        sourceType === "auto" ? detected.type : sourceType
      );
      setMappingProfile(profile);

      // ADDED: Fetch and parse data (stub - would call backend function)
      const response = await base44.functions.invoke("scrapeSurplusPage", {
        url,
        source_type: sourceType === "auto" ? detected.type : sourceType,
        mapping_profile: profile,
        county: countyOverride || countyInfo?.county,
        state: stateOverride || countyInfo?.state,
      });

      if (response.data.status === "success") {
        // ADDED: Process cases through UCM engine
        const processed = response.data.cases.map((c) => {
          // Apply surplus resolution
          const surplusResult = calculateSurplus(
            profile.surplus_strategy,
            c
          );
          
          // Apply owner resolution
          const ownerResult = resolveOwner(
            profile.owner_strategy,
            c
          );
          
          // Calculate confidence
          const finalCase = {
            ...c,
            owner_name: ownerResult.name,
            surplus_amount: surplusResult.amount,
            county: countyOverride || countyInfo?.county || c.county,
            state: stateOverride || countyInfo?.state || c.state,
            source_type: "advanced_import",
            // ADDED: Confidence tracking
            extraction_confidence: calculateConfidence(c, profile),
            surplus_confidence: surplusResult.confidence,
            owner_confidence: ownerResult.confidence,
            surplus_method: surplusResult.method,
            owner_method: ownerResult.method,
            surplus_note: surplusResult.note,
            owner_note: ownerResult.note,
          };
          
          return finalCase;
        });
        
        setExtractedCases(processed);
      }
    } catch (error) {
      alert("Analysis failed: " + error.message);
    } finally {
      setIsScanning(false);
    }
  };

  // Step 2: Import selected cases
  const handleImport = async () => {
    const casesToImport = extractedCases.filter((_, idx) =>
      selectedRows.includes(idx)
    );

    for (const caseData of casesToImport) {
      await base44.entities.Case.create(caseData);
    }

    onSuccess();
  };

  // ADDED: Confidence badge colors
  const confidenceColors = {
    high: "bg-emerald-100 text-emerald-700 border-emerald-300",
    medium: "bg-amber-100 text-amber-700 border-amber-300",
    low: "bg-red-100 text-red-700 border-red-300",
    unknown: "bg-slate-100 text-slate-700 border-slate-300",
  };

  const confidenceIcons = {
    high: CheckCircle,
    medium: AlertTriangle,
    low: XCircle,
    unknown: AlertTriangle,
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: Source Configuration */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-lg">Universal County Mapping Engine</h3>
        </div>
        
        {/* ADDED: URL input */}
        <div>
          <Label>Source URL</Label>
          <Input
            placeholder="https://broward.deedauction.net/results or paste HTML/data below"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        {/* ADDED: Source type selector */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>Source Type</Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-Detect</SelectItem>
                <SelectItem value="pdf">PDF Surplus List</SelectItem>
                <SelectItem value="html_table">HTML Table</SelectItem>
                <SelectItem value="auction_platform">Auction Platform</SelectItem>
                <SelectItem value="docket_based">Court Docket</SelectItem>
                <SelectItem value="json_feed">JSON/CSV Feed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>County (Override)</Label>
            <Input
              placeholder="Auto-detect from URL"
              value={countyOverride}
              onChange={(e) => setCountyOverride(e.target.value)}
            />
          </div>
          <div>
            <Label>State (Override)</Label>
            <Input
              placeholder="Auto-detect from URL"
              value={stateOverride}
              onChange={(e) => setStateOverride(e.target.value)}
            />
          </div>
        </div>

        {/* ADDED: Raw data input for manual paste */}
        <div>
          <Label>Or Paste Raw Data (HTML, JSON, CSV)</Label>
          <Textarea
            placeholder="Paste HTML table, JSON array, or CSV data here..."
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            rows={6}
            className="font-mono text-xs"
          />
        </div>

        {/* ADDED: Detection info display */}
        {detectedInfo && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-sm text-blue-900">Source Detected</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div>
                    <span className="text-slate-600">Type:</span>{" "}
                    <span className="font-medium">{detectedInfo.type}</span>
                  </div>
                  {detectedInfo.county && (
                    <div>
                      <span className="text-slate-600">County:</span>{" "}
                      <span className="font-medium">{detectedInfo.county}, {detectedInfo.state}</span>
                    </div>
                  )}
                  {mappingProfile && (
                    <div className="col-span-2">
                      <span className="text-slate-600">Profile:</span>{" "}
                      <span className="font-medium">{mappingProfile.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADDED: Action buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleAnalyze}
            disabled={isScanning || (!url && !rawData)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" />
                Analyze & Extract
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>

      {/* SECTION 2: Extracted Cases Review */}
      {extractedCases.length > 0 && (
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">
              Extracted Cases ({extractedCases.length})
            </h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedRows.length === extractedCases.length) {
                    setSelectedRows([]);
                  } else {
                    setSelectedRows(extractedCases.map((_, i) => i));
                  }
                }}
              >
                {selectedRows.length === extractedCases.length ? "Deselect All" : "Select All"}
              </Button>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={selectedRows.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Import {selectedRows.length} Case(s)
              </Button>
            </div>
          </div>

          {/* ADDED: Enhanced table with confidence indicators */}
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === extractedCases.length}
                      onChange={() => {
                        if (selectedRows.length === extractedCases.length) {
                          setSelectedRows([]);
                        } else {
                          setSelectedRows(extractedCases.map((_, i) => i));
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Property Address</TableHead>
                  <TableHead>County</TableHead>
                  <TableHead>Case #</TableHead>
                  <TableHead className="text-right">Surplus</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractedCases.map((caseItem, idx) => {
                  const ConfIcon = confidenceIcons[caseItem.extraction_confidence];
                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(idx)}
                          onChange={() => {
                            if (selectedRows.includes(idx)) {
                              setSelectedRows(selectedRows.filter((i) => i !== idx));
                            } else {
                              setSelectedRows([...selectedRows, idx]);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{caseItem.owner_name || "—"}</span>
                          {caseItem.owner_note && (
                            <p className="text-xs text-amber-600">{caseItem.owner_note}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {caseItem.property_address || "—"}
                      </TableCell>
                      <TableCell>
                        {caseItem.county}, {caseItem.state}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {caseItem.case_number || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <span className="font-bold">
                            ${caseItem.surplus_amount?.toLocaleString() || "0"}
                          </span>
                          {caseItem.surplus_note && (
                            <p className="text-xs text-slate-500">{caseItem.surplus_method}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${confidenceColors[caseItem.extraction_confidence]} border gap-1`}>
                          <ConfIcon className="w-3 h-3" />
                          {caseItem.extraction_confidence?.toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}