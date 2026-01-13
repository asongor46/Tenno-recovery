export const EMAIL_TEMPLATES = {
  
  // ============================================
  // PORTAL TEMPLATES
  // ============================================
  
  portal_invitation: {
    id: 'portal_invitation',
    name: 'Portal Invitation - Initial',
    category: 'portal',
    subject: '{{first_name}}, claim your {{surplus_amount}} in surplus funds',
    body_text: `Hi {{first_name}},

Great news! We've confirmed that {{surplus_amount}} in surplus funds from your property at {{property_address}} is waiting to be claimed.

Your secure claim portal is ready. Here's how to access it:

PORTAL LINK: {{portal_link}}
ACCESS CODE: {{access_code}}

What you'll do in the portal:
✓ Review and sign the service agreement (digital signature - no notary needed for this)
✓ Upload a photo of your ID
✓ Confirm your information

This takes about 5-10 minutes.

YOUR ESTIMATED PAYOUT:
Surplus Amount: {{surplus_amount}}
Service Fee ({{fee_percent}}%): {{fee_amount}}
You Keep: {{net_amount}}

Remember: No upfront cost. We only get paid when you get paid.

Questions? Just reply to this email or call me at {{agent_phone}}.

Best,
{{agent_name}}
TENNO Recovery`,
    body_html: null
  },
  
  portal_invitation_after_call: {
    id: 'portal_invitation_after_call',
    name: 'Portal Invitation - After Phone Call',
    category: 'portal',
    subject: 'Your surplus claim portal is ready - {{surplus_amount}} waiting',
    body_text: `Hi {{first_name}},

Great speaking with you! As promised, here's your secure claim portal:

PORTAL LINK: {{portal_link}}
ACCESS CODE: {{access_code}}

Quick recap of what we discussed:
• You have {{surplus_amount}} in surplus funds from {{property_address}}
• Our fee is {{fee_percent}}% - you keep {{net_amount}}
• No upfront cost - we only get paid when you do

Next steps in the portal:
1. Review and sign the service agreement
2. Upload a photo of your ID
3. Confirm your information

The whole process takes about 5-10 minutes.

I'm here if you have any questions!

{{agent_name}}
{{agent_phone}}`,
    body_html: null
  },
  
  // ============================================
  // COLD OUTREACH TEMPLATES
  // ============================================
  
  cold_outreach_initial: {
    id: 'cold_outreach_initial',
    name: 'Cold Outreach - Initial Contact',
    category: 'outreach',
    subject: '{{first_name}}, you may have {{surplus_amount}} waiting',
    body_text: `Hi {{first_name}},

I'm reaching out because you may be owed {{surplus_amount}} in surplus funds from the tax sale of your property at {{property_address}}.

These funds are currently being held by {{county}} County and legally belong to you.

I specialize in helping property owners recover these funds. Here's how it works:
• No upfront cost - I only get paid if you get paid
• I handle all the paperwork and county filing
• You keep the majority of the funds

The deadline to claim is approaching, so time is important.

Would you be open to a quick 5-minute call to discuss? You can reach me at {{agent_phone}} or simply reply to this email.

Best regards,
{{agent_name}}
TENNO Recovery
{{agent_phone}}`,
    body_html: null
  },
  
  cold_outreach_follow_up: {
    id: 'cold_outreach_follow_up',
    name: 'Cold Outreach - Follow Up',
    category: 'outreach',
    subject: 'Re: Your {{surplus_amount}} surplus funds from {{county}} County',
    body_text: `Hi {{first_name}},

I wanted to follow up on my previous message about the {{surplus_amount}} in surplus funds owed to you from {{property_address}}.

I know this might sound too good to be true, but I assure you it's legitimate. After a tax sale, any amount paid above what was owed belongs to the former property owner - that's you.

These funds are sitting with {{county}} County right now, and they won't come looking for you. If left unclaimed, the county eventually keeps them.

I'm happy to:
• Verify the exact amount available
• Explain the process in detail
• Answer any questions you have

No obligation. Just reply or call me at {{agent_phone}}.

{{agent_name}}
TENNO Recovery`,
    body_html: null
  },
  
  // ============================================
  // STATUS UPDATE TEMPLATES
  // ============================================
  
  agreement_signed: {
    id: 'agreement_signed',
    name: 'Confirmation - Agreement Signed',
    category: 'status',
    subject: 'Agreement signed ✓ - Next step: Upload your ID',
    body_text: `Hi {{first_name}},

Your service agreement has been signed and recorded. Thank you!

Agreement Summary:
• Property: {{property_address}}
• Surplus Amount: {{surplus_amount}}
• Service Fee: {{fee_percent}}%
• Your Net (estimated): {{net_amount}}

NEXT STEP: Upload your ID
Return to your portal to upload photos of your ID (front and back). This takes about 2 minutes.

{{portal_link}}

{{agent_name}}
{{agent_phone}}`,
    body_html: null
  },
  
  notary_instructions: {
    id: 'notary_instructions',
    name: 'Notary Instructions',
    category: 'status',
    subject: 'Action needed: Get your documents notarized',
    body_text: `Hi {{first_name}},

Your information has been received - thank you! There's one final step before we can file your claim.

ACTION REQUIRED: Notarization
{{county}} County requires your claim documents to be notarized. This is a legal requirement.

Here's what to do:
1. Log into your portal: {{portal_link}}
2. Download your claim packet
3. Print the documents (do NOT sign yet!)
4. Take them to a notary (banks often have free notaries for customers)
5. Sign IN FRONT of the notary
6. Upload photos of the notarized pages

Where to find a notary:
• Your bank (often free!)
• UPS Store
• FedEx Office
• AAA

Time needed: About 15-30 minutes
Cost: $0-25 (free at many banks)

Questions? Call me at {{agent_phone}} and I'll walk you through it.

{{agent_name}}`,
    body_html: null
  },
  
  claim_filed: {
    id: 'claim_filed',
    name: 'Confirmation - Claim Filed',
    category: 'status',
    subject: 'Your claim has been filed with {{county}} County',
    body_text: `Hi {{first_name}},

Great news! Your surplus funds claim has been officially filed with {{county}} County.

Filing Details:
• Claim Amount: {{surplus_amount}}
• Filed On: {{current_date}}
• County: {{county}}, {{state}}

What happens next:
1. The county will review your claim
2. If approved, they'll process your payment
3. You'll receive a check in the mail
4. You pay our service fee from the funds received

Expected timeline: Typically 30-90 days, depending on the county.

You don't need to do anything else! I'll handle all communication with the county and update you when there's news.

Track your status anytime: {{portal_link}}

{{agent_name}}
{{agent_phone}}`,
    body_html: null
  },
  
  payment_approved: {
    id: 'payment_approved',
    name: 'Great News - Payment Approved',
    category: 'status',
    subject: '🎉 Your surplus claim was APPROVED!',
    body_text: `Hi {{first_name}},

CONGRATULATIONS! Your surplus funds claim has been approved!

{{county}} County is processing your payment now. You should receive a check for {{surplus_amount}} within the next 2-4 weeks.

What to do when you receive the check:
1. Deposit it in your bank account
2. I'll send you our invoice for the service fee ({{fee_amount}})
3. You keep the remaining {{net_amount}}!

This is the moment we've been working toward. I'm so glad we could help you recover these funds!

{{agent_name}}
{{agent_phone}}`,
    body_html: null
  }
};

// Get templates by category
export function getTemplatesByCategory(category) {
  return Object.values(EMAIL_TEMPLATES).filter(t => t.category === category);
}

// Get template by ID
export function getTemplateById(id) {
  return EMAIL_TEMPLATES[id] || null;
}