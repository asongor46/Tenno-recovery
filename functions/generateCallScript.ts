import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * GENERATE CALL SCRIPT
 * Auto-generates personalized call scripts based on case data
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { case_id } = await req.json();

    if (!case_id) {
      return Response.json({ 
        status: 'error',
        details: 'case_id required' 
      }, { status: 400 });
    }

    // Fetch case data
    const cases = await base44.entities.Case.filter({ id: case_id });
    const caseData = cases[0];
    
    if (!caseData) {
      return Response.json({ 
        status: 'error',
        details: 'Case not found' 
      }, { status: 404 });
    }

    // Fetch county info for county-specific language
    let countyInfo = null;
    if (caseData.county && caseData.state) {
      const counties = await base44.entities.County.filter({
        name: caseData.county,
        state: caseData.state
      });
      countyInfo = counties[0];
    }

    // Generate call script
    const script = {
      opening: generateOpening(caseData),
      identity_questions: generateIdentityQuestions(caseData),
      pitch: generatePitch(caseData, countyInfo),
      objection_responses: generateObjectionResponses(caseData),
      closing: generateClosing(caseData),
      county_notes: countyInfo?.special_notes || null
    };

    return Response.json({
      status: 'success',
      script
    });

  } catch (error) {
    return Response.json({ 
      status: 'error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});

function generateOpening(caseData) {
  return `Hi, is this ${caseData.owner_name}? 

My name is [YOUR NAME] and I'm calling from TENNO Recovery. 

I'm reaching out because we've identified that you may have surplus funds available from the ${caseData.county} County foreclosure sale of your property at ${caseData.property_address || 'your former property'}.

Do you have a few minutes to discuss this? This is regarding approximately $${caseData.surplus_amount?.toLocaleString() || '[AMOUNT]'} that may be owed to you.`;
}

function generateIdentityQuestions(caseData) {
  return [
    {
      question: `Can you confirm your full legal name for me?`,
      expected_answer: caseData.owner_name,
      purpose: "Identity verification"
    },
    {
      question: `And can you confirm the property address was ${caseData.property_address || '[ADDRESS]'}?`,
      expected_answer: caseData.property_address,
      purpose: "Property ownership confirmation"
    },
    {
      question: `Were you aware that your property was sold at auction on ${caseData.sale_date ? new Date(caseData.sale_date).toLocaleDateString() : '[DATE]'}?`,
      expected_answer: "Yes/No",
      purpose: "Awareness check"
    },
    {
      question: `Have you already filed a claim for these surplus funds?`,
      expected_answer: "No",
      purpose: "Prior filing check"
    },
    {
      question: `Have you been contacted by anyone else about recovering these funds?`,
      expected_answer: "Varies",
      purpose: "Competition check"
    }
  ];
}

function generatePitch(caseData, countyInfo) {
  const claimDeadline = countyInfo?.claim_deadline_days 
    ? `You have ${countyInfo.claim_deadline_days} days from the sale date to file` 
    : 'There is a deadline to file';

  return `Here's the situation: When your property was sold at foreclosure for $${caseData.sale_amount?.toLocaleString() || '[SALE AMOUNT]'}, it sold for more than what was owed. The difference - approximately $${caseData.surplus_amount?.toLocaleString() || '[SURPLUS]'} - is legally yours.

However, ${claimDeadline}, and the process requires specific paperwork, notarization, and filing with ${caseData.county} County.

That's where we come in. We handle all the paperwork, filing, and follow-up at no upfront cost. We only get paid if you get paid - our fee is ${caseData.fee_percentage || 20}% of the recovered funds.

So if we recover the full $${caseData.surplus_amount?.toLocaleString() || '[SURPLUS]'}, you would receive $${((caseData.surplus_amount || 0) * (1 - (caseData.fee_percentage || 20) / 100)).toLocaleString()} and our fee would be $${((caseData.surplus_amount || 0) * ((caseData.fee_percentage || 20) / 100)).toLocaleString()}.

Would you like us to handle this for you?`;
}

function generateObjectionResponses(caseData) {
  return [
    {
      objection: "Is this legit? / Is this a scam?",
      response: `I completely understand your concern. This is 100% legitimate. You can verify the sale yourself by contacting ${caseData.county} County Clerk's office and asking about case number ${caseData.case_number || '[CASE #]'}. The surplus funds are being held by the county right now, and you have a legal right to claim them.`
    },
    {
      objection: "Why do you get 20%?",
      response: `Great question. ${caseData.fee_percentage || 20}% is our fee for handling all the legal paperwork, notarization, filing, and follow-up. The alternative is doing it yourself - which requires knowing the exact forms, deadlines, and procedures for ${caseData.county} County. Many people miss the deadline or file incorrectly and lose their claim entirely. We guarantee the work is done right, and you only pay if you actually receive the money.`
    },
    {
      objection: "Can I do this myself?",
      response: `Absolutely - you have the legal right to file yourself. However, ${caseData.county} County requires specific forms, notarization, and strict deadlines. ${countyInfo?.claim_deadline_days ? `You have ${countyInfo.claim_deadline_days} days from the sale date.` : 'There is a filing deadline.'} If you miss the deadline or file incorrectly, you lose the funds forever. We handle everything and only get paid if you do. It's your choice, but most people prefer the certainty.`
    },
    {
      objection: "I need to think about it",
      response: `I understand. Just be aware that time is critical - ${countyInfo?.claim_deadline_days ? `you only have ${countyInfo.claim_deadline_days} days from the sale date (${caseData.sale_date ? new Date(caseData.sale_date).toLocaleDateString() : '[DATE]'})` : 'there is a filing deadline'} and the paperwork takes time to prepare. Would it help if I emailed you the agreement to review? That way you can read it at your own pace and we can move quickly if you decide to proceed.`
    },
    {
      objection: "How long does this take?",
      response: `Once you sign the agreement and provide your ID, we file the claim within 5-7 business days. The county review process typically takes ${countyInfo?.processing_timeline || '30-90 days'}. We handle all follow-up and keep you updated throughout.`
    },
    {
      objection: "What if the county denies it?",
      response: `If for any reason the county denies the claim or the funds aren't recovered, you owe us nothing. Zero risk to you. We only get paid if you get paid.`
    }
  ];
}

function generateClosing(caseData) {
  return `Great! Here's what happens next:

1. I'll email you the service agreement to review and sign electronically
2. You'll upload a photo of your ID (front and back)
3. We'll prepare all the paperwork and get it notarized
4. We'll file with ${caseData.county} County and handle all follow-up
5. Once approved, the county sends payment and we distribute your portion

The whole process on your end takes about 10 minutes. Can I get your best email address to send the agreement?

[IF EMAIL PROVIDED]: Perfect, you'll see an email from TENNO Recovery within the next few minutes. The link is unique to your case and secure. Any questions before I let you go?`;
}