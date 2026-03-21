import React, { useState, useRef } from "react";
import { Search, AlertTriangle, CheckCircle, Mail, ExternalLink, Lock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
];

const SURPLUS_TYPE_LABEL = { tax_sale: "Tax Sale", sheriff_sale: "Sheriff Sale" };

// Simple math CAPTCHA after 3 searches per session
function generateCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { a, b, answer: a + b };
}

export default function PublicSurplusSearch() {
  const [searchName, setSearchName] = useState("");
  const [searchState, setSearchState] = useState("");
  const [results, setResults] = useState(null); // null = not searched, [] = no results
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rateLimited, setRateLimited] = useState(false);

  // Claim form state
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [claimName, setClaimName] = useState("");
  const [claimPhone, setClaimPhone] = useState("");
  const [claimEmail, setClaimEmail] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Notify state
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState(false);

  // CAPTCHA
  const searchCountRef = useRef(0);
  const [captcha, setCaptcha] = useState(null);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchName.trim() || searchName.trim().length < 2) {
      setError("Please enter at least 2 characters.");
      return;
    }

    // CAPTCHA check after 3 searches
    if (searchCountRef.current >= 3) {
      if (!captcha) {
        setCaptcha(generateCaptcha());
        return;
      }
      if (parseInt(captchaInput) !== captcha.answer) {
        setCaptchaError(true);
        return;
      }
      setCaptcha(null);
      setCaptchaInput("");
      setCaptchaError(false);
    }

    setLoading(true);
    setError("");
    setResults(null);
    setShowClaimForm(false);
    setSelectedLead(null);
    setClaimSuccess(false);

    try {
      const res = await base44.functions.invoke("searchPublicLeads", {
        search_name: searchName.trim(),
        search_state: searchState || undefined,
      });

      const data = res.data;
      searchCountRef.current += 1;

      if (data.error) {
        if (res.status === 429) {
          setRateLimited(true);
        } else {
          setError(data.error);
        }
        setLoading(false);
        return;
      }

      setResults(data.results || []);
    } catch (err) {
      if (err?.response?.status === 429) {
        setRateLimited(true);
      } else {
        setError("Search failed. Please try again.");
      }
    }
    setLoading(false);
  };

  const handleClaimClick = (lead) => {
    setSelectedLead(lead);
    setShowClaimForm(true);
    setClaimName("");
    setClaimPhone("");
    setClaimEmail("");
    setConsentGiven(false);
    setTimeout(() => {
      document.getElementById("claim-form-section")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!consentGiven) { setError("Please provide consent to continue."); return; }
    setClaimLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("submitClaimRequest", {
        lead_id: selectedLead.lead_id,
        homeowner_name: claimName,
        homeowner_phone: claimPhone,
        homeowner_email: claimEmail,
        consent_given: true,
        search_name: searchName,
        search_state: searchState,
      });
      if (res.data?.success) {
        setClaimSuccess(true);
        setShowClaimForm(false);
      } else {
        setError(res.data?.error || "Submission failed.");
      }
    } catch (err) {
      setError("Submission failed. Please try again.");
    }
    setClaimLoading(false);
  };

  const handleNotify = async (e) => {
    e.preventDefault();
    if (!notifyEmail) return;
    setNotifyLoading(true);
    try {
      const res = await base44.functions.invoke("submitNotifyRequest", {
        email: notifyEmail,
        search_name: searchName,
        search_state: searchState,
      });
      if (res.data?.success) setNotifySuccess(true);
    } catch {}
    setNotifyLoading(false);
  };

  return (
    <section className="relative bg-gradient-to-b from-slate-950 to-slate-900 py-16 sm:py-24 px-4 border-b border-slate-800">
      <div className="max-w-3xl mx-auto text-center">
        {/* Heading */}
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-1.5 mb-6">
          <Search className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Free Surplus Search</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-bold text-white leading-tight mb-4">
          Check if you're owed<br />
          <span className="text-emerald-400">surplus funds</span>
        </h2>
        <p className="text-slate-400 text-base sm:text-lg mb-10 max-w-xl mx-auto">
          When a property sells at auction for more than what's owed, the extra money belongs to the former owner — you may be owed thousands.
        </p>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto mb-4">
          <Input
            placeholder="Enter your full name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="flex-1 h-12 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 text-base"
          />
          <div className="relative">
            <select
              value={searchState}
              onChange={(e) => setSearchState(e.target.value)}
              className="h-12 bg-slate-800 border border-slate-600 text-slate-300 rounded-md px-3 pr-8 text-sm appearance-none cursor-pointer min-w-[120px]"
            >
              <option value="">All States</option>
              {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <Button type="submit" disabled={loading} className="h-12 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-base">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Search"}
          </Button>
        </form>

        {/* CAPTCHA */}
        {captcha && (
          <div className="mt-4 bg-slate-800 border border-slate-600 rounded-xl p-4 max-w-sm mx-auto">
            <p className="text-sm text-slate-300 mb-3">Quick check: What is {captcha.a} + {captcha.b}?</p>
            <div className="flex gap-2">
              <Input
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                placeholder="Answer"
                className="bg-slate-700 border-slate-600 text-white"
              />
              <Button onClick={handleSearch} className="bg-emerald-600 hover:bg-emerald-500">Confirm</Button>
            </div>
            {captchaError && <p className="text-red-400 text-xs mt-2">Incorrect answer. Try again.</p>}
          </div>
        )}

        <p className="text-xs text-slate-500 mt-3">Free to search. No account required. We search our active surplus database.</p>

        {/* Errors */}
        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm max-w-lg mx-auto">
            {error}
          </div>
        )}

        {/* Rate Limited */}
        {rateLimited && (
          <div className="mt-6 bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 max-w-lg mx-auto text-left">
            <p className="text-orange-400 font-semibold mb-1">Search limit reached.</p>
            <p className="text-slate-400 text-sm">You've reached 5 searches per hour. Try again in an hour, or leave your email and we'll search for you.</p>
          </div>
        )}

        {/* Claim success */}
        {claimSuccess && (
          <div className="mt-8 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 max-w-lg mx-auto">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-white font-bold text-lg mb-1">Request submitted!</h3>
            <p className="text-slate-400 text-sm">A recovery specialist will contact you within 48 hours to help you claim your funds.</p>
          </div>
        )}

        {/* Results */}
        {results !== null && !claimSuccess && (
          <div className="mt-8 text-left">
            {results.length > 0 ? (
              <>
                <p className="text-emerald-400 font-semibold mb-4 text-center">
                  {results.length} potential match{results.length > 1 ? "es" : ""} found
                </p>
                <div className="space-y-3 mb-8">
                  {results.map((lead, i) => (
                    <div
                      key={lead.lead_id || i}
                      className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-bold text-sm">{lead.owner_name_blurred}</p>
                          <Badge className={lead.surplus_type === "tax_sale"
                            ? "bg-emerald-500/20 text-emerald-400 border-0 text-xs"
                            : "bg-blue-500/20 text-blue-400 border-0 text-xs"
                          }>
                            {SURPLUS_TYPE_LABEL[lead.surplus_type] || lead.surplus_type}
                          </Badge>
                        </div>
                        <p className="text-slate-400 text-sm">{lead.county} County, {lead.state}{lead.sale_year ? ` · ${lead.sale_year}` : ""}</p>
                        <p className="text-emerald-400 text-2xl font-bold mt-1">${lead.surplus_amount?.toLocaleString()}</p>
                      </div>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
                        onClick={() => handleClaimClick(lead)}
                      >
                        Get Help Claiming
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Claim form */}
                {showClaimForm && selectedLead && (
                  <div id="claim-form-section" className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6">
                    <h3 className="text-white font-bold text-lg mb-1">Get contacted by a specialist</h3>
                    <p className="text-slate-400 text-sm mb-5">We'll connect you with a licensed surplus recovery agent within 48 hours.</p>
                    <form onSubmit={handleClaimSubmit} className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Your Full Name</label>
                          <Input value={claimName} onChange={(e) => setClaimName(e.target.value)} placeholder="Full name" required className="bg-slate-700 border-slate-600 text-white" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Phone Number</label>
                          <Input value={claimPhone} onChange={(e) => setClaimPhone(e.target.value)} placeholder="(555) 123-4567" required type="tel" className="bg-slate-700 border-slate-600 text-white" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Email Address</label>
                        <Input value={claimEmail} onChange={(e) => setClaimEmail(e.target.value)} placeholder="you@email.com" required type="email" className="bg-slate-700 border-slate-600 text-white" />
                      </div>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={consentGiven}
                          onChange={(e) => setConsentGiven(e.target.checked)}
                          className="mt-1 accent-emerald-500"
                          required
                        />
                        <span className="text-xs text-slate-400 leading-relaxed">
                          I understand I may be entitled to claim these funds directly at no cost. I consent to being contacted by a recovery specialist. A fee may apply for their services.
                        </span>
                      </label>
                      {error && <p className="text-red-400 text-xs">{error}</p>}
                      <Button
                        type="submit"
                        disabled={claimLoading || !consentGiven}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 h-11 text-base font-semibold"
                      >
                        {claimLoading ? "Submitting..." : "Get contacted within 48 hours"}
                      </Button>
                    </form>
                  </div>
                )}
              </>
            ) : (
              /* No results */
              <div className="text-center py-4">
                <p className="text-slate-300 font-medium mb-2">No surplus funds found for that name.</p>
                <p className="text-slate-500 text-sm mb-6">Our database updates regularly. Leave your email to be notified if funds appear.</p>

                {/* Notify form */}
                {!notifySuccess ? (
                  <form onSubmit={handleNotify} className="flex gap-2 max-w-sm mx-auto mb-6">
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      required
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                    <Button type="submit" disabled={notifyLoading} className="bg-emerald-600 hover:bg-emerald-500 shrink-0">
                      <Mail className="w-4 h-4 mr-1" /> Notify me
                    </Button>
                  </form>
                ) : (
                  <p className="text-emerald-400 text-sm mb-6">✓ We'll notify you if surplus funds are found.</p>
                )}

                <p className="text-xs text-slate-500 mb-3">You can also search these free government resources:</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <a href="https://www.missingmoney.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline">
                    <ExternalLink className="w-3 h-3" /> MissingMoney.com
                  </a>
                  <a href="https://www.usa.gov/unclaimed-money" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline">
                    <ExternalLink className="w-3 h-3" /> USA.gov Unclaimed Money
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}