import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

export default function InviteAgentDialog({ open, onOpenChange, onSuccess }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [plan, setPlan] = useState("starter");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const existing = await base44.entities.AgentProfile.filter({ email: email.toLowerCase().trim() });

      if (existing[0]) {
        await base44.entities.AgentProfile.update(existing[0].id, {
          plan,
          plan_status: "active",
        });
      } else {
        await base44.entities.AgentProfile.create({
          user_id: "pending",
          email: email.toLowerCase().trim(),
          full_name: fullName.trim(),
          plan,
          plan_status: "active",
          onboarding_completed: false,
          status: "approved",
          stripe_customer_id: null,
        });
      }

      const appUrl = window.location.origin;
      toast({
        title: "Agent invited!",
        description: `They can sign up at ${appUrl} using ${email.toLowerCase().trim()}.`,
      });

      setEmail("");
      setFullName("");
      setPlan("starter");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast({ title: "Failed to invite agent: " + err.message, variant: "destructive" });
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Agent (No Payment Required)</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@email.com"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label>Full Name *</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Smith"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label>Plan</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter ($50/mo value)</SelectItem>
                <SelectItem value="pro">Pro ($97/mo value)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-slate-500">
            They'll sign up at your app URL with this email. No Stripe payment needed — access is granted immediately.
          </p>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700" disabled={isSubmitting}>
              {isSubmitting ? "Inviting..." : "Invite Agent"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}