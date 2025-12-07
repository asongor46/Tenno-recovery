import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Search,
  Users,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  User,
  FileText,
  ExternalLink,
  Plus,
  ChevronRight,
  Target, // ADDED for scoring
  AlertTriangle, // ADDED for warnings
  UserCheck, // ADDED for set primary owner
  UserPlus, // ADDED for add contact
  Home, // ADDED for address
  RefreshCw, // ADDED for replace
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
import PDFIdentityPanel from "./PDFIdentityPanel"; // ADDED

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

export default function PeopleFinderTab({ caseId, caseData }) {
  const [searchName, setSearchName] = useState(caseData?.owner_name || "");
  const [searchAddress, setSearchAddress] = useState(caseData?.property_address || "");
  const [searchCounty, setSearchCounty] = useState(caseData?.county || ""); // ADDED
  const [searchCaseNumber, setSearchCaseNumber] = useState(caseData?.case_number || ""); // ADDED
  const [searchParcel, setSearchParcel] = useState(caseData?.parcel_number || ""); // ADDED
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const queryClient = useQueryClient();

  // Load linked persons
  const { data: personLinks = [] } = useQuery({
    queryKey: ["case-persons", caseId],
    queryFn: () => base44.entities.CasePersonLink.filter({ case_id: caseId }),
    enabled: !!caseId,
  });

  // Load candidates from latest query
  const { data: queries = [] } = useQuery({
    queryKey: ["people-queries", caseId],
    queryFn: () => base44.entities.PeopleFinderQuery.filter({ case_id: caseId }, "-created_date"),
    enabled: !!caseId,
  });

  const latestQuery = queries[0];

  const { data: candidates = [] } = useQuery({
    queryKey: ["match-candidates", latestQuery?.id],
    queryFn: () => base44.entities.MatchCandidate.filter({ query_id: latestQuery.id }, "-match_score"),
    enabled: !!latestQuery?.id,
  });

  // REMOVED: PDF panel moved to separate component
  // Will use PDFIdentityPanel component instead

  const runSearch = async (mode) => {
    setIsRunning(true);

    // Create query record
    const query = await base44.entities.PeopleFinderQuery.create({
      case_id: caseId,
      input_name: searchName,
      input_address: searchAddress,
      input_county: caseData.county,
      run_type: mode,
      status: "running",
    });

    // Call backend function to run people finder
    const { data } = await base44.functions.invoke("runPeopleFinder", {
      query_id: query.id,
      name: searchName,
      address: searchAddress,
      county: caseData.county,
      state: caseData.state,
      mode,
    });

    // Update query status
    await base44.entities.PeopleFinderQuery.update(query.id, {
      status: "completed",
      completed_at: new Date().toISOString(),
      candidates_found: data.candidates?.length || 0,
      result_summary: data.summary,
    });

    queryClient.invalidateQueries({ queryKey: ["people-queries", caseId] });
    queryClient.invalidateQueries({ queryKey: ["match-candidates"] });
    setIsRunning(false);
  };

  // ADDED: Set as primary owner action
  const setPrimaryOwner = async (candidate) => {
    await attachPerson(candidate, "primary_owner");
    
    // ADDED: Update case with full identity data
    const updateData = {
      owner_name: candidate.candidate_name,
      owner_confidence: candidate.confidence_level,
    };
    if (candidate.candidate_phones?.[0]) updateData.owner_phone = candidate.candidate_phones[0];
    if (candidate.candidate_emails?.[0]) updateData.owner_email = candidate.candidate_emails[0];
    if (candidate.candidate_addresses?.[0]) updateData.owner_address = candidate.candidate_addresses[0];
    
    await base44.entities.Case.update(caseId, updateData);
    
    // ADDED: Trigger verification update (optional: call verification function)
    queryClient.invalidateQueries({ queryKey: ["case", caseId] });
    alert("Primary owner set successfully");
  };

  // ADDED: Add specific contact to case
  const addContactToCase = async (candidate, contactType) => {
    const updateData = {};
    if (contactType === "phone" && candidate.candidate_phones?.[0]) {
      updateData.owner_phone = candidate.candidate_phones[0];
    } else if (contactType === "email" && candidate.candidate_emails?.[0]) {
      updateData.owner_email = candidate.candidate_emails[0];
    }
    
    if (Object.keys(updateData).length > 0) {
      await base44.entities.Case.update(caseId, updateData);
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
      alert(`${contactType} added to case`);
    }
  };

  // ADDED: Replace mailing address
  const replaceMailingAddress = async (candidate) => {
    if (candidate.candidate_addresses?.[0]) {
      await base44.entities.Case.update(caseId, {
        owner_address: candidate.candidate_addresses[0],
      });
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
      alert("Mailing address updated");
    }
  };

  const attachPerson = async (candidate, role) => {
    // Create or link person
    let personId = candidate.person_id;
    
    if (!personId) {
      const person = await base44.entities.Person.create({
        full_name: candidate.candidate_name,
        first_name: candidate.raw_source_data?.first_name,
        last_name: candidate.raw_source_data?.last_name,
      });
      personId = person.id;

      // Update candidate with person_id
      await base44.entities.MatchCandidate.update(candidate.id, { person_id: personId });
    }

    // Create case-person link
    await base44.entities.CasePersonLink.create({
      case_id: caseId,
      person_id: personId,
      role,
      confidence: candidate.confidence_level,
      source_type: "people_finder",
    });

    // Create contact points
    if (candidate.candidate_phones) {
      for (const phone of candidate.candidate_phones) {
        await base44.entities.ContactPoint.create({
          person_id: personId,
          type: "phone",
          value: phone,
          confidence: candidate.confidence_level,
          source_type: candidate.raw_source_data?.phone_source || "people_finder_internal",
        });
      }
    }

    if (candidate.candidate_emails) {
      for (const email of candidate.candidate_emails) {
        await base44.entities.ContactPoint.create({
          person_id: personId,
          type: "email",
          value: email,
          confidence: candidate.confidence_level,
          source_type: "people_finder_internal",
        });
      }
    }

    queryClient.invalidateQueries({ queryKey: ["case-persons", caseId] });
    queryClient.invalidateQueries({ queryKey: ["case", caseId] });
  };

  return (
    <div className="space-y-6">
      {/* SECTION A: Search Context - ENHANCED */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4" />
            Search Context
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* MODIFIED: Expanded grid with all search fields */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Owner Name *</Label>
              <Input
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Full name..."
              />
            </div>
            <div>
              <Label>Property Address</Label>
              <Input
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="Address..."
              />
            </div>
            <div>
              <Label>County</Label>
              <Input
                value={searchCounty}
                onChange={(e) => setSearchCounty(e.target.value)}
                placeholder="County name..."
              />
            </div>
            {/* ADDED: Case number and parcel fields */}
            <div>
              <Label>Case Number</Label>
              <Input
                value={searchCaseNumber}
                onChange={(e) => setSearchCaseNumber(e.target.value)}
                placeholder="Case #..."
              />
            </div>
            <div>
              <Label>Parcel ID</Label>
              <Input
                value={searchParcel}
                onChange={(e) => setSearchParcel(e.target.value)}
                placeholder="Parcel number..."
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
              Run Full Search (Internal + Web)
            </Button>
          </div>
          {latestQuery && (
            <div className="text-sm text-slate-500 flex items-center justify-between pt-2 border-t">
              <span>
                Last search: {latestQuery.completed_at 
                  ? new Date(latestQuery.completed_at).toLocaleString()
                  : "In progress..."
                }
              </span>
              <Badge variant="secondary">
                {latestQuery.candidates_found || 0} candidates found
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION B: Data Extracted from PDFs */}
      <PDFIdentityPanel caseId={caseId} />

      {/* SECTION C: Candidate Matches - ENHANCED */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4" />
            Match Candidates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Run a search to find owner candidates</p>
              <p className="text-sm text-slate-400 mt-1">
                Search will use PDF data, internal records, and optional web scraping
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* MODIFIED: Card-based candidate display instead of table */}
              {candidates.map((candidate, idx) => {
                const ConfIcon = confidenceIcons[candidate.confidence_level];
                const isHighConf = candidate.confidence_level === "high";
                const isMediumConf = candidate.confidence_level === "medium";
                
                return (
                  <div 
                    key={candidate.id} 
                    className={`border-2 rounded-xl p-5 ${
                      isHighConf ? "border-emerald-300 bg-emerald-50/30" :
                      isMediumConf ? "border-amber-300 bg-amber-50/30" :
                      "border-slate-200 bg-slate-50/30"
                    }`}
                  >
                    {/* ADDED: Header with confidence and score */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          isHighConf ? "bg-emerald-500" :
                          isMediumConf ? "bg-amber-500" :
                          "bg-slate-400"
                        }`}>
                          <ConfIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${confidenceColors[candidate.confidence_level]} border-0 text-sm px-3 py-1`}>
                              {candidate.confidence_level.toUpperCase()} CONFIDENCE
                            </Badge>
                            <span className="text-sm font-semibold text-slate-600">
                              Match #{idx + 1}
                            </span>
                          </div>
                          <p className="font-bold text-lg mt-1">{candidate.candidate_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-slate-500">Match Score:</span>
                            <span className="font-bold text-slate-900">{candidate.match_score}</span>
                            <span className="text-slate-400 text-sm">/100</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ADDED: Match reasons */}
                    {candidate.reason_codes && candidate.reason_codes.length > 0 && (
                      <div className="mb-4">
                        <Label className="text-xs text-slate-600 mb-2 block">REASONS:</Label>
                        <div className="flex flex-wrap gap-2">
                          {candidate.reason_codes.map((code) => (
                            <Badge key={code} variant="secondary" className="text-xs">
                              {code.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ADDED: Contact details grid */}
                    <div className="grid md:grid-cols-3 gap-4 mb-4 text-sm">
                      <div>
                        <Label className="text-xs text-slate-600 mb-1 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> PHONES
                        </Label>
                        {candidate.candidate_phones?.length > 0 ? (
                          <div className="space-y-1">
                            {candidate.candidate_phones.map((phone, i) => (
                              <div key={i} className="text-slate-900 font-mono text-xs">
                                {phone}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">None found</span>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600 mb-1 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> EMAILS
                        </Label>
                        {candidate.candidate_emails?.length > 0 ? (
                          <div className="space-y-1">
                            {candidate.candidate_emails.map((email, i) => (
                              <div key={i} className="text-slate-900 text-xs truncate">
                                {email}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">None found</span>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600 mb-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> ADDRESSES
                        </Label>
                        {candidate.candidate_addresses?.length > 0 ? (
                          <div className="space-y-1">
                            {candidate.candidate_addresses.slice(0, 2).map((addr, i) => (
                              <div key={i} className="text-slate-900 text-xs">
                                {addr}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">None found</span>
                        )}
                      </div>
                    </div>

                    {/* ADDED: Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-3 border-t">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => setPrimaryOwner(candidate)}
                      >
                        <UserCheck className="w-3 h-3 mr-1" />
                        Set as Primary Owner
                      </Button>
                      {candidate.candidate_phones?.[0] && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addContactToCase(candidate, "phone")}
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          Add Phone
                        </Button>
                      )}
                      {candidate.candidate_addresses?.[0] && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => replaceMailingAddress(candidate)}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Replace Mailing Address
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedCandidate(candidate)}
                      >
                        View Full Details
                      </Button>
                      {!isHighConf && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-slate-500"
                          onClick={() => attachPerson(candidate, "other")}
                        >
                          Attach as Relative
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION D: Identity Reasoning & Warnings - NEW */}
      {candidates.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Identity Reasoning & Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* ADDED: Dynamic warnings based on candidates */}
              {candidates.some(c => c.raw_source_data?.deceased_indicator) && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-red-900">Possible deceased owner</p>
                    <p className="text-xs text-red-700 mt-1">
                      Obituary or death record found. May require probate/estate handling.
                    </p>
                  </div>
                </div>
              )}
              
              {candidates.filter(c => c.confidence_level === "high").length > 1 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-amber-900">Multiple high-confidence matches</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Found multiple strong candidates. May indicate co-owners or similar names.
                    </p>
                  </div>
                </div>
              )}
              
              {candidates.some(c => c.candidate_phones?.length === 0 && c.candidate_emails?.length === 0) && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-amber-900">No contact information found</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Unable to locate phone or email. Consider skip tracing or mail-only approach.
                    </p>
                  </div>
                </div>
              )}
              
              {candidates.every(c => c.confidence_level === "low") && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <XCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-amber-900">Low confidence matches only</p>
                    <p className="text-xs text-amber-700 mt-1">
                      All candidates are low confidence. Verify identity before proceeding.
                    </p>
                  </div>
                </div>
              )}
              
              {candidates.length === 0 && latestQuery && (
                <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-slate-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-slate-900">No matches found</p>
                    <p className="text-xs text-slate-700 mt-1">
                      Try running Full Search with web scraping enabled for more results.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked Persons */}
      {personLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Linked Persons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {personLinks.map((link) => (
                <LinkedPersonCard key={link.id} link={link} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Candidate Detail Dialog */}
      <Dialog open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Candidate Details</DialogTitle>
          </DialogHeader>
          {selectedCandidate && (
            <div className="space-y-6">
              {/* Confidence */}
              <div className="flex items-center gap-3">
                <Badge className={`${confidenceColors[selectedCandidate.confidence_level]} border text-lg px-4 py-2`}>
                  {selectedCandidate.confidence_level.toUpperCase()}
                </Badge>
                <div>
                  <p className="font-semibold text-lg">{selectedCandidate.candidate_name}</p>
                  <p className="text-sm text-slate-500">Match Score: {selectedCandidate.match_score}/100</p>
                </div>
              </div>

              {/* Reason Codes */}
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

              {/* Contact Info */}
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

              {/* Addresses */}
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

              {/* Attach Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    attachPerson(selectedCandidate, "primary_owner");
                    setSelectedCandidate(null);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Attach as Primary Owner
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    attachPerson(selectedCandidate, "co_owner");
                    setSelectedCandidate(null);
                  }}
                >
                  Attach as Co-Owner
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LinkedPersonCard({ link }) {
  const { data: person } = useQuery({
    queryKey: ["person", link.person_id],
    queryFn: async () => {
      const persons = await base44.entities.Person.filter({ id: link.person_id });
      return persons[0];
    },
    enabled: !!link.person_id,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", link.person_id],
    queryFn: () => base44.entities.ContactPoint.filter({ person_id: link.person_id }),
    enabled: !!link.person_id,
  });

  if (!person) return null;

  const phones = contacts.filter(c => c.type === "phone");
  const emails = contacts.filter(c => c.type === "email");

  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold">{person.full_name}</p>
            <p className="text-xs text-slate-500 capitalize">{link.role.replace(/_/g, " ")}</p>
          </div>
        </div>
        <Badge className={`${confidenceColors[link.confidence]} border`}>
          {link.confidence.toUpperCase()}
        </Badge>
      </div>
      <div className="space-y-2 text-sm">
        {phones.length > 0 && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600">{phones[0].value}</span>
            {phones.length > 1 && (
              <Badge variant="secondary" className="text-xs">+{phones.length - 1}</Badge>
            )}
          </div>
        )}
        {emails.length > 0 && (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600">{emails[0].value}</span>
          </div>
        )}
      </div>
    </div>
  );
}