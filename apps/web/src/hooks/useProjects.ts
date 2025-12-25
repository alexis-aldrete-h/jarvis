'use client'

import { useState, useEffect, useMemo } from 'react'
import { Project, Milestone, ProjectTask, ProjectStage, ProjectStatus, LifeCategory, ProjectSubcategory } from '@jarvis/shared'

const PROJECTS_KEY = 'jarvis_projects'

const DEFAULT_PROJECTS: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'milestones' | 'tasks' | 'progress'>[] = [
  // Health
  { title: 'Weight Loss: 97kg → 78kg', category: 'health', subcategory: 'physical', stage: 'short-term', status: 'not-started' },
  { title: 'Mental Wellness', category: 'health', subcategory: 'mental', stage: 'short-term', status: 'not-started' },
  { title: 'Spiritual Growth', category: 'health', subcategory: 'spiritual', stage: 'medium-term', status: 'not-started' },
  
  // Relationships
  { title: 'Self Development', category: 'relationships', subcategory: 'myself', stage: 'long-term', status: 'not-started' },
  { title: 'Marriage Goals', category: 'relationships', subcategory: 'wife', stage: 'long-term', status: 'not-started' },
  { title: 'Family Connection', category: 'relationships', subcategory: 'family', stage: 'medium-term', status: 'not-started' },
  { title: 'Friendships', category: 'relationships', subcategory: 'friends', stage: 'short-term', status: 'not-started' },
  
  // Financial
  { title: 'Move to Apartment', category: 'financial', subcategory: 'apartment', stage: 'short-term', status: 'not-started' },
  { title: 'Furniture', category: 'financial', subcategory: 'furniture', stage: 'short-term', status: 'not-started' },
  { title: "Wife's Masters Degree", category: 'financial', subcategory: 'masters-degree', stage: 'medium-term', status: 'not-started' },
  { title: 'Wedding', category: 'financial', subcategory: 'wedding', stage: 'medium-term', status: 'not-started' },
  { title: 'Travel the World', category: 'financial', subcategory: 'travel', stage: 'long-term', status: 'not-started' },
  { title: 'Renovate Clothing', category: 'financial', subcategory: 'clothing', stage: 'short-term', status: 'not-started' },
  
  // Professional
  { title: 'Become a Pilot', category: 'professional', subcategory: 'pilot', stage: 'long-term', status: 'not-started' },
  { title: 'Personal Brand', category: 'professional', subcategory: 'personal-brand', stage: 'medium-term', status: 'not-started' },
  { title: 'Aviation Marketing', category: 'professional', subcategory: 'aviation-marketing', stage: 'medium-term', status: 'not-started' },
  
  // Fun
  { title: 'Hobbies & Activities', category: 'fun', subcategory: 'hobbies', stage: 'short-term', status: 'not-started' },
]

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(PROJECTS_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Check if projects have mock data (have milestones/tasks with progress > 0)
        const hasMockData = parsed.length > 0 && parsed.some((p: Project) => 
          (p.milestones && p.milestones.length > 0) || 
          (p.tasks && p.tasks.length > 0) ||
          (p.progress && p.progress > 0)
        )
        if (hasMockData) {
          setProjects(parsed)
        } else {
          // No mock data, regenerate
          console.log('No mock data found, initializing with mock progress...')
          initializeDefaultProjects()
        }
      } catch (e) {
        console.error('Failed to load projects:', e)
        // Initialize with default projects if storage is corrupted
        initializeDefaultProjects()
      }
    } else {
      console.log('No projects found, initializing with mock progress...')
      initializeDefaultProjects()
    }
  }, [])

  const generateMockMilestones = (project: { title: string; category: LifeCategory; subcategory: ProjectSubcategory; stage: ProjectStage }): Milestone[] => {
    const milestones: Milestone[] = []
    const now = new Date().toISOString()
    const baseDate = new Date()
    
    // Special case for Physical Health weight loss project
    if (project.category === 'health' && project.subcategory === 'physical' && (project.title.toLowerCase().includes('weight') || project.title.toLowerCase().includes('physical'))) {
      const currentWeight = 97
      const targetWeight = 78
      const totalWeightLoss = currentWeight - targetWeight // 19kg
      
      // Long-term milestone: Final goal
      const longTermDate = new Date(baseDate)
      longTermDate.setMonth(longTermDate.getMonth() + 5) // 5 months total
      milestones.push({
        id: `milestone-long-${Date.now()}`,
        title: `Reach ${targetWeight}kg (Final Goal)`,
        description: `Long-term goal: Lose ${totalWeightLoss}kg from ${currentWeight}kg to ${targetWeight}kg`,
        targetDate: longTermDate.toISOString().split('T')[0],
        completed: false,
        createdAt: now,
        updatedAt: now,
      })
      
      // Medium-term milestones: Monthly (4kg per month)
      const monthlyGoals = [93, 89, 85, 81, 78] // 4kg, 4kg, 4kg, 4kg, 3kg
      for (let i = 0; i < monthlyGoals.length; i++) {
        const monthDate = new Date(baseDate)
        monthDate.setMonth(monthDate.getMonth() + i + 1)
        const completed = i < 2 // First 2 months completed
        milestones.push({
          id: `milestone-medium-${Date.now()}-${i}`,
          title: `Reach ${monthlyGoals[i]}kg (Month ${i + 1})`,
          description: `Medium-term milestone: ${i === 0 ? '4kg' : i === monthlyGoals.length - 1 ? '3kg' : '4kg'} weight loss`,
          targetDate: monthDate.toISOString().split('T')[0],
          completed,
          completedAt: completed ? new Date(monthDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
          createdAt: now,
          updatedAt: now,
        })
      }
      
      // Short-term milestones: Weekly (1kg per week)
      for (let week = 1; week <= 20; week++) {
        const weekDate = new Date(baseDate)
        weekDate.setDate(weekDate.getDate() + week * 7)
        const targetWeightForWeek = currentWeight - week // 96, 95, 94, etc.
        const completed = week <= 8 // First 8 weeks completed
        const completedDate = completed ? new Date(weekDate.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined
        milestones.push({
          id: `milestone-short-${Date.now()}-${week}`,
          title: `Reach ${targetWeightForWeek}kg (Week ${week})`,
          description: `Short-term milestone: 1kg weight loss`,
          targetDate: weekDate.toISOString().split('T')[0],
          completed,
          completedAt: completedDate,
          createdAt: now,
          updatedAt: now,
        })
      }
      
      return milestones
    }
    
    // Default milestone generation for other projects
    const milestoneCount = project.stage === 'short-term' ? 4 : project.stage === 'medium-term' ? 5 : 6
    const completionRatio = 0.35 // 35% of milestones completed on average
    
    for (let i = 0; i < milestoneCount; i++) {
      const targetDate = new Date(baseDate)
      if (project.stage === 'short-term') {
        targetDate.setDate(targetDate.getDate() + (i + 1) * 7) // Weekly
      } else if (project.stage === 'medium-term') {
        targetDate.setMonth(targetDate.getMonth() + (i + 1)) // Monthly
      } else {
        targetDate.setMonth(targetDate.getMonth() + (i + 1) * 2) // Bi-monthly
      }
      
      // More likely to complete earlier milestones
      const completionChance = 1 - (i / milestoneCount) * 0.5
      const completed = i < Math.floor(milestoneCount * completionRatio) || Math.random() < completionChance * 0.2
      
      milestones.push({
        id: `milestone-${Date.now()}-${i}`,
        title: `${project.title} - Milestone ${i + 1}`,
        description: `${project.stage === 'short-term' ? 'Weekly' : project.stage === 'medium-term' ? 'Monthly' : 'Bi-monthly'} milestone`,
        targetDate: targetDate.toISOString().split('T')[0],
        completed,
        completedAt: completed ? new Date(targetDate.getTime() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        createdAt: now,
        updatedAt: now,
      })
    }
    
    return milestones
  }

  const generateMockTasks = (milestones: Milestone[], project: { title: string; category: LifeCategory; subcategory: ProjectSubcategory }): ProjectTask[] => {
    const tasks: ProjectTask[] = []
    const now = new Date().toISOString()
    
    // Special case for Physical Health weight loss project
    if (project.category === 'health' && project.subcategory === 'physical' && (project.title.toLowerCase().includes('weight') || project.title.toLowerCase().includes('physical'))) {
      milestones.forEach((milestone) => {
        const isWeekly = milestone.title.includes('Week')
        const isMonthly = milestone.title.includes('Month')
        const isLongTerm = milestone.title.includes('Final Goal')
        
        if (isWeekly) {
          // Weekly tasks: Workout 5 days per week
          const weekNum = parseInt(milestone.title.match(/Week (\d+)/)?.[1] || '0')
          const weekCompleted = weekNum <= 8 // First 8 weeks completed
          
          // Workout task - 90% completion rate for completed weeks
          const workoutCompleted = weekCompleted && Math.random() > 0.1
          tasks.push({
            id: `task-${milestone.id}-workout`,
            title: 'Workout 5 days per week',
            description: 'Complete 5 workout sessions this week',
            completed: workoutCompleted,
            completedAt: workoutCompleted ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
            milestoneId: milestone.id,
            createdAt: now,
            updatedAt: now,
          })
          
          // Diet task - 85% completion rate for completed weeks
          const dietCompleted = weekCompleted && Math.random() > 0.15
          tasks.push({
            id: `task-${milestone.id}-diet`,
            title: 'Follow meal plan',
            description: 'Stick to calorie deficit diet plan',
            completed: dietCompleted,
            completedAt: dietCompleted ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
            milestoneId: milestone.id,
            createdAt: now,
            updatedAt: now,
          })
          
          // Track task - 95% completion rate for completed weeks
          const trackCompleted = weekCompleted && Math.random() > 0.05
          tasks.push({
            id: `task-${milestone.id}-track`,
            title: 'Track daily weight',
            description: 'Log weight every morning',
            completed: trackCompleted,
            completedAt: trackCompleted ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
            milestoneId: milestone.id,
            createdAt: now,
            updatedAt: now,
          })
        } else if (isMonthly) {
          // Monthly tasks
          const monthNum = parseInt(milestone.title.match(/Month (\d+)/)?.[1] || '0')
          const monthCompleted = monthNum <= 2 // First 2 months completed
          
          // Review task - always completed if month is completed
          tasks.push({
            id: `task-${milestone.id}-review`,
            title: 'Monthly progress review',
            description: 'Review weight loss progress and adjust plan',
            completed: monthCompleted,
            completedAt: monthCompleted ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
            milestoneId: milestone.id,
            createdAt: now,
            updatedAt: now,
          })
          
          // Measurements task - 90% completion rate for completed months
          const measureCompleted = monthCompleted && Math.random() > 0.1
          tasks.push({
            id: `task-${milestone.id}-measure`,
            title: 'Body measurements',
            description: 'Take body measurements (waist, hips, etc.)',
            completed: measureCompleted,
            completedAt: measureCompleted ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
            milestoneId: milestone.id,
            createdAt: now,
            updatedAt: now,
          })
        } else if (isLongTerm) {
          // Long-term tasks
          tasks.push({
            id: `task-${milestone.id}-maintain`,
            title: 'Maintain target weight',
            description: 'Sustain 78kg weight for 1 month',
            completed: false,
            milestoneId: milestone.id,
            createdAt: now,
            updatedAt: now,
          })
          
          tasks.push({
            id: `task-${milestone.id}-celebrate`,
            title: 'Celebrate achievement',
            description: 'Reward yourself for reaching goal',
            completed: false,
            milestoneId: milestone.id,
            createdAt: now,
            updatedAt: now,
          })
        }
      })
      
      return tasks
    }
    
    // Default task generation for other projects
    milestones.forEach((milestone, milestoneIndex) => {
      // 2-4 tasks per milestone
      const taskCount = 2 + Math.floor(Math.random() * 3)
      const completedRatio = milestoneIndex / milestones.length
      
      for (let i = 0; i < taskCount; i++) {
        const taskTitles = [
          'Complete research',
          'Set up plan',
          'Execute action items',
          'Review progress',
          'Make adjustments',
          'Document results',
        ]
        
        // Tasks are more likely to be completed if milestone is completed
        const taskCompleted = milestone.completed 
          ? Math.random() > 0.15 // 85% completion if milestone done
          : completedRatio > 0.3 && Math.random() > 0.5 // 50% for early incomplete milestones
        
        tasks.push({
          id: `task-${Date.now()}-${milestoneIndex}-${i}`,
          title: taskTitles[i % taskTitles.length] || `Task ${i + 1}`,
          description: `Actionable task for ${milestone.title}`,
          completed: taskCompleted,
          completedAt: taskCompleted ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
          milestoneId: milestone.id,
          createdAt: now,
          updatedAt: now,
        })
      }
    })
    
    return tasks
  }

  const initializeDefaultProjects = () => {
    const now = new Date().toISOString()
    const defaultProjects: Project[] = DEFAULT_PROJECTS.map((p, index) => {
      const milestones = generateMockMilestones(p)
      const tasks = generateMockTasks(milestones, p)
      
      // Calculate initial progress
      const completedMilestones = milestones.filter((m) => m.completed).length
      const completedTasks = tasks.filter((t) => t.completed).length
      const milestoneProgress = milestones.length > 0 ? (completedMilestones / milestones.length) * 50 : 0
      const taskProgress = tasks.length > 0 ? (completedTasks / tasks.length) * 50 : 0
      const progress = Math.round(milestoneProgress + taskProgress)
      
      // Determine status based on progress
      let status: ProjectStatus = 'not-started'
      if (progress >= 100) {
        status = 'completed'
      } else if (progress > 0) {
        status = 'in-progress'
      }
      
      return {
        ...p,
        id: `project-${Date.now()}-${index}`,
        milestones,
        tasks,
        progress,
        status,
        createdAt: now,
        updatedAt: now,
      }
    })
    setProjects(defaultProjects)
    saveProjects(defaultProjects)
  }

  const saveProjects = (newProjects: Project[]) => {
    setProjects(newProjects)
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(newProjects))
  }

  const addProject = (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'milestones' | 'tasks' | 'progress'>) => {
    const now = new Date().toISOString()
    const newProject: Project = {
      ...project,
      id: `project-${Date.now()}`,
      milestones: [],
      tasks: [],
      progress: 0,
      createdAt: now,
      updatedAt: now,
    }
    saveProjects([...projects, newProject])
    return newProject
  }

  const updateProject = (id: string, updates: Partial<Project>) => {
    const updated = projects.map((p) => {
      if (p.id === id) {
        const updatedProject = { ...p, ...updates, updatedAt: new Date().toISOString() }
        // Recalculate progress
        updatedProject.progress = calculateProgress(updatedProject)
        return updatedProject
      }
      return p
    })
    saveProjects(updated)
  }

  const deleteProject = (id: string) => {
    saveProjects(projects.filter((p) => p.id !== id))
  }

  const addMilestone = (projectId: string, milestone: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    const newMilestone: Milestone = {
      ...milestone,
      id: `milestone-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    }
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        const updatedProject = { ...p, milestones: [...p.milestones, newMilestone], updatedAt: now }
        updatedProject.progress = calculateProgress(updatedProject)
        return updatedProject
      }
      return p
    })
    saveProjects(updated)
    return newMilestone
  }

  const updateMilestone = (projectId: string, milestoneId: string, updates: Partial<Milestone>) => {
    const now = new Date().toISOString()
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        const updatedProject = {
          ...p,
          milestones: p.milestones.map((m) =>
            m.id === milestoneId ? { ...m, ...updates, updatedAt: now } : m
          ),
          updatedAt: now,
        }
        updatedProject.progress = calculateProgress(updatedProject)
        return updatedProject
      }
      return p
    })
    saveProjects(updated)
  }

  const deleteMilestone = (projectId: string, milestoneId: string) => {
    const now = new Date().toISOString()
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        const updatedProject = {
          ...p,
          milestones: p.milestones.filter((m) => m.id !== milestoneId),
          tasks: p.tasks.filter((t) => t.milestoneId !== milestoneId),
          updatedAt: now,
        }
        updatedProject.progress = calculateProgress(updatedProject)
        return updatedProject
      }
      return p
    })
    saveProjects(updated)
  }

  const addTask = (projectId: string, task: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    const newTask: ProjectTask = {
      ...task,
      id: `task-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    }
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        const updatedProject = { ...p, tasks: [...p.tasks, newTask], updatedAt: now }
        updatedProject.progress = calculateProgress(updatedProject)
        return updatedProject
      }
      return p
    })
    saveProjects(updated)
    return newTask
  }

  const updateTask = (projectId: string, taskId: string, updates: Partial<ProjectTask>) => {
    const now = new Date().toISOString()
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        const updatedProject = {
          ...p,
          tasks: p.tasks.map((t) =>
            t.id === taskId ? { ...t, ...updates, updatedAt: now } : t
          ),
          updatedAt: now,
        }
        updatedProject.progress = calculateProgress(updatedProject)
        return updatedProject
      }
      return p
    })
    saveProjects(updated)
  }

  const deleteTask = (projectId: string, taskId: string) => {
    const now = new Date().toISOString()
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        const updatedProject = {
          ...p,
          tasks: p.tasks.filter((t) => t.id !== taskId),
          updatedAt: now,
        }
        updatedProject.progress = calculateProgress(updatedProject)
        return updatedProject
      }
      return p
    })
    saveProjects(updated)
  }

  const calculateProgress = (project: Project): number => {
    if (project.milestones.length === 0 && project.tasks.length === 0) return 0
    
    const completedMilestones = project.milestones.filter((m) => m.completed).length
    const completedTasks = project.tasks.filter((t) => t.completed).length
    
    const milestoneProgress = project.milestones.length > 0 
      ? (completedMilestones / project.milestones.length) * 50 
      : 0
    
    const taskProgress = project.tasks.length > 0 
      ? (completedTasks / project.tasks.length) * 50 
      : 0
    
    return Math.round(milestoneProgress + taskProgress)
  }

  // Grouped data for visualization
  const projectsByStage = useMemo(() => {
    const grouped: Record<ProjectStage, Project[]> = {
      'short-term': [],
      'medium-term': [],
      'long-term': [],
    }
    projects.forEach((p) => {
      grouped[p.stage].push(p)
    })
    return grouped
  }, [projects])

  const projectsByCategory = useMemo(() => {
    const grouped: Record<LifeCategory, Project[]> = {
      health: [],
      relationships: [],
      financial: [],
      professional: [],
      fun: [],
    }
    projects.forEach((p) => {
      grouped[p.category].push(p)
    })
    return grouped
  }, [projects])

  const overallProgress = useMemo(() => {
    if (projects.length === 0) return 0
    const total = projects.reduce((sum, p) => sum + p.progress, 0)
    return Math.round(total / projects.length)
  }, [projects])

  const completedProjects = useMemo(() => {
    return projects.filter((p) => p.status === 'completed').length
  }, [projects])

  return {
    projects,
    projectsByStage,
    projectsByCategory,
    overallProgress,
    completedProjects,
    addProject,
    updateProject,
    deleteProject,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    addTask,
    updateTask,
    deleteTask,
  }
}

