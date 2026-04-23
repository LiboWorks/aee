export function productViabilityPrompt(product: {
  title: string;
  price: number | null;
  currency: string;
  category: string | null;
  budget: number;
  riskLevel: string;
  marketSignals: Record<string, unknown>;
}) {
  return `You are an expert Amazon marketplace analyst. Analyze the following product for viability as a private-label or differentiated product opportunity.

Product Information:
- Title: ${product.title}
- Current Price: ${product.price !== null ? `${product.currency} ${product.price}` : 'Unknown'}
- Category: ${product.category ?? 'Unknown'}
- Seller Budget: ${product.currency} ${product.budget}
- Risk Tolerance: ${product.riskLevel}
- Currency: ${product.currency}
- Additional Product Signals: ${JSON.stringify(product.marketSignals)}

Provide your analysis as JSON with this exact structure:
{
  "viabilityScore": <number 0-100>,
  "marginEstimate": <estimated profit margin as decimal, e.g. 0.35 for 35%>,
  "competitionLevel": "<low|medium|high>",
  "marketSize": "<small|medium|large>",
  "demandTrend": "<declining|stable|growing>",
  "keyRisks": ["<risk1>", "<risk2>"],
  "opportunities": ["<opportunity1>", "<opportunity2>"],
  "reasoning": "<brief explanation>"
}

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`;
}

export function differentiationStrategyPrompt(product: {
  title: string;
  category: string | null;
  viabilityScore: number;
  competitionLevel: string;
  budget: number;
  currency: string;
  riskLevel: string;
  marketSignals: Record<string, unknown>;
}) {
  return `You are an Amazon product strategist. Based on the analysis below, generate a differentiation strategy.

Product: ${product.title}
Category: ${product.category ?? 'Unknown'}
Viability Score: ${product.viabilityScore}/100
Competition: ${product.competitionLevel}
Budget: ${product.currency} ${product.budget}
Risk Level: ${product.riskLevel}
Additional Product Signals: ${JSON.stringify(product.marketSignals)}

Provide your strategy as JSON:
{
  "positioningAngle": "<brief unique positioning statement>",
  "targetAudience": "<specific target customer>",
  "keyDifferentiators": ["<diff1>", "<diff2>", "<diff3>"],
  "bundleIdeas": ["<idea1>", "<idea2>"],
  "brandingDirection": "<brief branding recommendation>",
  "estimatedTimeToMarket": "<X weeks>"
}

Respond ONLY with valid JSON.`;
}

export function pricingStrategyPrompt(product: {
  title: string;
  price: number | null;
  currency: string;
  category: string | null;
  budget: number;
  riskLevel: string;
  marginEstimate: number;
  marketSignals: Record<string, unknown>;
}) {
  return `You are an Amazon pricing expert. Recommend a pricing strategy.

Product: ${product.title}
Current Market Price: ${product.price !== null ? `${product.currency} ${product.price}` : 'Unknown'}
Category: ${product.category ?? 'Unknown'}
Budget: ${product.currency} ${product.budget}
Currency: ${product.currency}
Risk Level: ${product.riskLevel}
Estimated Margin: ${(product.marginEstimate * 100).toFixed(0)}%
Additional Product Signals: ${JSON.stringify(product.marketSignals)}

Provide your pricing strategy as JSON:
{
  "recommendedPrice": <number>,
  "priceRange": { "min": <number>, "max": <number> },
  "pricingModel": "<penetration|competitive|premium|skimming>",
  "launchPrice": <number for initial launch>,
  "targetPrice": <number after establishment>,
  "reasoning": "<brief explanation>"
}

Respond ONLY with valid JSON.`;
}

export function executionPlanPrompt(product: {
  title: string;
  category: string | null;
  budget: number;
  currency: string;
  riskLevel: string;
  differentiationPlan: Record<string, unknown>;
  pricingStrategy: Record<string, unknown>;
  marketSignals: Record<string, unknown>;
}) {
  return `You are an Amazon launch strategist. Create a step-by-step execution plan.

Product: ${product.title}
Category: ${product.category ?? 'Unknown'}
Budget: ${product.currency} ${product.budget}
Risk Level: ${product.riskLevel}
Differentiation: ${JSON.stringify(product.differentiationPlan)}
Pricing: ${JSON.stringify(product.pricingStrategy)}
Additional Product Signals: ${JSON.stringify(product.marketSignals)}

Provide execution plan as JSON:
{
  "phases": [
    {
      "phase": <number>,
      "name": "<phase name>",
      "duration": "<X days/weeks>",
      "tasks": ["<task1>", "<task2>"],
      "budgetAllocation": <percentage as decimal>,
      "successCriteria": "<measurable criteria>"
    }
  ],
  "totalTimeline": "<X weeks>",
  "criticalPath": ["<step1>", "<step2>"],
  "contingencyPlan": "<brief fallback plan>"
}

Respond ONLY with valid JSON.`;
}

export function listingGenerationPrompt(product: {
  title: string;
  category: string | null;
  differentiationPlan: Record<string, unknown>;
  pricingStrategy: Record<string, unknown>;
}) {
  return `You are an expert Amazon listing copywriter. Generate a complete, optimized Amazon listing.

Product: ${product.title}
Category: ${product.category ?? 'Unknown'}
Differentiation: ${JSON.stringify(product.differentiationPlan)}
Pricing: ${JSON.stringify(product.pricingStrategy)}

Generate a listing as JSON:
{
  "title": "<optimized product title, max 200 chars, keyword-rich>",
  "bulletPoints": [
    "<bullet 1 - key benefit>",
    "<bullet 2 - feature>",
    "<bullet 3 - use case>",
    "<bullet 4 - quality/material>",
    "<bullet 5 - guarantee/trust>"
  ],
  "description": "<HTML product description, 2-3 paragraphs, persuasive and keyword-rich>",
  "searchTerms": ["<term1>", "<term2>", "<term3>", "<term4>", "<term5>"],
  "imagePrompts": [
    "<main image: detailed prompt for AI image generation>",
    "<lifestyle image: detailed prompt>",
    "<infographic: detailed prompt>",
    "<comparison: detailed prompt>",
    "<packaging: detailed prompt>"
  ]
}

Respond ONLY with valid JSON.`;
}

export function experimentEvaluationPrompt(experiment: {
  kpiTargets: Record<string, number>;
  results: Array<{ day: number; metrics: Record<string, number> }>;
}) {
  return `You are an Amazon advertising analyst. Evaluate this experiment's performance.

KPI Targets: ${JSON.stringify(experiment.kpiTargets)}
Daily Results: ${JSON.stringify(experiment.results)}

Evaluate and provide:
{
  "overallDecision": "<pass|fail>",
  "kpiResults": {
    "<kpi_name>": { "target": <number>, "actual": <number>, "passed": <boolean> }
  },
  "suggestions": [
    "<optimization suggestion 1>",
    "<optimization suggestion 2>",
    "<optimization suggestion 3>"
  ],
  "reasoning": "<brief explanation of decision>",
  "nextSteps": "<recommended next action>"
}

Respond ONLY with valid JSON.`;
}
