import React, { useState } from "react";
import StripeEmbeddedCheckout from "@/components/stripe/EmbeddedCheckout";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Palette,
  Building2,
  Mail,
  Save,
  Loader2,
  Workflow,
  CreditCard,
  FileText,
  Crown,
  Plus,
  Trash2,
  Edit2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CustomStageEditor from "@/components/workflow/CustomStageEditor";
import RoleGuard from "@/components/rbac/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Settings() {
  const [isSaving, setIsSaving] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showWorkflowEditor, setShowWorkflowEditor] = useState(false);
  const [companySettings, setCompanySettings] = useState({
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    default_fee_percent: 20,
  });
  const queryClient = useQueryClient();

  const { data: agentProfile } = useQuery({
    queryKey: ["agentProfileSettings"],
    queryFn: async () => {
      const u = await base44.auth.me();
      if (!u?.email) return null;
      const profiles = await base44.entities.AgentProfile.filter({ email: u.email });
      return profiles[0] || null;
    },
  });

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: templates = [], refetch: refetchTemplates } = useQuery({
    queryKey: ["myTemplates"],
    queryFn: () => base44.entities.Template.list("-created_date", 50),
  });

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ name: "", category: "email", subject: "", body: "" });

  const saveTemplate = async () => {
    if (!templateForm.name || !templateForm.body) return;
    if (editingTemplate) {
      await base44.entities.Template.update(editingTemplate.id, templateForm);
    } else {
      await base44.entities.Template.create(templateForm);
    }
    refetchTemplates();
    setShowTemplateForm(false);
    setEditingTemplate(null);
    setTemplateForm({ name: "", category: "email", subject: "", body: "" });
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm("Delete this template?")) return;
    await base44.entities.Template.delete(id);
    refetchTemplates();
  };

  const { data: existingSettings } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => base44.entities.AppSettings.list(),
    enabled: user?.role === 'admin',
  });

  React.useEffect(() => {
    if (existingSettings && existingSettings.length > 0) {
      const s = existingSettings[0];
      setCompanySettings({
        company_name: s.company_name || '',
        company_address: s.company_address || '',
        company_phone: s.company_phone || '',
        company_email: s.company_email || '',
        default_fee_percent: s.default_fee_percent || 20,
      });
    }
  }, [existingSettings]);

  const handleCompanySave = async () => {
    setIsSaving(true);
    try {
      if (existingSettings && existingSettings.length > 0) {
        await base44.entities.AppSettings.update(existingSettings[0].id, companySettings);
      } else {
        await base44.entities.AppSettings.create(companySettings);
      }
      queryClient.invalidateQueries({ queryKey: ["appSettings"] });
    } catch (e) {
      console.error("Failed to save company settings:", e);
    }
    setIsSaving(false);
  };

  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
  });

  React.useEffect(() => {
    if (user) {
      setProfile({
        full_name: user.full_name || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    caseUpdates: true,
    paymentNotifications: true,
    weeklyDigest: false,
  });

  const handleProfileSave = async () => {
    setIsSaving(true);
    await base44.auth.updateMe({ full_name: profile.full_name });
    queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {showCheckout && (
        <StripeEmbeddedCheckout
          plan="pro"
          onClose={() => setShowCheckout(false)}
        />
      )}
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center">
          <SettingsIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-slate-500">Manage your account and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" /> Notifications
          </TabsTrigger>
          {user?.role === "admin" && (
            <TabsTrigger value="workflow" className="gap-2">
              <Workflow className="w-4 h-4" /> Workflow
            </TabsTrigger>
          )}
          {user?.role === "admin" && (
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="w-4 h-4" /> Company
            </TabsTrigger>
          )}
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="w-4 h-4" /> Templates
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2">
            <CreditCard className="w-4 h-4" /> Subscription
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6">
          <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Profile Information</CardTitle>
            <CardDescription className="text-slate-400">Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-slate-300" htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300" htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ""}
                disabled
                className="bg-slate-900/50 border-slate-600 text-slate-400"
              />
              <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
            </div>
              <div className="pt-4">
                <Button 
                  onClick={handleProfileSave} 
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Notification Preferences</CardTitle>
              <CardDescription className="text-slate-400">Choose what notifications you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Email Alerts</p>
                  <p className="text-sm text-slate-400">Receive important alerts via email</p>
                </div>
                <Switch
                  checked={notifications.emailAlerts}
                  onCheckedChange={(v) => setNotifications({ ...notifications, emailAlerts: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Case Updates</p>
                  <p className="text-sm text-slate-400">Get notified when cases progress</p>
                </div>
                <Switch
                  checked={notifications.caseUpdates}
                  onCheckedChange={(v) => setNotifications({ ...notifications, caseUpdates: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Payment Notifications</p>
                  <p className="text-sm text-slate-400">Alerts when payments are received</p>
                </div>
                <Switch
                  checked={notifications.paymentNotifications}
                  onCheckedChange={(v) => setNotifications({ ...notifications, paymentNotifications: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Weekly Digest</p>
                  <p className="text-sm text-slate-400">Summary of activity sent weekly</p>
                </div>
                <Switch
                  checked={notifications.weeklyDigest}
                  onCheckedChange={(v) => setNotifications({ ...notifications, weeklyDigest: v })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflow Tab - Admin Only */}
        <TabsContent value="workflow" className="mt-6">
        <RoleGuard allowedRoles={["admin"]}>
          <Card>
            <CardHeader>
              <CardTitle>Custom Workflow Stages</CardTitle>
              <CardDescription>Customize your case workflow stages to match your business process</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Dialog open={showWorkflowEditor} onOpenChange={setShowWorkflowEditor}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Workflow className="w-4 h-4 mr-2" />
                    Edit Workflow Stages
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Customize Workflow Stages</DialogTitle>
                  </DialogHeader>
                  <CustomStageEditor
                    onSave={(stages) => {
                      console.log("Saved stages:", stages);
                      setShowWorkflowEditor(false);
                    }}
                  />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
          </RoleGuard>
        </TabsContent>

        {/* Company Tab - Admin Only */}
        <TabsContent value="company" className="mt-6">
        <RoleGuard allowedRoles={["admin"]}>
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Your business details used in documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Company Name</Label>
                <Input 
                  placeholder="Your Company LLC" 
                  value={companySettings.company_name}
                  onChange={(e) => setCompanySettings({...companySettings, company_name: e.target.value})}
                />
              </div>
              <div>
                <Label>Business Address</Label>
                <Textarea 
                  placeholder="123 Main St, City, State ZIP" 
                  rows={2}
                  value={companySettings.company_address}
                  onChange={(e) => setCompanySettings({...companySettings, company_address: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input 
                    placeholder="(555) 123-4567"
                    value={companySettings.company_phone}
                    onChange={(e) => setCompanySettings({...companySettings, company_phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input 
                    placeholder="contact@yourcompany.com"
                    value={companySettings.company_email}
                    onChange={(e) => setCompanySettings({...companySettings, company_email: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label>Contingency Fee (%)</Label>
                <Input 
                  type="number" 
                  placeholder="20"
                  value={companySettings.default_fee_percent}
                  onChange={(e) => setCompanySettings({...companySettings, default_fee_percent: Number(e.target.value)})}
                />
                <p className="text-xs text-slate-500 mt-1">Default fee percentage for agreements</p>
              </div>
              <div className="pt-4">
                <Button onClick={handleCompanySave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Company Info
                </Button>
              </div>
            </CardContent>
          </Card>
          </RoleGuard>
        </TabsContent>
        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>My Templates</CardTitle>
                <CardDescription>Phone scripts, email drafts, SMS templates</CardDescription>
              </div>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => { setEditingTemplate(null); setTemplateForm({ name: "", category: "email", subject: "", body: "" }); setShowTemplateForm(true); }}
              >
                <Plus className="w-4 h-4 mr-1" /> New Template
              </Button>
            </CardHeader>
            <CardContent>
              {showTemplateForm && (
                <div className="mb-6 p-4 border border-slate-700 rounded-xl bg-slate-800/50 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Name *</Label>
                      <Input value={templateForm.name} onChange={e => setTemplateForm({...templateForm, name: e.target.value})} placeholder="Template name" className="mt-1" />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <select
                        className="w-full mt-1 border border-slate-600 rounded-md px-3 py-2 text-sm bg-slate-700 text-white"
                        value={templateForm.category}
                        onChange={e => setTemplateForm({...templateForm, category: e.target.value})}
                      >
                        <option value="email">Email</option>
                        <option value="phone_script">Phone Script</option>
                        <option value="sms">SMS</option>
                        <option value="voicemail">Voicemail</option>
                        <option value="rebuttal">Rebuttal</option>
                      </select>
                    </div>
                  </div>
                  {templateForm.category === "email" && (
                    <div>
                      <Label>Subject</Label>
                      <Input value={templateForm.subject} onChange={e => setTemplateForm({...templateForm, subject: e.target.value})} placeholder="Email subject" className="mt-1" />
                    </div>
                  )}
                  <div>
                    <Label>Body *</Label>
                    <Textarea value={templateForm.body} onChange={e => setTemplateForm({...templateForm, body: e.target.value})} placeholder="Template content. Use {{owner_name}}, {{county}}, {{surplus_amount}} etc." rows={5} className="mt-1 font-mono text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveTemplate} className="bg-emerald-600 hover:bg-emerald-700"><Save className="w-3 h-3 mr-1" /> Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowTemplateForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {templates.length === 0 ? (
                <p className="text-slate-500 text-center py-6">No templates yet. Create your first one above.</p>
              ) : (
                <div className="divide-y">
                  {templates.map(t => (
                    <div key={t.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">{t.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{t.category.replace(/_/g, " ")}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingTemplate(t); setTemplateForm({ name: t.name, category: t.category, subject: t.subject || "", body: t.body }); setShowTemplateForm(true); }}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteTemplate(t.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="mt-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Subscription</CardTitle>
              <CardDescription className="text-slate-400">Your current plan and billing details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${agentProfile?.plan === "pro" ? "bg-amber-500/20" : "bg-slate-700"}`}>
                  <Crown className={`w-6 h-6 ${agentProfile?.plan === "pro" ? "text-amber-400" : "text-slate-400"}`} />
                </div>
                <div>
                  <p className="font-bold text-lg capitalize text-white">{agentProfile?.plan || "Starter"} Plan</p>
                  <p className="text-slate-400 text-sm">
                    {agentProfile?.plan === "pro" ? "$97/month • Full access to all Pro features" : "$50/month • Core tools included"}
                  </p>
                  {agentProfile?.plan_status && (
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      agentProfile.plan_status === "active" ? "bg-green-500/10 text-green-400" :
                      agentProfile.plan_status === "past_due" ? "bg-red-500/10 text-red-400" :
                      "bg-slate-700 text-slate-400"
                    }`}>
                      {agentProfile.plan_status}
                    </span>
                  )}
                </div>
              </div>

              {agentProfile?.plan !== "pro" && (
                <div className="p-4 border border-amber-500/30 rounded-xl bg-amber-500/10">
                  <p className="font-semibold text-amber-400 mb-1">Upgrade to Pro — $97/month</p>
                  <p className="text-sm text-amber-400/80 mb-3">Unlock Packet Builder, Form Library, File Manager, AI imports, and the Homeowner Portal.</p>
                  <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => {
                    if (window.self !== window.top) { alert("Checkout only works from the published app."); return; }
                    setShowCheckout(true);
                  }}>
                    <Crown className="w-4 h-4 mr-2" /> Upgrade to Pro
                  </Button>
                </div>
              )}

              {agentProfile?.billing_cycle_end && (
                <div>
                  <p className="text-sm text-slate-500">Next billing date</p>
                  <p className="font-semibold">{agentProfile.billing_cycle_end}</p>
                </div>
              )}

              {agentProfile?.stripe_customer_id && (
                <div className="pt-4 border-t flex items-center justify-between">
                  <p className="text-xs text-slate-400">Stripe Customer: {agentProfile.stripe_customer_id}</p>
                  <Button variant="outline" size="sm" onClick={async () => {
                    if (window.self !== window.top) { alert("Billing portal only works from the published app."); return; }
                    try {
                      const res = await base44.functions.invoke("createPortalSession", { returnUrl: window.location.href });
                      if (res.data?.url) window.location.href = res.data.url;
                    } catch (e) { toast.error("Could not open billing portal."); }
                  }}>
                    Manage Subscription
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}