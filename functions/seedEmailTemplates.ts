import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const templates = [
      {
        name: 'Initial Outreach',
        subject_template: '${surplus_amount} May Be Owed to You - ${property_address}',
        body_template: `Dear ${'${owner_name}'},\n\nI'm reaching out because ${'${county_name}'} County records show you may be owed ${'${surplus_amount}'} in surplus funds from the sale of your former property.\n\nProperty: ${'${property_address}'}\nSale Date: ${'${sale_date}'}\n\nThese funds are legally yours. I help homeowners recover surplus funds at no upfront cost - I only get paid if you get paid.\n\nTo verify this is legitimate:\n• Call ${'${county_name}'} County Clerk directly\n• Ask about surplus funds for the above property\n\nIf you'd like help claiming your funds, simply reply to this email or call me at ${agent_phone}.\n\nBest regards,\n${agent_name}\n${company_name}\n${agent_phone}\n${agent_email}`,
        category: 'Outreach',
        is_active: true,
        sort_order: 1,
      },
      {
        name: 'Follow-Up 1',
        subject_template: 'Following Up: ${surplus_amount} - ${property_address}',
        body_template: `Dear ${'${owner_name}'},\n\nI wanted to follow up on my previous message regarding ${'${surplus_amount}'} in surplus funds that may be owed to you.\n\nThis money is currently held by ${'${county_name}'} County from the sale of ${'${property_address}'}. It belongs to you, but it won't be sent automatically - you have to claim it.\n\nI handle the entire process at no upfront cost to you.\n\nWould you like to discuss? Just reply to this email or call me at ${agent_phone}.\n\nBest,\n${agent_name}`,
        category: 'Follow-up',
        is_active: true,
        sort_order: 2,
      },
      {
        name: 'Follow-Up 2 - Final Notice',
        subject_template: 'Final Notice: ${surplus_amount} Surplus Funds - ${property_address}',
        body_template: `Dear ${'${owner_name}'},\n\nThis is my final attempt to reach you regarding ${'${surplus_amount}'} in surplus funds from ${'${property_address}'}.\n\nThese funds have a claim deadline. If not claimed, the money may go to the state.\n\nIf you're not interested, no problem - I won't contact you again.\n\nBut if you'd like help recovering YOUR money at no upfront cost, please reply or call ${agent_phone}.\n\nBest,\n${agent_name}`,
        category: 'Follow-up',
        is_active: true,
        sort_order: 3,
      },
      {
        name: 'Portal Link',
        subject_template: 'Action Required: Complete Your Claim for ${surplus_amount}',
        body_template: `Dear ${'${owner_name}'},\n\nThank you for choosing to work with us to recover your ${'${surplus_amount}'} in surplus funds.\n\nTo move forward, please complete our secure online portal:\n\n${'${portal_link}'}\n\nThe portal will guide you through:\n✓ Signing the recovery agreement\n✓ Uploading your ID\n✓ Providing your contact information\n✓ Scheduling notarization (if needed)\n\nThis takes about 10-15 minutes.\n\nQuestions? Reply to this email or call ${agent_phone}.\n\nBest,\n${agent_name}\n${company_name}`,
        category: 'Portal',
        is_active: true,
        sort_order: 4,
      },
      {
        name: 'Status Update - Claim Filed',
        subject_template: 'Your Claim Has Been Filed - ${property_address}',
        body_template: `Dear ${'${owner_name}'},\n\nGreat news! Your surplus fund claim has been officially filed with ${'${county_name}'} County.\n\nWhat happens next:\n• The county will review your claim (typically 30-90 days)\n• We monitor the status and handle any requests\n• Once approved, a check will be issued\n\nYou don't need to do anything right now. I'll keep you updated.\n\nQuestions? Reply anytime.\n\nBest,\n${agent_name}`,
        category: 'Update',
        is_active: true,
        sort_order: 5,
      },
    ];

    const results = [];
    for (const t of templates) {
      const existing = await base44.entities.EmailTemplate.filter({ name: t.name });
      if (existing.length === 0) {
        const created = await base44.entities.EmailTemplate.create(t);
        results.push({ name: t.name, action: 'created', id: created.id });
      } else {
        const updated = await base44.entities.EmailTemplate.update(existing[0].id, t);
        results.push({ name: t.name, action: 'updated', id: updated.id });
      }
    }

    return Response.json({ status: 'ok', results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});