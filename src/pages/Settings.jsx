import React, { useState } from "react";
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center">
          <SettingsIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500">Manage your account and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-white border">
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
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-slate-50"
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
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what notifications you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Alerts</p>
                  <p className="text-sm text-slate-500">Receive important alerts via email</p>
                </div>
                <Switch
                  checked={notifications.emailAlerts}
                  onCheckedChange={(v) => setNotifications({ ...notifications, emailAlerts: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Case Updates</p>
                  <p className="text-sm text-slate-500">Get notified when cases progress</p>
                </div>
                <Switch
                  checked={notifications.caseUpdates}
                  onCheckedChange={(v) => setNotifications({ ...notifications, caseUpdates: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Payment Notifications</p>
                  <p className="text-sm text-slate-500">Alerts when payments are received</p>
                </div>
                <Switch
                  checked={notifications.paymentNotifications}
                  onCheckedChange={(v) => setNotifications({ ...notifications, paymentNotifications: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Weekly Digest</p>
                  <p className="text-sm text-slate-500">Summary of activity sent weekly</p>
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
      </Tabs>
    </div>
  );
}