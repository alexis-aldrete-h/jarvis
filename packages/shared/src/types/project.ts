export type ProjectStage = 'short-term' | 'medium-term' | 'long-term'
export type ProjectStatus = 'not-started' | 'in-progress' | 'on-hold' | 'completed'

export type LifeCategory = 
  | 'health'
  | 'relationships'
  | 'financial'
  | 'professional'
  | 'fun'

export type HealthSubcategory = 'physical' | 'mental' | 'spiritual'
export type RelationshipsSubcategory = 'myself' | 'wife' | 'family' | 'friends'
export type FinancialSubcategory = 'apartment' | 'furniture' | 'masters-degree' | 'wedding' | 'travel' | 'clothing'
export type ProfessionalSubcategory = 'pilot' | 'personal-brand' | 'aviation-marketing'
export type FunSubcategory = 'hobbies' | 'activities'

export type ProjectSubcategory = 
  | HealthSubcategory 
  | RelationshipsSubcategory 
  | FinancialSubcategory 
  | ProfessionalSubcategory 
  | FunSubcategory

export interface Milestone {
  id: string
  title: string
  description?: string
  targetDate?: string
  completed: boolean
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export interface ProjectTask {
  id: string
  title: string
  description?: string
  completed: boolean
  completedAt?: string
  milestoneId?: string
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  title: string
  description?: string
  category: LifeCategory
  subcategory: ProjectSubcategory
  stage: ProjectStage
  status: ProjectStatus
  targetDate?: string
  startDate?: string
  completedAt?: string
  milestones: Milestone[]
  tasks: ProjectTask[]
  progress: number // 0-100
  createdAt: string
  updatedAt: string
}







