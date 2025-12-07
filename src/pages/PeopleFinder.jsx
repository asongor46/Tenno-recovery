import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Users,
  Search,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Loader2,
  Plus,
  CheckCircle,
  AlertCircle,
  XCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const confidenceColors = {
  high: "bg-emerald-100 text-emerald-700 border-emerald-300",
  medium: "bg-amber-100 text-amber-700 border-amber-300",
  low: "bg-slate-100 text-slate-700 border-slate-300",
};

const confidenceIcons = {
  high: CheckCircle,
  medium: AlertCircle,
  low: XCircle,
};

export default function PeopleFinder() {
  const [searchName, setSearchName] = useState("");
  const [searchAddress, setSearchAddress] = useState("");
  const [searchCounty, setSearchCounty] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [activeQueryId, setActiveQueryId] = useState(null);

  const queryClient = useQueryClient();

  const { data: recentQueries = [] } = useQuery({
    queryKey: ["standalone-queries"],
    queryFn: () => base44.entities.PeopleFinderQuery.filter({ case_id: null }, "-created_date", 20),
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["standalone-candidates", activeQueryId],
    queryFn: () => base44.entities.MatchCandidate.filter({ query_id: activeQueryId }, "-match_score"),
    enabled: !!activeQueryId,
  });

  const runSearch = async (mode) => {
    setIsRunning(true);

    const query = await base44.entities.PeopleFinderQuery.create({
      input_name: searchName,
      input_address: searchAddress,
      input_county: searchCounty,
      run_type: mode,
      status: "running",
    });

    setActiveQueryId(query.id);

    const { data } = await base44.functions.invoke("runPeopleFinder", {
      query_id: query.id,
      name: searchName,
      address: searchAddress,
      county: searchCounty,
      mode,
    });

    await base44.entities.PeopleFinderQuery.update(query.id, {
      status: "completed",
      completed_at: new Date().toISOString(),
      candidates_found: data.candidates?.length || 0,
      result_summary: data.summary,
    });

    queryClient.invalidateQueries({ queryKey: ["standalone-queries"] });
    queryClient.invalidateQueries({ queryKey: ["standalone-candidates", query.id] });
    setIsRunning(false);
  };

  const createPersonFromCandidate = async (candidate) => {
    const person = await base44.entities.Person.create({
      full_name: candidate.candidate_name,
      first_name: candidate.raw_source_data?.first_name,
      last_name: candidate.raw_source_data?.last_name,
    });

    // Create contacts
    for (const phone of candidate.candidate_phones || []) {
      await base44.entities.ContactPoint.create({
        person_id: person.id,
        type: "phone",
        value: phone,
        confidence: candidate.confidence_level,
        source_type: "people_finder_internal",
      });
    }

    for (const email of candidate.candidate_emails || []) {
      await base44.entities.ContactPoint.create({
        person_id: person.id,
        type: "email",
        value: email,
        confidence: candidate.confidence_level,
        source_type: "people_finder_internal",
      });
    }

    alert(`Person created: ${person.full_name}`);
    queryClient.invalidateQueries();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
          <Users className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">People Finder</h1>
          <p className="text-slate-500">Standalone research tool for identity verification</p>
        </div>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search for Person</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label>Address (optional)</Label>
              <Input
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="123 Main St, City, State"
              />
            </div>
            <div>
              <Label>County (optional)</Label>
              <Input
                value={searchCounty}
                onChange={(e) => setSearchCounty(e.target.value)}
                placeholder="County name"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => runSearch("internal_only")}
              disabled={isRunning || !searchName}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Run Internal Search
            </Button>
            <Button
              onClick={() => runSearch("internal_plus_scrape")}
              disabled={isRunning || !searchName}
              variant="outline"
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              Internal + Public Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {activeQueryId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Search Results</CardTitle>
          </CardHeader>
          <CardContent>
            {candidates.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No candidates found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.map((candidate) => {
                      const ConfIcon = confidenceIcons[candidate.confidence_level];
                      return (
                        <TableRow key={candidate.id}>
                          <TableCell>
                            <Badge className={`${confidenceColors[candidate.confidence_level]} border gap-1`}>
                              <ConfIcon className="w-3 h-3" />
                              {candidate.confidence_level.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {candidate.candidate_name}
                          </TableCell>
                          <TableCell className="text-slate-600 text-sm">
                            {candidate.candidate_phones?.[0] || "—"}
                          </TableCell>
                          <TableCell className="text-slate-600 text-sm">
                            {candidate.candidate_emails?.[0] || "—"}
                          </TableCell>
                          <TableCell className="text-slate-600 text-sm max-w-xs truncate">
                            {candidate.candidate_addresses?.[0] || "—"}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold">{candidate.match_score}</span>
                            <span className="text-slate-400 text-sm">/100</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedCandidate(candidate)}
                              >
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-emerald-600"
                                onClick={() => createPersonFromCandidate(candidate)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Searches */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Searches</CardTitle>
        </CardHeader>
        <CardContent>
          {recentQueries.length === 0 ? (
            <p className="text-center text-slate-500 py-4">No recent searches</p>
          ) : (
            <div className="space-y-2">
              {recentQueries.map((query) => (
                <div
                  key={query.id}
                  className={`p-3 border rounded-lg cursor-pointer hover:bg-slate-50 ${
                    activeQueryId === query.id ? "bg-blue-50 border-blue-300" : ""
                  }`}
                  onClick={() => setActiveQueryId(query.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{query.input_name}</p>
                      <p className="text-xs text-slate-500">
                        {query.input_address || "No address"} • {query.input_county || "No county"}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="text-xs">
                        {query.candidates_found || 0} found
                      </Badge>
                      <p className="text-xs text-slate-400 mt-1">
                        {query.completed_at 
                          ? new Date(query.completed_at).toLocaleDateString()
                          : "Running..."
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Candidate Detail Dialog */}
      <Dialog open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Candidate Details</DialogTitle>
          </DialogHeader>
          {selectedCandidate && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Badge className={`${confidenceColors[selectedCandidate.confidence_level]} border text-lg px-4 py-2`}>
                  {selectedCandidate.confidence_level.toUpperCase()}
                </Badge>
                <div>
                  <p className="font-semibold text-lg">{selectedCandidate.candidate_name}</p>
                  <p className="text-sm text-slate-500">Match Score: {selectedCandidate.match_score}/100</p>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Match Reasons</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedCandidate.reason_codes?.map((code) => (
                    <Badge key={code} variant="secondary">
                      {code.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Phones
                  </Label>
                  <div className="space-y-2">
                    {selectedCandidate.candidate_phones?.length > 0 ? (
                      selectedCandidate.candidate_phones.map((phone, i) => (
                        <div key={i} className="p-2 bg-slate-50 rounded text-sm">
                          {phone}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">None found</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Emails
                  </Label>
                  <div className="space-y-2">
                    {selectedCandidate.candidate_emails?.length > 0 ? (
                      selectedCandidate.candidate_emails.map((email, i) => (
                        <div key={i} className="p-2 bg-slate-50 rounded text-sm">
                          {email}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">None found</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label className="mb-2 block flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Addresses
                </Label>
                <div className="space-y-2">
                  {selectedCandidate.candidate_addresses?.length > 0 ? (
                    selectedCandidate.candidate_addresses.map((addr, i) => (
                      <div key={i} className="p-2 bg-slate-50 rounded text-sm">
                        {addr}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">None found</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    createPersonFromCandidate(selectedCandidate);
                    setSelectedCandidate(null);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Person Record
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}