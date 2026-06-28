// 用户问卷输入
export interface UserProfile {
  admissionYear: number
  category: '物理类' | '历史类'
  selectedSubjects: string[]  // 选科组合
  score: number
  rank: number
  preferredCities: string[]
  excludedCities: string[]
  majorInterests: string[]
  excludedMajors: string[]
  priority: 'school' | 'major' | 'balanced'
  careerGoals: CareerGoal[]
  acceptTransfer: boolean
  acceptPrivate: boolean
  acceptSinoForeign: boolean
  maxTuition: number
  acceptSpecialIndustry: boolean
}

export type CareerGoal = 'employment' | 'income' | 'postgraduate' | 'civil_service' | 'stable' | 'interest'

// 推荐层级
export type RecommendationTier = '冲刺' | '偏冲' | '稳妥' | '偏稳' | '保底' | '数据不足'

// 推荐结果
export interface RecommendationResult {
  tier: RecommendationTier
  institution: InstitutionInfo
  group: GroupInfo
  majorDirection: string
  recentScores: YearScore[]
  planCount: number | null
  subjectRequirements: string[]
  reason: string
  riskNotes: string[]
  dataSources: DataSource[]
  verificationStatus: VerificationStatus
  dataCompleteness: number // 0-100
  nextSteps: string[]
}

export interface InstitutionInfo {
  code: string
  name: string
  type: string
  is985: boolean
  is211: boolean
  isDoubleFirst: boolean
  city: string
  province: string
}

export interface GroupInfo {
  code: string
  name: string
}

export interface YearScore {
  year: number
  minimumScore: number | null
  minimumRank: number | null
  planCount: number | null
  category: string
}

export type VerificationStatus = 'verified' | 'single-source' | 'conflict' | '暂无可靠数据'

export interface DataSource {
  name: string
  url: string
  officialTitle: string
  publishedAt: string
  level: 'A' | 'B'
}

// API 请求
export interface QuestionnaireRequest {
  profile: UserProfile
}

export interface RecommendRequest {
  profile: UserProfile
}

export interface ReportRequest {
  profile: UserProfile
  recommendations: RecommendationResult[]
  question?: string
}

export interface AskRequest {
  profile: UserProfile
  recommendations: RecommendationResult[]
  question: string
  history: ChatMessage[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// 推荐引擎规则结果
export interface EngineResult {
  record: {
    id: number
    admissionYear: number
    category: string
    batch: string
    institutionCode: string
    institutionName: string
    groupCode: string
    groupName: string
    majorCode: string
    majorName: string
    subjectRequirements: string
    planCount: number | null
    minimumScore: number | null
    minimumRank: number | null
    sourceLevel: string
    sourceName: string
    sourceUrl: string
    officialTitle: string
    officialPublishedAt: string
    verificationStatus: string
    dataType: string
  }
  institution: {
    type: string
    is985: boolean
    is211: boolean
    isDoubleFirst: boolean
    city: string
    province: string
  } | null
  tier: RecommendationTier
  rankHistory: { year: number; rank: number | null; score: number | null; planCount: number | null }[]
  reason: string
  riskNotes: string[]
}
