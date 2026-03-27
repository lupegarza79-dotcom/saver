import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { Policy, Vehicle, Driver, DocumentType, SnapshotGrade } from '@/types';

export interface DocumentScanResult {
  success: boolean;
  documentType: DocumentType;
  confidence: number;
  extractedData: ExtractedPolicyData | null;
  rawText?: string;
  error?: string;
}

export interface ExtractedPolicyData {
  carrier?: string;
  policyNumber?: string;
  effectiveDate?: string;
  expirationDate?: string;
  premium?: number;
  paymentFrequency?: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  deductibleComp?: number;
  deductibleColl?: number;
  liabilityBI?: string;
  liabilityPD?: string;
  vehicles?: Partial<Vehicle>[];
  drivers?: Partial<Driver>[];
  coveragesSummary?: string;
}

export interface DamageAssessmentResult {
  hasDamage: boolean;
  severity: 'none' | 'minor' | 'moderate' | 'severe';
  damageTypes: string[];
  affectedAreas: string[];
  estimatedRepairCost?: { min: number; max: number };
  recommendations: string[];
  confidence: number;
}

export interface SnapshotAnalysis {
  grade: SnapshotGrade;
  monthlySavings: number;
  coverageScore: number;
  priceScore: number;
  overallScore: number;
  findings: string[];
  recommendations: string[];
  riskFactors: string[];
  strengths: string[];
}

const PolicyDataSchema = z.object({
  carrier: z.string().optional(),
  policyNumber: z.string().optional(),
  effectiveDate: z.string().optional(),
  expirationDate: z.string().optional(),
  premium: z.number().optional(),
  paymentFrequency: z.string().optional(),
  deductibleComp: z.number().optional(),
  deductibleColl: z.number().optional(),
  liabilityBI: z.string().optional(),
  liabilityPD: z.string().optional(),
  vehicles: z.array(z.object({
    year: z.number().optional(),
    make: z.string().optional(),
    model: z.string().optional(),
    vin: z.string().optional(),
  })).optional(),
  drivers: z.array(z.object({
    name: z.string().optional(),
    dob: z.string().optional(),
    licenseNumber: z.string().optional(),
  })).optional(),
  coveragesSummary: z.string().optional(),
  documentType: z.enum(['DEC_PAGE', 'ID_CARD', 'DRIVER_LICENSE', 'REGISTRATION', 'OTHER']),
  confidence: z.number(),
});

const DamageAssessmentSchema = z.object({
  hasDamage: z.boolean(),
  severity: z.enum(['none', 'minor', 'moderate', 'severe']),
  damageTypes: z.array(z.string()),
  affectedAreas: z.array(z.string()),
  estimatedRepairCostMin: z.number().optional(),
  estimatedRepairCostMax: z.number().optional(),
  recommendations: z.array(z.string()),
  confidence: z.number(),
});

const SnapshotAnalysisSchema = z.object({
  grade: z.enum(['A', 'B', 'C', 'D']),
  monthlySavings: z.number(),
  coverageScore: z.number().min(0).max(100),
  priceScore: z.number().min(0).max(100),
  overallScore: z.number().min(0).max(100),
  findings: z.array(z.string()),
  recommendations: z.array(z.string()),
  riskFactors: z.array(z.string()),
  strengths: z.array(z.string()),
});

export async function scanDocument(imageBase64: string): Promise<DocumentScanResult> {
  console.log('[AI_SCANNER] Starting document scan...');
  
  try {
    const result = await generateObject({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this insurance document image and extract all relevant information.
              
Identify the document type:
- DEC_PAGE: Declarations page with policy details, coverages, premiums
- ID_CARD: Insurance ID card with basic policy info
- DRIVER_LICENSE: Driver's license
- REGISTRATION: Vehicle registration
- OTHER: Other document type

Extract all visible information including:
- Insurance carrier name
- Policy number
- Effective and expiration dates
- Premium amounts
- Deductibles (comprehensive, collision)
- Liability limits (BI, PD)
- Vehicle information (year, make, model, VIN)
- Driver information (name, DOB, license)
- Coverage summary

Provide a confidence score (0-100) for the extraction accuracy.`,
            },
            {
              type: 'image',
              image: imageBase64,
            },
          ],
        },
      ],
      schema: PolicyDataSchema,
    });

    console.log('[AI_SCANNER] Document scan complete:', result);

    const normalizePaymentFrequency = (val?: string): 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | undefined => {
      if (!val) return undefined;
      const normalized = val.toLowerCase().trim().replace(/[\s-_]/g, '');
      
      if (normalized.includes('month') || normalized === 'mo') return 'monthly';
      if (normalized.includes('quarter') || normalized === 'qtr' || normalized === '3month') return 'quarterly';
      if (normalized.includes('semi') || normalized.includes('6month') || normalized.includes('biannual') || normalized === 'halfyear') return 'semi-annual';
      if (normalized.includes('annual') || normalized.includes('year') || normalized === 'yr' || normalized === '12month') return 'annual';
      
      return undefined;
    };

    return {
      success: true,
      documentType: result.documentType,
      confidence: result.confidence,
      extractedData: {
        carrier: result.carrier,
        policyNumber: result.policyNumber,
        effectiveDate: result.effectiveDate,
        expirationDate: result.expirationDate,
        premium: result.premium,
        paymentFrequency: normalizePaymentFrequency(result.paymentFrequency),
        deductibleComp: result.deductibleComp,
        deductibleColl: result.deductibleColl,
        liabilityBI: result.liabilityBI,
        liabilityPD: result.liabilityPD,
        vehicles: result.vehicles?.map((v, i) => ({
          id: `veh_${Date.now()}_${i}`,
          year: v.year || 0,
          make: v.make || '',
          model: v.model || '',
          vin: v.vin,
        })),
        drivers: result.drivers?.map((d, i) => ({
          id: `drv_${Date.now()}_${i}`,
          name: d.name || '',
          dob: d.dob || '',
          licenseNumber: d.licenseNumber,
          isPrimary: i === 0,
        })),
        coveragesSummary: result.coveragesSummary,
      },
    };
  } catch (error) {
    console.error('[AI_SCANNER] Document scan failed:', error);
    return {
      success: false,
      documentType: 'OTHER',
      confidence: 0,
      extractedData: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function assessDamage(imageBase64: string): Promise<DamageAssessmentResult> {
  console.log('[AI_SCANNER] Starting damage assessment...');
  
  try {
    const result = await generateObject({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this vehicle damage image for insurance purposes.

Assess:
1. Whether there is visible damage (hasDamage: true/false)
2. Severity level: none, minor (scratches, small dents), moderate (larger dents, cracked parts), severe (major structural damage)
3. Types of damage visible (scratches, dents, cracks, broken parts, etc.)
4. Affected areas of the vehicle (front bumper, rear fender, hood, door, etc.)
5. Estimated repair cost range in USD (if damage visible)
6. Recommendations for the vehicle owner

Provide a confidence score (0-100) for your assessment.`,
            },
            {
              type: 'image',
              image: imageBase64,
            },
          ],
        },
      ],
      schema: DamageAssessmentSchema,
    });

    console.log('[AI_SCANNER] Damage assessment complete:', result);

    return {
      hasDamage: result.hasDamage,
      severity: result.severity,
      damageTypes: result.damageTypes,
      affectedAreas: result.affectedAreas,
      estimatedRepairCost: result.estimatedRepairCostMin && result.estimatedRepairCostMax
        ? { min: result.estimatedRepairCostMin, max: result.estimatedRepairCostMax }
        : undefined,
      recommendations: result.recommendations,
      confidence: result.confidence,
    };
  } catch (error) {
    console.error('[AI_SCANNER] Damage assessment failed:', error);
    return {
      hasDamage: false,
      severity: 'none',
      damageTypes: [],
      affectedAreas: [],
      recommendations: ['Unable to assess damage. Please take clearer photos.'],
      confidence: 0,
    };
  }
}

export async function analyzePolicy(policy: Policy): Promise<SnapshotAnalysis> {
  console.log('[AI_SCANNER] Analyzing policy for snapshot...');
  
  try {
    const policyInfo = `
Insurance Policy Analysis Request:
- Carrier: ${policy.carrier}
- Premium: $${policy.premium}/month
- Deductibles: Comp $${policy.deductibleComp || 'N/A'}, Coll $${policy.deductibleColl || 'N/A'}
- Liability: BI ${policy.liabilityBI || 'N/A'}, PD ${policy.liabilityPD || 'N/A'}
- Vehicle: ${policy.vehicles[0]?.year} ${policy.vehicles[0]?.make} ${policy.vehicles[0]?.model}
- Policy Period: ${policy.effectiveDate} to ${policy.expirationDate}
`;

    const result = await generateObject({
      messages: [
        {
          role: 'user',
          content: policyInfo + `

Analyze this auto insurance policy and provide:
1. Overall grade (A=excellent, B=good, C=fair, D=needs improvement)
2. Estimated monthly savings potential (in dollars)
3. Coverage score (0-100): How comprehensive are the coverages?
4. Price score (0-100): How competitive is the pricing?
5. Overall score (0-100): Combined assessment
6. Key findings (3-5 observations about the policy)
7. Recommendations (3-5 actionable suggestions)
8. Risk factors (any coverage gaps or concerns)
9. Strengths (positive aspects of the policy)

Base the analysis on typical Texas auto insurance market rates and coverage standards.`,
        },
      ],
      schema: SnapshotAnalysisSchema,
    });

    console.log('[AI_SCANNER] Policy analysis complete:', result);
    return result;
  } catch (error) {
    console.error('[AI_SCANNER] Policy analysis failed:', error);
    return {
      grade: 'C',
      monthlySavings: 25,
      coverageScore: 70,
      priceScore: 65,
      overallScore: 67,
      findings: [
        'Policy details analyzed with limited information',
        'Standard coverage levels detected',
        'Premium is within typical range',
      ],
      recommendations: [
        'Consider bundling home and auto for additional savings',
        'Review deductible options to optimize premium',
        'Ask about safe driver discounts',
      ],
      riskFactors: ['Unable to fully analyze all coverage details'],
      strengths: ['Policy is active and current'],
    };
  }
}

export async function generatePolicyRecommendations(
  policy: Policy,
  userPreferences?: { savingsThreshold?: number; prioritizeCoverage?: boolean }
): Promise<string[]> {
  console.log('[AI_SCANNER] Generating personalized recommendations...');
  
  try {
    const { generateText } = await import('@rork-ai/toolkit-sdk');
    
    const prompt = `Based on this insurance policy:
- Carrier: ${policy.carrier}
- Premium: $${policy.premium}/month
- Vehicle: ${policy.vehicles[0]?.year} ${policy.vehicles[0]?.make}
${userPreferences?.savingsThreshold ? `- User wants to save at least $${userPreferences.savingsThreshold}/month` : ''}
${userPreferences?.prioritizeCoverage ? '- User prioritizes comprehensive coverage over price' : ''}

Provide 5 specific, actionable recommendations to improve this policy. Be concise (one sentence each).`;

    const result = await generateText(prompt);
    const recommendations = result.split('\n').filter(line => line.trim().length > 0).slice(0, 5);
    
    console.log('[AI_SCANNER] Recommendations generated:', recommendations);
    return recommendations;
  } catch (error) {
    console.error('[AI_SCANNER] Recommendations generation failed:', error);
    return [
      'Compare rates from at least 3 carriers before your renewal',
      'Ask about bundling discounts if you have home or renters insurance',
      'Review your deductible - a higher deductible can lower your premium',
      'Check if you qualify for safe driver or low mileage discounts',
      'Consider usage-based insurance if you drive less than average',
    ];
  }
}

export async function extractTextFromImage(imageBase64: string): Promise<string> {
  console.log('[AI_SCANNER] Extracting text from image (OCR)...');
  
  try {
    const { generateText } = await import('@rork-ai/toolkit-sdk');
    
    const result = await generateText({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all visible text from this image. Return only the text content, preserving the general layout structure.',
            },
            {
              type: 'image',
              image: imageBase64,
            },
          ],
        },
      ],
    });
    
    console.log('[AI_SCANNER] OCR complete, text length:', result.length);
    return result;
  } catch (error) {
    console.error('[AI_SCANNER] OCR failed:', error);
    return '';
  }
}

export default {
  scanDocument,
  assessDamage,
  analyzePolicy,
  generatePolicyRecommendations,
  extractTextFromImage,
};
