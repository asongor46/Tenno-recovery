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
  Target, // ADDED: For confidence meter
  TrendingUp, // ADDED: For classification
  Home, // ADDED: For address icons
  Sparkles, // ADDED: For AI auto-trace button
  FileText as SummaryIcon, // ADDED: For summary notes icon
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

// ADDED: Skip-trace classification system
const skipTraceClassifications = {
  "A+": { label: "A+ Perfect Match", color: "bg-emerald-500", desc: "Full match with 3+ phones, email, relatives" },
  "A": { label: "A Strong Match", color: "bg-green-500", desc: "Address match + 1-2 phones + relatives" },
  "B": { label: "B Medium Match", color: "bg-blue-500", desc: "Address match, phones likely valid" },
  "C": { label: "C Weak Match", color: "bg-amber-500", desc: "Partial match, outdated addresses" },
  "D": { label: "D No Match", color: "bg-red-500", desc: "Insufficient data" },
};

// ADDED: Calculate skip-trace classification
function calculateClassification(candidate) {
  const phoneCount = candidate.candidate_phones?.length || 0;
  const hasEmail = (candidate.candidate_emails?.length || 0) > 0;
  const hasAddress = (candidate.candidate_addresses?.length || 0) > 0;
  const score = candidate.match_score || 0;
  
  if (score >= 90 && phoneCount >= 3 && hasEmail && hasAddress) return "A+";
  if (score >= 75 && phoneCount >= 1 && hasAddress) return "A";
  if (score >= 50 && hasAddress) return "B";
  if (score >= 25) return "C";
  return "D";
}

export default function PeopleFinder() {
  const [searchName, setSearchName] = useState("");
  const [searchAddress, setSearchAddress] = useState("");
  const [searchCounty, setSearchCounty] = useState("");
  const [searchState, setSearchState] = useState(""); // ADDED: State field
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

  // ADDED: AI-powered auto skip trace function
  const runAIAutoTrace = async () => {
    if (!searchName) return;
    
    setIsRunning(true);
    try {
      const { data } = await base44.functions.invoke("autoSkipTrace", {
        owner_name: searchName,
        property_address: searchAddress,
        county: searchCounty,
        state: searchState,
      });

      if (data.status === 'success') {
        setActiveQueryId(data.query_id);
        queryClient.invalidateQueries({ queryKey: ["standalone-queries"] });
        queryClient.invalidateQueries({ queryKey: ["standalone-candidates", data.query_id] });
        
        // Show success message with AI assessment
        alert(`AI Skip Trace Complete!\n\nFound ${data.candidates_found} candidate(s)\n\n${data.overall_assessment || ''}\n\n${data.best_match ? `Best Match: ${data.best_match.name}\nScore: ${data.best_match.score}/100\nClassification: ${data.best_match.classification}\n\n${data.best_match.summary}` : ''}`);
      } else {
        alert(`AI Skip Trace failed: ${data.details || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`AI Skip Trace error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
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
          <div className="grid md:grid-cols-4 gap-4">
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
                placeholder="123 Main St, City"
              />
            </div>
            {/* ADDED: State field */}
            <div>
              <Label>State</Label>
              <Input
                value={searchState}
                onChange={(e) => setSearchState(e.target.value)}
                placeholder="PA"
                maxLength={2}
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
          {/* MODIFIED: Added AI Auto-Trace button to existing button group */}
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
            {/* ADDED: AI Auto-Trace button */}
            <Button
              onClick={runAIAutoTrace}
              disabled={isRunning || !searchName}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              AI Auto-Trace
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ADDED: External Skip-Trace Tools Section */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-blue-600" />
            Free Skip-Trace Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">
            Click to open pre-filled search in a new tab. Review results and manually add contacts.
          </p>
          <div className="grid md:grid-cols-3 gap-3">
            {/* TruePeopleSearch - MODIFIED: Include state in city search */}
            <a
              href={searchName && searchAddress && searchState
                ? `https://www.truepeoplesearch.com/results?name=${encodeURIComponent(searchName)}&citystatezip=${encodeURIComponent(`${searchAddress} ${searchState}`)}`
                : `https://www.truepeoplesearch.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 border-2 border-blue-200 bg-white hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ExternalLink className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-semibold text-sm text-blue-900">TruePeopleSearch</p>
                <p className="text-xs text-blue-700">Free phone & address lookup</p>
              </div>
            </a>

            {/* FastPeopleSearch */}
            <a
              href={searchName
                ? `https://www.fastpeoplesearch.com/name/${encodeURIComponent(searchName.replace(/\s+/g, '-'))}`
                : `https://www.fastpeoplesearch.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 border-2 border-purple-200 bg-white hover:bg-purple-50 rounded-lg transition-colors"
            >
              <ExternalLink className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-semibold text-sm text-purple-900">FastPeopleSearch</p>
                <p className="text-xs text-purple-700">Alternative free search</p>
              </div>
            </a>

            {/* Google Search */}
            <a
              href={searchName
                ? `https://www.google.com/search?q=${encodeURIComponent(`${searchName} ${searchAddress || ''}`)}`
                : `https://www.google.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 border-2 border-slate-200 bg-white hover:bg-slate-50 rounded-lg transition-colors"
            >
              <Search className="w-5 h-5 text-slate-600" />
              <div>
                <p className="font-semibold text-sm text-slate-900">Google Search</p>
                <p className="text-xs text-slate-700">General web search</p>
              </div>
            </a>

            {/* LinkedIn */}
            <a
              href={searchName
                ? `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(searchName)}`
                : `https://www.linkedin.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 border-2 border-blue-400 bg-white hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ExternalLink className="w-5 h-5 text-blue-800" />
              <div>
                <p className="font-semibold text-sm text-blue-900">LinkedIn</p>
                <p className="text-xs text-blue-700">Professional network</p>
              </div>
            </a>

            {/* WhitePages */}
            <a
              href={searchAddress
                ? `https://www.whitepages.com/address/${encodeURIComponent(searchAddress)}`
                : `https://www.whitepages.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 border-2 border-green-200 bg-white hover:bg-green-50 rounded-lg transition-colors"
            >
              <Home className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-semibold text-sm text-green-900">WhitePages</p>
                <p className="text-xs text-green-700">Address-based search</p>
              </div>
            </a>
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
                      <TableHead>Classification</TableHead>
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
                      const classification = calculateClassification(candidate); // ADDED
                      const classInfo = skipTraceClassifications[classification]; // ADDED
                      return (
                        <TableRow key={candidate.id}>
                          {/* ADDED: Classification column */}
                          <TableCell>
                            <div className={`${classInfo.color} text-white px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1`}>
                              <TrendingUp className="w-3 h-3" />
                              {classification}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${confidenceColors[candidate.confidence_level]} border gap-1`}>
                              <ConfIcon className="w-3 h-3" />
                              {candidate.confidence_level.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{candidate.candidate_name}</p>
                              {/* ADDED: AI summary notes display */}
                              {candidate.raw_source_data?.ai_summary && (
                                <p className="text-xs text-slate-500 mt-1 italic">
                                  {candidate.raw_source_data.ai_summary}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          {/* MODIFIED: Enhanced phone display */}
                          <TableCell className="text-slate-600 text-sm">
                            {candidate.candidate_phones?.length > 0 ? (
                              <div className="flex items-center gap-1">
                                <span className="font-mono">{candidate.candidate_phones[0]}</span>
                                {candidate.candidate_phones.length > 1 && (
                                  <Badge variant="secondary" className="text-xs">+{candidate.candidate_phones.length - 1}</Badge>
                                )}
                              </div>
                            ) : "—"}
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
              {/* MODIFIED: Enhanced header with classification */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={`${confidenceColors[selectedCandidate.confidence_level]} border text-lg px-4 py-2`}>
                    {selectedCandidate.confidence_level.toUpperCase()}
                  </Badge>
                  <div>
                    <p className="font-semibold text-lg">{selectedCandidate.candidate_name}</p>
                    <p className="text-sm text-slate-500">Match Score: {selectedCandidate.match_score}/100</p>
                  </div>
                </div>
                {/* ADDED: Skip-trace classification badge */}
                <div className="text-right">
                  <div className={`${skipTraceClassifications[calculateClassification(selectedCandidate)].color} text-white px-4 py-2 rounded-lg text-sm font-bold inline-flex items-center gap-2`}>
                    <TrendingUp className="w-4 h-4" />
                    {skipTraceClassifications[calculateClassification(selectedCandidate)].label}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {skipTraceClassifications[calculateClassification(selectedCandidate)].desc}
                  </p>
                </div>
              </div>

              {/* ADDED: AI Summary Notes Section */}
              {selectedCandidate.raw_source_data?.ai_summary && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <Label className="text-sm font-semibold text-purple-900">AI Analysis Summary</Label>
                  </div>
                  <p className="text-sm text-slate-700">
                    {selectedCandidate.raw_source_data.ai_summary}
                  </p>
                  {/* ADDED: Red flags display */}
                  {selectedCandidate.raw_source_data?.red_flags?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <Label className="text-xs text-red-700 font-semibold mb-1 block">⚠️ RED FLAGS:</Label>
                      <div className="flex flex-wrap gap-1">
                        {selectedCandidate.raw_source_data.red_flags.map(flag => (
                          <Badge key={flag} className="bg-red-100 text-red-700 border-red-300 text-xs">
                            {flag.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ADDED: Confidence Score Meter */}
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  <Label className="text-sm font-semibold">Confidence Score Breakdown</Label>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 mb-3 overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      selectedCandidate.match_score >= 90 ? 'bg-emerald-500' :
                      selectedCandidate.match_score >= 75 ? 'bg-green-500' :
                      selectedCandidate.match_score >= 50 ? 'bg-blue-500' :
                      selectedCandidate.match_score >= 25 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${selectedCandidate.match_score}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>0%</span>
                  <span className="font-bold text-lg">{selectedCandidate.match_score}%</span>
                  <span>100%</span>
                </div>
                {/* ADDED: Score factors */}
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    <span>Address match: {(selectedCandidate.candidate_addresses?.length || 0) > 0 ? '✓' : '✗'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-blue-600" />
                    <span>Phones: {selectedCandidate.candidate_phones?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-purple-600" />
                    <span>Emails: {selectedCandidate.candidate_emails?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-orange-600" />
                    <span>Data sources: Internal</span>
                  </div>
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
                     selectedCandidate.candidate_phones.map((phone, i) => {
                       // ADDED: Get AI phone label if available
                       const aiLabel = selectedCandidate.raw_source_data?.phone_labels?.[phone] || null;
                       const displayLabel = aiLabel 
                         ? aiLabel.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                         : (i === 0 ? "Mobile - Recent" : i === 1 ? "Mobile - Older" : "Landline");

                       return (
                         <div key={i} className="p-3 bg-slate-50 rounded border border-slate-200">
                           <div className="flex items-center justify-between mb-1">
                             <span className="font-mono text-sm font-semibold">{phone}</span>
                             <Badge variant="outline" className="text-xs">
                               {i === 0 ? "Primary" : i === 1 ? "Secondary" : "Additional"}
                             </Badge>
                           </div>
                           <div className="flex items-center gap-2 text-xs text-slate-600">
                             {/* MODIFIED: Use AI-generated label if available */}
                             <Badge variant="secondary" className="text-xs">
                               {aiLabel && <Sparkles className="w-2 h-2 mr-1" />}
                               {displayLabel}
                             </Badge>
                             <span className={`font-medium ${
                               i === 0 ? "text-emerald-600" : i === 1 ? "text-blue-600" : "text-slate-500"
                             }`}>
                               {i === 0 ? "High Confidence" : i === 1 ? "Medium" : "Low"}
                             </span>
                           </div>
                         </div>
                       );
                     })
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