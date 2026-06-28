import { z } from 'zod'

export const userProfileSchema = z.object({
  admissionYear: z.number().int().min(2023).max(2026),
  category: z.enum(['物理类', '历史类']),
  selectedSubjects: z.array(z.string()).min(1),
  score: z.number().int().min(100).max(750),
  rank: z.number().int().positive(),
  preferredCities: z.array(z.string()).default([]),
  excludedCities: z.array(z.string()).default([]),
  majorInterests: z.array(z.string()).default([]),
  excludedMajors: z.array(z.string()).default([]),
  priority: z.enum(['school', 'major', 'balanced']).default('balanced'),
  careerGoals: z.array(z.enum(['employment', 'income', 'postgraduate', 'civil_service', 'stable', 'interest'])).default([]),
  acceptTransfer: z.boolean().default(true),
  acceptPrivate: z.boolean().default(false),
  acceptSinoForeign: z.boolean().default(false),
  maxTuition: z.number().int().min(0).default(20000),
  acceptSpecialIndustry: z.boolean().default(false),
})

export type ValidatedProfile = z.infer<typeof userProfileSchema>

export function validateProfile(data: unknown): { success: boolean; data?: ValidatedProfile; errors?: string[] } {
  const result = userProfileSchema.safeParse(data)
  if (result.success) return { success: true, data: result.data }
  return { success: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) }
}

// 输入净化
export function sanitizeInput(input: string): string {
  return input.replace(/[<>"'&]/g, '').slice(0, 500)
}

// 速率限制
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
export function checkRateLimit(key: string, maxRequests: number = 30, windowMs: number = 60000): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= maxRequests) return false
  entry.count++
  return true
}
