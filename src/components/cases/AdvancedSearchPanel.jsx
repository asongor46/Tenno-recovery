import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Save, Filter } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * ADVANCED SEARCH PANEL - Step 12
 * Full-text search, multi-filter, save presets
 */

export default function AdvancedSearchPanel({ onSearch, onClear }) {
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    stage: "",
    county: "",
    minAmount: "",
    maxAmount: "",
    dateFrom: "",
    dateTo: "",
    notaryStatus: "",
    isHot: "",
  });

  const [savedPresets, setSavedPresets] = useState([
    { name: "Hot Cases", filters: { isHot: "true" } },
    { name: "Needs Notary", filters: { notaryStatus: "pending" } },
    { name: "Ready to File", filters: { stage: "packet_ready" } },
  ]);

  const handleChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
  };

  const handleSearch = () => {
    // Filter out empty values
    const activeFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});
    onSearch(activeFilters);
  };

  const handleClear = () => {
    const emptyFilters = Object.keys(filters).reduce((acc, key) => {
      acc[key] = "";
      return acc;
    }, {});
    setFilters(emptyFilters);
    onClear();
  };

  const loadPreset = (preset) => {
    setFilters({ ...filters, ...preset.filters });
    onSearch(preset.filters);
  };

  const savePreset = () => {
    const name = prompt("Enter preset name:");
    if (name) {
      const activeFilters = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value) acc[key] = value;
        return acc;
      }, {});
      setSavedPresets([...savedPresets, { name, filters: activeFilters }]);
    }
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== "").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Advanced Search & Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount} active
            </Badge>
          )}
        </CardTitle>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                Presets
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <p className="text-sm font-semibold mb-2">Saved Presets</p>
                {savedPresets.map((preset, i) => (
                  <Button
                    key={i}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => loadPreset(preset)}
                  >
                    {preset.name}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={savePreset}
                  disabled={activeFilterCount === 0}
                >
                  <Save className="w-3 h-3 mr-2" />
                  Save Current
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Full-text search */}
        <div>
          <Label>Search</Label>
          <Input
            placeholder="Case #, owner name, address, county..."
            value={filters.search}
            onChange={(e) => handleChange("search", e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Status */}
          <div>
            <Label>Status</Label>
            <Select value={filters.status} onValueChange={(v) => handleChange("status", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Any</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="filed">Filed</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stage */}
          <div>
            <Label>Stage</Label>
            <Select value={filters.stage} onValueChange={(v) => handleChange("stage", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Any</SelectItem>
                <SelectItem value="imported">Imported</SelectItem>
                <SelectItem value="agreement_signed">Agreement Signed</SelectItem>
                <SelectItem value="info_completed">Info Completed</SelectItem>
                <SelectItem value="notary_completed">Notary Done</SelectItem>
                <SelectItem value="packet_ready">Packet Ready</SelectItem>
                <SelectItem value="filed">Filed</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notary Status */}
          <div>
            <Label>Notary Status</Label>
            <Select value={filters.notaryStatus} onValueChange={(v) => handleChange("notaryStatus", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Any</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="uploaded">Uploaded</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Hot Cases */}
          <div>
            <Label>Hot Cases</Label>
            <Select value={filters.isHot} onValueChange={(v) => handleChange("isHot", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Any</SelectItem>
                <SelectItem value="true">Hot Only</SelectItem>
                <SelectItem value="false">Regular Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Min Amount */}
          <div>
            <Label>Min Amount</Label>
            <Input
              type="number"
              placeholder="$0"
              value={filters.minAmount}
              onChange={(e) => handleChange("minAmount", e.target.value)}
            />
          </div>

          {/* Max Amount */}
          <div>
            <Label>Max Amount</Label>
            <Input
              type="number"
              placeholder="$1,000,000"
              value={filters.maxAmount}
              onChange={(e) => handleChange("maxAmount", e.target.value)}
            />
          </div>

          {/* Date From */}
          <div>
            <Label>Created From</Label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleChange("dateFrom", e.target.value)}
            />
          </div>

          {/* Date To */}
          <div>
            <Label>Created To</Label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleChange("dateTo", e.target.value)}
            />
          </div>
        </div>

        <Button onClick={handleSearch} className="w-full bg-emerald-600 hover:bg-emerald-700">
          <Search className="w-4 h-4 mr-2" />
          Search Cases
        </Button>
      </CardContent>
    </Card>
  );
}