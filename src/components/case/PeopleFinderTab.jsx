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
  Briefcase, // ADDED PHASE 2 for internal connections
  MessageSquare, // ADDED PHASE 3 for text/SMS
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
  high: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low: "bg-slate-700 text-slate-300 border-slate-600",
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
  
  // PHASE 3: Contact attempt logging state
  const [showContactLog, setShowContactLog] = useState(false);
  const [contactLogData, setContactLogData] = useState({
    contact_method: "phone",
    value_used: "",
    attempt_type: "call",
    result: "no_answer",
    notes: "",
  });

  // PHASE 4: Email automation state
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailData, setEmailData] = useState({
    to: "",
    subject: "",
    body: "",
  });

  const queryClient = useQueryClient();

  // Load linked persons
  const { data: personLinks = [] } = useQuery({
    queryKey: ["case-persons", caseId],
    queryFn: () => base44.entities.CasePersonLink.filter({ case_id: caseId }),
    enabled: !!caseId,
  });

  // PHASE 2: Load primary person details
  const primaryPersonLink = personLinks.find(l => l.role === "primary_owner");
  
  const { data: primaryPerson } = useQuery({
    queryKey: ["person", primaryPersonLink?.person_id],
    queryFn: async () => {
      const persons = await base44.entities.Person.filter({ id: primaryPersonLink.person_id });
      return persons[0];
    },
    enabled: !!primaryPersonLink?.person_id,
  });

  // PHASE 2: Load primary person's contacts
  const { data: primaryContacts = [] } = useQuery({
    queryKey: ["contacts", primaryPersonLink?.person_id],
    queryFn: () => base44.entities.ContactPoint.filter({ person_id: primaryPersonLink.person_id }),
    enabled: !!primaryPersonLink?.person_id,
  });

  // PHASE 2: Load primary person's addresses
  const { data: primaryAddresses = [] } = useQuery({
    queryKey: ["addresses", primaryPersonLink?.person_id],
    queryFn: () => base44.entities.Address.filter({ person_id: primaryPersonLink.person_id }),
    enabled: !!primaryPersonLink?.person_id,
  });

  // PHASE 3: Load contact attempts history
  const { data: contactAttempts = [] } = useQuery({
    queryKey: ["contact-attempts", caseId],
    queryFn: () => base44.entities.ContactAttempt.filter({ case_id: caseId }, "-created_date"),
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

  // PHASE 2: Enhanced runSearch to orchestrate identity resolution
  const runSearch = async (mode) => {
    setIsRunning(true);

    try {
      // Step 1: Resolve case owner identity first
      const { data: identityResult } = await base44.functions.invoke("resolveCaseOwnerIdentity", {
        case_id: caseId,
      });

      // Step 2: If person resolved, find existing data
      if (identityResult.status === "success" && identityResult.person_id) {
        await base44.functions.invoke("findExistingPersonData", {
          person_id: identityResult.person_id,
          city: caseData.city,
          state: caseData.state,
          zip: caseData.zip,
        });
      }

      // Step 3: Run people finder search (external if requested)
      const query = await base44.entities.PeopleFinderQuery.create({
        case_id: caseId,
        input_name: searchName,
        input_address: searchAddress,
        input_county: caseData.county,
        run_type: mode,
        status: "running",
      });

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

      // Refresh all related queries
      queryClient.invalidateQueries({ queryKey: ["people-queries", caseId] });
      queryClient.invalidateQueries({ queryKey: ["match-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["case-persons", caseId] });
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
      
    } catch (error) {
      alert(`Search failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
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

  // PHASE 3: Log contact attempt
  const logContactAttempt = async () => {
    if (!contactLogData.value_used) {
      alert("Please select a phone/email to log");
      return;
    }

    await base44.entities.ContactAttempt.create({
      case_id: caseId,
      person_id: primaryPersonLink?.person_id,
      contact_method: contactLogData.contact_method,
      value_used: contactLogData.value_used,
      attempt_type: contactLogData.attempt_type,
      result: contactLogData.result,
      notes: contactLogData.notes,
      performed_by: (await base44.auth.me()).email,
    });

    // Log to activity log
    await base44.entities.ActivityLog.create({
      case_id: caseId,
      action: "contact_attempt",
      description: `${contactLogData.attempt_type} - ${contactLogData.result}`,
      performed_by: (await base44.auth.me()).email,
      metadata: contactLogData,
    });

    // Recalculate confidence
    await base44.functions.invoke("calculateContactConfidence", {
      case_id: caseId,
    });

    // PHASE 4: Trigger workflow automation
    await base44.functions.invoke("automateWorkflowFromContact", {
      case_id: caseId,
      contact_result: contactLogData.result,
    });

    queryClient.invalidateQueries({ queryKey: ["contact-attempts", caseId] });
    queryClient.invalidateQueries({ queryKey: ["case", caseId] });
    queryClient.invalidateQueries({ queryKey: ["todos"] });
    queryClient.invalidateQueries({ queryKey: ["alerts"] });
    
    setShowContactLog(false);
    setContactLogData({
      contact_method: "phone",
      value_used: "",
      attempt_type: "call",
      result: "no_answer",
      notes: "",
    });

    alert("Contact attempt logged and workflow updated");
  };

  // PHASE 4: Send email to owner
  const sendEmailToOwner = async () => {
    if (!emailData.to || !emailData.subject || !emailData.body) {
      alert("Please fill in all email fields");
      return;
    }

    try {
      // Send email via Core integration
      await base44.integrations.Core.SendEmail({
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        from_name: "TENNO Recovery",
      });

      // Log as contact attempt
      await base44.entities.ContactAttempt.create({
        case_id: caseId,
        person_id: primaryPersonLink?.person_id,
        contact_method: "email",
        value_used: emailData.to,
        attempt_type: "email",
        result: "email_sent",
        notes: `Subject: ${emailData.subject}`,
        performed_by: (await base44.auth.me()).email,
      });

      // Log to activity
      await base44.entities.ActivityLog.create({
        case_id: caseId,
        action: "email_sent",
        description: `Email sent to ${emailData.to}: ${emailData.subject}`,
        performed_by: (await base44.auth.me()).email,
      });

      queryClient.invalidateQueries({ queryKey: ["contact-attempts", caseId] });
      
      setShowEmailDialog(false);
      setEmailData({ to: "", subject: "", body: "" });
      
      alert("Email sent successfully");
    } catch (error) {
      alert(`Failed to send email: ${error.message}`);
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
      {/* PHASE 2 - SECTION B: Core Identity (Primary Person) */}
      {primaryPerson && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Primary Owner Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name breakdown */}
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-slate-600">FIRST NAME</Label>
                <p className="font-semibold text-lg">{primaryPerson.first_name || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-600">MIDDLE</Label>
                <p className="font-semibold text-lg">{primaryPerson.middle_name || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-600">LAST NAME</Label>
                <p className="font-semibold text-lg">{primaryPerson.last_name || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-600">SUFFIX</Label>
                <p className="font-semibold text-lg">{primaryPerson.suffix || "—"}</p>
              </div>
            </div>

            {/* Full name display */}
            <div className="pt-3 border-t">
              <Label className="text-xs text-slate-600">FULL NAME (DISPLAY)</Label>
              <p className="text-2xl font-bold text-emerald-400">{primaryPerson.full_name}</p>
            </div>

            {/* Aliases */}
            {primaryPerson.aliases && primaryPerson.aliases.length > 0 && (
              <div className="pt-3 border-t">
                <Label className="text-xs text-slate-600 mb-2 block">ALTERNATE SPELLINGS / ALIASES</Label>
                <div className="flex flex-wrap gap-2">
                  {primaryPerson.aliases.map((alias, i) => (
                    <Badge key={i} variant="outline" className="text-sm">
                      {alias}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Consolidated contacts by confidence */}
            <div className="pt-3 border-t">
              <Label className="text-xs text-slate-600 mb-3 block">CONTACT INFORMATION</Label>
              <div className="grid md:grid-cols-3 gap-4">
                {/* High confidence */}
                <div>
                  <Badge className="bg-emerald-100 text-emerald-700 mb-2">HIGH CONFIDENCE</Badge>
                  {primaryContacts.filter(c => c.confidence === "high").length > 0 ? (
                    <div className="space-y-2">
                      {primaryContacts.filter(c => c.confidence === "high").map(contact => (
                        <div key={contact.id} className="flex items-center gap-2 text-sm">
                          {contact.type === "phone" && <Phone className="w-3 h-3 text-slate-400" />}
                          {contact.type === "email" && <Mail className="w-3 h-3 text-slate-400" />}
                          <span className="font-mono text-xs">{contact.value}</span>
                          {contact.verified && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">None</p>
                  )}
                </div>

                {/* Medium confidence */}
                <div>
                  <Badge className="bg-amber-100 text-amber-700 mb-2">MEDIUM CONFIDENCE</Badge>
                  {primaryContacts.filter(c => c.confidence === "medium").length > 0 ? (
                    <div className="space-y-2">
                      {primaryContacts.filter(c => c.confidence === "medium").map(contact => (
                        <div key={contact.id} className="flex items-center gap-2 text-sm">
                          {contact.type === "phone" && <Phone className="w-3 h-3 text-slate-400" />}
                          {contact.type === "email" && <Mail className="w-3 h-3 text-slate-400" />}
                          <span className="font-mono text-xs">{contact.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">None</p>
                  )}
                </div>

                {/* Low confidence */}
                <div>
                  <Badge className="bg-slate-100 text-slate-700 mb-2">LOW CONFIDENCE</Badge>
                  {primaryContacts.filter(c => c.confidence === "low").length > 0 ? (
                    <div className="space-y-2">
                      {primaryContacts.filter(c => c.confidence === "low").map(contact => (
                        <div key={contact.id} className="flex items-center gap-2 text-sm">
                          {contact.type === "phone" && <Phone className="w-3 h-3 text-slate-400" />}
                          {contact.type === "email" && <Mail className="w-3 h-3 text-slate-400" />}
                          <span className="font-mono text-xs">{contact.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">None</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PHASE 2 - SECTION C: External Search Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            External Search Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">
            Click to open pre-filled search in a new tab. Review results and manually add any contacts you find.
          </p>
          <div className="grid md:grid-cols-3 gap-3">
            {/* TruePeopleSearch */}
            <a
              href={`https://www.truepeoplesearch.com/results?name=${encodeURIComponent(
                `${primaryPerson?.first_name || caseData.owner_name?.split(' ')[0] || ''} ${primaryPerson?.last_name || caseData.owner_name?.split(' ').slice(-1)[0] || ''}`
              )}&citystatezip=${encodeURIComponent(`${caseData.city || ''} ${caseData.state || ''}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 border-2 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors"
            >
              <ExternalLink className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-semibold text-sm text-blue-400">TruePeopleSearch</p>
                <p className="text-xs text-blue-400/70">Free phone & address lookup</p>
              </div>
            </a>

            {/* FastPeopleSearch */}
            <a
              href={`https://www.fastpeoplesearch.com/name/${encodeURIComponent(
                `${primaryPerson?.first_name || ''}-${primaryPerson?.last_name || ''}`
              )}_${encodeURIComponent(`${caseData.city || ''}-${caseData.state || ''}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 border-2 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors"
            >
              <ExternalLink className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-semibold text-sm text-purple-400">FastPeopleSearch</p>
                <p className="text-xs text-purple-400/70">Alternative free search</p>
              </div>
            </a>

            {/* Google Search */}
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(
                `${primaryPerson?.full_name || caseData.owner_name} ${caseData.city || ''} ${caseData.state || ''}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 border-2 border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <Search className="w-5 h-5 text-slate-600" />
              <div>
                <p className="font-semibold text-sm text-slate-100">Google Search</p>
                <p className="text-xs text-slate-400">General web search</p>
              </div>
            </a>

            {/* Facebook Search */}
            <a
              href={`https://www.facebook.com/search/top?q=${encodeURIComponent(
                `${primaryPerson?.full_name || caseData.owner_name} ${caseData.city || ''} ${caseData.state || ''}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 border-2 border-blue-300 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <ExternalLink className="w-5 h-5 text-blue-700" />
              <div>
                <p className="font-semibold text-sm text-blue-900">Facebook</p>
                <p className="text-xs text-blue-700">Social media search</p>
              </div>
            </a>

            {/* LinkedIn Search */}
            <a
              href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(
                primaryPerson?.full_name || caseData.owner_name
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 border-2 border-blue-400 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <ExternalLink className="w-5 h-5 text-blue-800" />
              <div>
                <p className="font-semibold text-sm text-blue-900">LinkedIn</p>
                <p className="text-xs text-blue-700">Professional network</p>
              </div>
            </a>

            {/* WhitePages Address Lookup */}
            {caseData.property_address && (
              <a
                href={`https://www.whitepages.com/address/${encodeURIComponent(
                  caseData.property_address
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 border-2 border-green-500/30 bg-green-500/10 hover:bg-green-500/20 rounded-lg transition-colors"
              >
                <Home className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-sm text-green-400">WhitePages</p>
                  <p className="text-xs text-green-400/70">Address-based search</p>
                </div>
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SECTION D: Data Extracted from PDFs */}
      <PDFIdentityPanel caseId={caseId} />

      {/* SECTION E: Candidate Matches - ENHANCED */}
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
                      isHighConf ? "border-emerald-500/40 bg-emerald-500/5" :
                         isMediumConf ? "border-amber-500/40 bg-amber-500/5" :
                         "border-slate-600 bg-slate-800/50"
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

      {/* SECTION F: Identity Reasoning & Warnings - NEW */}
      {candidates.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
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
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-red-400">Possible deceased owner</p>
                    <p className="text-xs text-red-400/70 mt-1">
                      Obituary or death record found. May require probate/estate handling.
                    </p>
                  </div>
                </div>
              )}
              
              {candidates.filter(c => c.confidence_level === "high").length > 1 && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-amber-400">Multiple high-confidence matches</p>
                    <p className="text-xs text-amber-400/70 mt-1">
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

      {/* PHASE 2 - Internal Connections (Other Cases) */}
      {primaryPersonLink?.person_id && (
        <InternalConnectionsPanel personId={primaryPersonLink.person_id} currentCaseId={caseId} />
      )}

      {/* PHASE 3 - Communication Panel */}
      {primaryPersonLink?.person_id && (
        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="w-4 h-4 text-purple-600" />
              Communication Panel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* One-click actions */}
            <div>
              <Label className="text-xs text-slate-600 mb-2 block">QUICK ACTIONS</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => setShowContactLog(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Phone className="w-3 h-3 mr-1" />
                  Log Call Attempt
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setContactLogData({ ...contactLogData, attempt_type: "text" });
                    setShowContactLog(true);
                  }}
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Log Text Sent
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setContactLogData({ ...contactLogData, contact_method: "email", attempt_type: "email" });
                    setShowContactLog(true);
                  }}
                >
                  <Mail className="w-3 h-3 mr-1" />
                  Log Email Sent
                </Button>
                {/* PHASE 4: Send Email */}
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    const defaultEmail = primaryContacts.find(c => c.type === "email" && c.confidence === "high")?.value ||
                                        primaryContacts.find(c => c.type === "email")?.value || "";
                    setEmailData({
                      to: defaultEmail,
                      subject: `Regarding Your Surplus Funds - Case ${caseData.case_number}`,
                      body: `Dear ${primaryPerson?.first_name || caseData.owner_name},\n\nI'm reaching out regarding surplus funds from the tax sale of your property at ${caseData.property_address}.\n\nWe've identified that you may be entitled to claim these funds. I'd like to discuss how we can help you recover this money.\n\nPlease let me know a good time to talk.\n\nBest regards,\nTENNO Recovery Team`,
                    });
                    setShowEmailDialog(true);
                  }}
                  disabled={!primaryContacts.some(c => c.type === "email")}
                >
                  <Mail className="w-3 h-3 mr-1" />
                  Send Email
                </Button>
              </div>
            </div>

            {/* Contact Timeline */}
            <div className="pt-4 border-t">
              <Label className="text-xs text-slate-600 mb-3 block">CONTACT TIMELINE</Label>
              {contactAttempts.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  No contact attempts logged yet
                </p>
              ) : (
                <div className="space-y-3">
                  {contactAttempts.slice(0, 10).map((attempt) => (
                    <div key={attempt.id} className="flex items-start gap-3 p-3 bg-white border rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        {attempt.contact_method === "phone" && <Phone className="w-4 h-4 text-purple-600" />}
                        {attempt.contact_method === "email" && <Mail className="w-4 h-4 text-purple-600" />}
                        {attempt.contact_method === "text" && <MessageSquare className="w-4 h-4 text-purple-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold">
                            {attempt.attempt_type.charAt(0).toUpperCase() + attempt.attempt_type.slice(1)} - {attempt.value_used}
                          </p>
                          <span className="text-xs text-slate-500">
                            {new Date(attempt.created_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              attempt.result === "spoke_to_owner" || attempt.result === "owner_interested"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : attempt.result === "wrong_number" || attempt.result === "disconnected"
                                ? "bg-red-50 text-red-700 border-red-300"
                                : "bg-slate-50 text-slate-700"
                            }
                          >
                            {attempt.result.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        {attempt.notes && (
                          <p className="text-xs text-slate-600 mt-1">{attempt.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
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

      {/* PHASE 4 - Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Email to Owner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>To</Label>
              <Input
                type="email"
                value={emailData.to}
                onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                placeholder="owner@example.com"
              />
            </div>

            <div>
              <Label>Subject</Label>
              <Input
                value={emailData.subject}
                onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                placeholder="Email subject..."
              />
            </div>

            <div>
              <Label>Message</Label>
              <textarea
                className="w-full p-3 border rounded-lg min-h-[200px] font-sans text-sm"
                value={emailData.body}
                onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                placeholder="Email body..."
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={sendEmailToOwner} className="flex-1 bg-blue-600 hover:bg-blue-700">
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </Button>
              <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PHASE 3 - Contact Logging Dialog */}
      <Dialog open={showContactLog} onOpenChange={setShowContactLog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Contact Attempt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Contact Method</Label>
              <select
                className="w-full p-2 border rounded"
                value={contactLogData.contact_method}
                onChange={(e) => setContactLogData({ ...contactLogData, contact_method: e.target.value })}
              >
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="text">Text/SMS</option>
              </select>
            </div>

            <div>
              <Label>Phone/Email Used</Label>
              <select
                className="w-full p-2 border rounded"
                value={contactLogData.value_used}
                onChange={(e) => setContactLogData({ ...contactLogData, value_used: e.target.value })}
              >
                <option value="">Select contact...</option>
                {contactLogData.contact_method === "phone" && 
                  primaryContacts.filter(c => c.type === "phone").map(c => (
                    <option key={c.id} value={c.value}>{c.value}</option>
                  ))
                }
                {contactLogData.contact_method === "email" && 
                  primaryContacts.filter(c => c.type === "email").map(c => (
                    <option key={c.id} value={c.value}>{c.value}</option>
                  ))
                }
              </select>
            </div>

            <div>
              <Label>Attempt Type</Label>
              <select
                className="w-full p-2 border rounded"
                value={contactLogData.attempt_type}
                onChange={(e) => setContactLogData({ ...contactLogData, attempt_type: e.target.value })}
              >
                <option value="call">Call</option>
                <option value="text">Text</option>
                <option value="email">Email</option>
                <option value="voicemail">Voicemail</option>
              </select>
            </div>

            <div>
              <Label>Result</Label>
              <select
                className="w-full p-2 border rounded"
                value={contactLogData.result}
                onChange={(e) => setContactLogData({ ...contactLogData, result: e.target.value })}
              >
                <option value="no_answer">No Answer</option>
                <option value="left_voicemail">Left Voicemail</option>
                <option value="spoke_to_owner">Spoke to Owner</option>
                <option value="spoke_to_relative">Spoke to Relative</option>
                <option value="spoke_to_other">Spoke to Other Person</option>
                <option value="wrong_number">Wrong Number</option>
                <option value="disconnected">Disconnected</option>
                <option value="email_sent">Email Sent</option>
                <option value="email_bounced">Email Bounced</option>
                <option value="owner_interested">Owner Interested</option>
                <option value="owner_declined">Owner Declined</option>
                <option value="callback_requested">Callback Requested</option>
              </select>
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Additional details..."
                value={contactLogData.notes}
                onChange={(e) => setContactLogData({ ...contactLogData, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={logContactAttempt} className="flex-1">
                Save Attempt
              </Button>
              <Button variant="outline" onClick={() => setShowContactLog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                        <div key={i} className="p-2 bg-slate-800 rounded text-sm text-slate-300">
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
                        <div key={i} className="p-2 bg-slate-800 rounded text-sm text-slate-300">
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
                    <div key={i} className="p-2 bg-slate-800 rounded text-sm text-slate-300">
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

// PHASE 2: Internal Connections Component
function InternalConnectionsPanel({ personId, currentCaseId }) {
  const { data: allCaseLinks = [] } = useQuery({
    queryKey: ["person-cases", personId],
    queryFn: () => base44.entities.CasePersonLink.filter({ person_id: personId }),
    enabled: !!personId,
  });

  // Filter out current case
  const otherCaseLinks = allCaseLinks.filter(link => link.case_id !== currentCaseId);

  const { data: otherCases = [] } = useQuery({
    queryKey: ["other-cases", personId],
    queryFn: async () => {
      const cases = [];
      for (const link of otherCaseLinks) {
        const caseRecords = await base44.entities.Case.filter({ id: link.case_id });
        if (caseRecords[0]) {
          cases.push(caseRecords[0]);
        }
      }
      return cases;
    },
    enabled: otherCaseLinks.length > 0,
  });

  if (otherCases.length === 0) return null;

  return (
    <Card className="border-blue-500/30 bg-blue-500/5">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-blue-600" />
          Internal Connections
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-blue-400 mb-3">
          This owner appears in <strong>{otherCases.length}</strong> other case(s) in your system:
        </p>
        <div className="space-y-2">
          {otherCases.map(caseItem => (
            <div key={caseItem.id} className="flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="font-semibold text-sm">{caseItem.case_number}</p>
                  <p className="text-xs text-slate-500">
                    {caseItem.county}, {caseItem.state} • ${caseItem.surplus_amount?.toLocaleString() || 'N/A'}
                  </p>
                </div>
              </div>
              <Badge variant="outline">{caseItem.status}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
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
    <div className="p-4 border border-slate-700 rounded-lg bg-slate-800">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/15 rounded-full flex items-center justify-center">
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