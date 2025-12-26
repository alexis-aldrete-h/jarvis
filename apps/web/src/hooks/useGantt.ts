'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { flushSync } from 'react-dom'
import { GanttProject, GanttTask, GanttSubtask } from '@jarvis/shared'
import { loadProjectsFromSupabase, saveProjectsToSupabase } from './useGanttSupabase'

const GANTT_STORAGE_KEY = 'jarvis_gantt_projects'

// Helper to get today's date as YYYY-MM-DD
const getTodayString = (): string => {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

// Helper to get date N days from today
const getDateDaysFromToday = (days: number): string => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

// Validate that startDate <= endDate (allow single-day duration)
const validateDates = (startDate: string, endDate: string): { startDate: string; endDate: string } => {
  let start = startDate
  let end = endDate
  
  if (start > end) {
    // Swap if invalid
    const temp = start
    start = end
    end = temp
  }
  
  const startDateObj = new Date(start + 'T00:00:00')
  const endDateObj = new Date(end + 'T00:00:00')
  
  // If negative duration, clamp to single day
  if (endDateObj.getTime() < startDateObj.getTime()) {
    end = start
  }
  
  return { startDate: start, endDate: end }
}

// Add days to a date string (YYYY-MM-DD)
const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// Ensure both dates are present and valid, defaulting to today -> tomorrow when missing
// If both dates are empty strings, preserve them as empty (for new items)
const ensureDates = (startDate?: string, endDate?: string): { startDate: string; endDate: string } => {
  // If both are empty strings, preserve them as empty (for newly created items)
  if (startDate === '' && endDate === '') {
    return { startDate: '', endDate: '' }
  }
  // If only one is empty, treat as missing and use defaults
  const today = getTodayString()
  let start = startDate || today
  let end = endDate || addDays(start, 1)
  return validateDates(start, end)
}

// Ensure child dates are within parent range
// If parent dates are empty, don't clamp (allow child to have any dates)
const clampChildDates = (
  childStart: string,
  childEnd: string,
  parentStart: string,
  parentEnd: string
): { startDate: string; endDate: string } => {
  let startDate = childStart
  let endDate = childEnd

  // If parent dates are empty, don't clamp - return child dates as-is
  if (!parentStart || !parentEnd || parentStart === '' || parentEnd === '') {
    // Only ensure start <= end
    if (startDate && endDate && startDate > endDate) {
      endDate = startDate
    }
    return { startDate, endDate }
  }

  // Clamp start date
  if (startDate && startDate < parentStart) {
    startDate = parentStart
  }
  if (startDate && startDate > parentEnd) {
    startDate = parentEnd
  }

  // Clamp end date
  if (endDate && endDate < parentStart) {
    endDate = parentStart
  }
  if (endDate && endDate > parentEnd) {
    console.log('⚠️ Clamping endDate:', {
      childEnd: endDate,
      parentEnd: parentEnd,
      comparison: endDate > parentEnd,
      willClampTo: parentEnd
    })
    endDate = parentEnd
  }

  // Ensure start <= end
  if (startDate && endDate && startDate > endDate) {
    endDate = startDate
  }

  return { startDate, endDate }
}

// Calculate task dates from subtasks (earliest start, latest end)
const calculateTaskDatesFromSubtasks = (subtasks: GanttSubtask[]): { startDate: string; endDate: string } | null => {
  if (subtasks.length === 0) {
    return null
  }
  
  let earliestStart = subtasks[0].startDate
  let latestEnd = subtasks[0].endDate
  
  subtasks.forEach((subtask) => {
    if (subtask.startDate < earliestStart) {
      earliestStart = subtask.startDate
    }
    if (subtask.endDate > latestEnd) {
      latestEnd = subtask.endDate
    }
  })
  
  return { startDate: earliestStart, endDate: latestEnd }
}

// Calculate total story points from subtasks
const calculateTotalPoints = (subtasks: GanttSubtask[]): number => {
  return subtasks.reduce((total, subtask) => {
    return total + (subtask.storyPoints || 0)
  }, 0)
}

export function useGantt() {
  const [projects, setProjects] = useState<GanttProject[]>([])
  const creatingProjectRef = useRef<boolean>(false)

  // Load from Supabase or localStorage on mount
  useEffect(() => {
    const loadProjects = async () => {
      // Try Supabase first
      let loadedProjects = await loadProjectsFromSupabase()
      
      // If Supabase returned empty and we have localStorage data, try loading from localStorage
      if (loadedProjects.length === 0) {
        const stored = localStorage.getItem(GANTT_STORAGE_KEY)
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            loadedProjects = parsed
          } catch (e) {
            console.error('Failed to parse localStorage data:', e)
          }
        }
      }
      
      if (loadedProjects.length > 0) {
        // Color palette for projects
        const PROJECT_COLORS = [
          '#3b82f6', // blue
          '#10b981', // green
          '#f59e0b', // amber
          '#ef4444', // red
          '#8b5cf6', // purple
          '#ec4899', // pink
          '#06b6d4', // cyan
          '#84cc16', // lime
          '#f97316', // orange
          '#6366f1', // indigo
          '#14b8a6', // teal
          '#a855f7', // violet
          '#22c55e', // emerald
          '#eab308', // yellow
          '#f43f5e', // rose
        ]
        
        // Ensure all projects have children arrays initialized, assign colors, and validate dates
        const normalized = loadedProjects.map((p: GanttProject, index: number) => {
          // Ensure and validate dates to ensure minimum 1 day duration
          const validated = ensureDates(p.startDate, p.endDate)
          
          return {
            ...p,
            // Assign color if missing
            color: p.color || PROJECT_COLORS[index % PROJECT_COLORS.length],
            // Use validated dates
            startDate: validated.startDate,
            endDate: validated.endDate,
            children: Array.isArray(p.children) ? p.children.map((t: GanttTask) => {
              // Validate task dates and ensure they're within project range
              let taskValidated = ensureDates(t.startDate, t.endDate)
              // Clamp to project range
              taskValidated = clampChildDates(
                taskValidated.startDate,
                taskValidated.endDate,
                validated.startDate,
                validated.endDate
              )
              // Re-validate after clamping
              taskValidated = ensureDates(taskValidated.startDate, taskValidated.endDate)
              
              return {
                ...t,
                startDate: taskValidated.startDate,
                endDate: taskValidated.endDate,
                children: Array.isArray(t.children) ? t.children.map((st: GanttSubtask) => {
                  // Validate subtask dates and ensure they're within task range
                  let subtaskValidated = ensureDates(st.startDate, st.endDate)
                  // Clamp to task range
                  subtaskValidated = clampChildDates(
                    subtaskValidated.startDate,
                    subtaskValidated.endDate,
                    taskValidated.startDate,
                    taskValidated.endDate
                  )
                  // Re-validate after clamping
                  subtaskValidated = ensureDates(subtaskValidated.startDate, subtaskValidated.endDate)
                  
                  return {
                    ...st,
                    startDate: subtaskValidated.startDate,
                    endDate: subtaskValidated.endDate,
                  }
                }) : [],
              }
            }) : [],
          }
        })
        setProjects(normalized)
      }
    }
    
    loadProjects()
  }, [])

  // Validate all projects before saving to ensure minimum 1 day duration
  const validateAllProjects = useCallback((projectsToValidate: GanttProject[]): GanttProject[] => {
    return projectsToValidate.map((project) => {
      // Validate project dates
      let validated = validateDates(project.startDate, project.endDate)
      
      return {
        ...project,
        startDate: validated.startDate,
        endDate: validated.endDate,
        children: (project.children || []).map((task) => {
          // Calculate task dates from subtasks if subtasks exist
          const subtasks = task.children || []
          const calculatedDates = calculateTaskDatesFromSubtasks(subtasks)
          
          // Use calculated dates if available, otherwise use existing task dates
          // BUT: If task has manually set dates that are later than calculated, preserve them
          // This prevents subtasks from overriding manually set task dates
          let taskStartDate = calculatedDates?.startDate || task.startDate
          let taskEndDate = calculatedDates?.endDate || task.endDate
          
          // If task has a manually set endDate that's later than calculated, use the manual one
          if (task.endDate && calculatedDates?.endDate && task.endDate > calculatedDates.endDate) {
            taskEndDate = task.endDate
          }
          // Same for startDate (earlier is better)
          if (task.startDate && calculatedDates?.startDate && task.startDate < calculatedDates.startDate) {
            taskStartDate = task.startDate
          }
          
          // Ensure and validate task dates and clamp to project
          let taskValidated = ensureDates(taskStartDate, taskEndDate)
          taskValidated = clampChildDates(
            taskValidated.startDate,
            taskValidated.endDate,
            validated.startDate,
            validated.endDate
          )
          taskValidated = ensureDates(taskValidated.startDate, taskValidated.endDate)
          
          // Calculate total points from subtasks
          const calculatedTotalPoints = calculateTotalPoints(subtasks)
          // Preserve manually-set totalPoints for tasks without subtasks
          const totalPoints =
            subtasks.length > 0
              ? (calculatedTotalPoints > 0 ? calculatedTotalPoints : undefined)
              : // @ts-expect-error GanttTask may carry totalPoints at runtime
                (task.totalPoints as number | undefined)
          
          return {
            ...task,
            startDate: taskValidated.startDate,
            endDate: taskValidated.endDate,
            // @ts-expect-error allow totalPoints on GanttTask
            totalPoints,
            children: subtasks.map((subtask) => {
              // Ensure and validate subtask dates and clamp to task
              let subtaskValidated = ensureDates(subtask.startDate, subtask.endDate)
              subtaskValidated = clampChildDates(
                subtaskValidated.startDate,
                subtaskValidated.endDate,
                taskValidated.startDate,
                taskValidated.endDate
              )
              subtaskValidated = ensureDates(subtaskValidated.startDate, subtaskValidated.endDate)
              
              return {
                ...subtask,
                startDate: subtaskValidated.startDate,
                endDate: subtaskValidated.endDate,
              }
            }),
          }
        }),
      }
    })
  }, [])

  // Save to Supabase and localStorage (does NOT update state - state should be updated separately)
  const saveProjects = useCallback(async (newProjects: GanttProject[]) => {
    // Validate all projects before saving
    const validatedProjects = validateAllProjects(newProjects)
    
    // Always save to localStorage first (immediate backup)
    localStorage.setItem(GANTT_STORAGE_KEY, JSON.stringify(validatedProjects))
    
    // Try saving to Supabase (async, non-blocking)
    try {
      const supabaseSuccess = await saveProjectsToSupabase(validatedProjects)
      if (!supabaseSuccess) {
        console.warn('⚠️ Failed to save to Supabase, data saved to localStorage only')
      } else {
        console.log('✅ Data saved to Supabase successfully')
      }
    } catch (error) {
      console.error('❌ Error in saveProjects:', error)
    }
  }, [validateAllProjects])

  // ========== PROJECT OPERATIONS ==========

  const addProject = useCallback((name?: string): GanttProject => {
    // Prevent concurrent calls (e.g., from React StrictMode double-invocation)
    if (creatingProjectRef.current) {
      console.warn('⚠️ addProject: Already creating a project, ignoring duplicate call')
      // Access current projects through a synchronous read (may be slightly stale, but acceptable for guard)
      const currentProjects = projects
      const lastProject = currentProjects[currentProjects.length - 1]
      if (lastProject) {
        return lastProject
      }
      // If no projects exist, create a dummy one (shouldn't happen, but safety check)
      return {
        id: `project-dummy-${Date.now()}`,
        name: name || '',
        startDate: '',
        endDate: '',
        status: 'backlog',
        children: [],
      }
    }
    creatingProjectRef.current = true
    
    try {
    // Use functional update to ALWAYS get the latest projects state
    let newProject: GanttProject | null = null
    let validatedProjects: GanttProject[] = []
    
    // Force synchronous state update using flushSync to ensure immediate re-render
    flushSync(() => {
      setProjects((currentProjects) => {
        newProject = {
          id: `project-${Date.now()}-${Math.random()}`,
          name: name || '',
          startDate: '',
          endDate: '',
          status: 'backlog',
          children: [],
        }

        const updated = [...currentProjects, newProject]
        validatedProjects = validateAllProjects(updated)
        
        // Return a NEW array reference to ensure React detects the change
        // Create a completely new array by mapping (ensures new reference)
        return validatedProjects.map(p => ({ ...p }))
      })
    })

    // Save AFTER state update (outside the callback to avoid duplicate saves)
    saveProjects(validatedProjects).catch(err => {
      console.error('Failed to save project to Supabase:', err)
    })

      // Return the created project (setProjects callback runs synchronously)
      if (!newProject) {
        throw new Error('Failed to create project')
      }
      return newProject
    } finally {
      // Reset the guard after a short delay to allow state updates to complete
      setTimeout(() => {
        creatingProjectRef.current = false
      }, 100)
    }
  }, [validateAllProjects, saveProjects, projects])

  const updateProject = useCallback((id: string, updates: Partial<GanttProject>) => {
    const updated = projects.map((project) => {
      if (project.id === id) {
        const updatedProject = { ...project, ...updates }

        // Validate dates (allow single-day)
        // Use updated dates if provided, otherwise use existing dates
        const startDateToValidate = updates.startDate !== undefined ? updates.startDate : updatedProject.startDate
        const endDateToValidate = updates.endDate !== undefined ? updates.endDate : updatedProject.endDate
        
        let { startDate, endDate } = validateDates(
          startDateToValidate,
          endDateToValidate
        )
        
        updatedProject.startDate = startDate
        updatedProject.endDate = endDate

        // Ensure all children are within the new parent range
        updatedProject.children = (updatedProject.children || []).map((task) => {
          let clamped = clampChildDates(
            task.startDate,
            task.endDate,
            startDate,
            endDate
          )
          // Re-validate after clamping to ensure minimum 1 day
          const taskValidated = validateDates(clamped.startDate, clamped.endDate)
          clamped = {
            startDate: taskValidated.startDate,
            endDate: taskValidated.endDate
          }
          
          return {
            ...task,
            ...clamped,
            // Also clamp subtasks
            children: (task.children || []).map((subtask) => {
              let subtaskClamped = clampChildDates(
                subtask.startDate,
                subtask.endDate,
                clamped.startDate,
                clamped.endDate
              )
              // Re-validate after clamping to ensure minimum 1 day
              const subtaskValidated = validateDates(subtaskClamped.startDate, subtaskClamped.endDate)
              subtaskClamped = {
                startDate: subtaskValidated.startDate,
                endDate: subtaskValidated.endDate
              }
              return { ...subtask, ...subtaskClamped }
            }),
          }
        })

        return updatedProject
      }
      return project
    })
    const validatedProjects = validateAllProjects(updated)
    setProjects(validatedProjects)
    saveProjects(validatedProjects)
  }, [projects, saveProjects, validateAllProjects])

  const deleteProject = useCallback((id: string) => {
    // Delete project and all its children (tasks and subtasks)
    const updated = projects.filter((p) => p.id !== id)
    const validatedProjects = validateAllProjects(updated)
    setProjects(validatedProjects)
    saveProjects(validatedProjects)
  }, [projects, saveProjects, validateAllProjects])

  // ========== TASK OPERATIONS ==========

  const addTask = useCallback((projectId: string, name?: string): GanttTask => {
    const project = projects.find((p) => p.id === projectId)
    if (!project) {
      throw new Error(`Project ${projectId} not found`)
    }

    const newTask: GanttTask = {
      id: `task-${Date.now()}-${Math.random()}`,
      name: name || '',
      startDate: '',
      endDate: '',
      parentProjectId: projectId,
      status: 'backlog',
      children: [],
    }

    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return { ...p, children: [...(p.children || []), newTask] }
      }
      return p
    })

    const validatedProjects = validateAllProjects(updated)
    setProjects(validatedProjects)
    saveProjects(validatedProjects)
    return newTask
  }, [projects, saveProjects, validateAllProjects])

  const updateTask = useCallback((
    projectId: string,
    taskId: string,
    updates: Partial<GanttTask>
  ) => {
    setProjects((currentProjects) => {
      const updated = currentProjects.map((project) => {
      if (project.id === projectId) {
        // Create a copy of the project to modify
        let updatedProject = { ...project }
        
        const updatedChildren = (project.children || []).map((task) => {
          if (task.id === taskId) {
            const updatedTask = { ...task, ...updates }

            // Get the dates to validate - use updates if provided, otherwise use existing task dates
            const startDateToValidate = updates.startDate !== undefined ? updates.startDate : updatedTask.startDate
            const endDateToValidate = updates.endDate !== undefined ? updates.endDate : updatedTask.endDate

            let startDate = startDateToValidate
            let endDate = endDateToValidate
            
            // Handle date validation and project extension
            if (endDate && endDate !== '') {
              // If parent project has dates, check if we need to extend project
              if (updatedProject.startDate && updatedProject.endDate && updatedProject.startDate !== '' && updatedProject.endDate !== '') {
                // If endDate extends beyond project, extend project FIRST before any clamping
                if (endDate > updatedProject.endDate) {
                  const newProjectEnd = endDate
                  // Ensure project has valid dates (at least 1 day)
                  const projectStart = updatedProject.startDate
                  const projectValidated = validateDates(projectStart, newProjectEnd)
                  updatedProject.endDate = projectValidated.endDate
                }
              }
            }
            
            if (startDate && startDate !== '') {
              // If parent project has dates, check if we need to extend project
              if (updatedProject.startDate && updatedProject.endDate && updatedProject.startDate !== '' && updatedProject.endDate !== '') {
                // If startDate is before project, extend project
                if (startDate < updatedProject.startDate) {
                  const newProjectStart = startDate
                  // Ensure project has valid dates (at least 1 day)
                  const projectEnd = updatedProject.endDate
                  const projectValidated = validateDates(newProjectStart, projectEnd)
                  updatedProject.startDate = projectValidated.startDate
                }
              }
            }
            
            // Now validate and clamp dates if both exist
            if (startDate && endDate && startDate !== '' && endDate !== '') {
              // Validate dates to ensure minimum 1 day duration
              const validated = validateDates(startDate, endDate)
              startDate = validated.startDate
              endDate = validated.endDate

              // If parent project has dates, clamp to project range (but project was already extended if needed)
              if (updatedProject.startDate && updatedProject.endDate && updatedProject.startDate !== '' && updatedProject.endDate !== '') {
                console.log('🔍 Clamping task dates:', {
                  taskId,
                  taskName: updatedTask.name,
                  taskEndDate: endDate,
                  projectId: projectId,
                  projectName: updatedProject.name,
                  projectEndDate: updatedProject.endDate,
                  beforeClamp: { startDate, endDate }
                })
                const clamped = clampChildDates(
                  startDate,
                  endDate,
                  updatedProject.startDate,
                  updatedProject.endDate
                )
                console.log('🔍 After clamping:', {
                  afterClamp: clamped,
                  wasClamped: clamped.endDate !== endDate
                })
                startDate = clamped.startDate
                endDate = clamped.endDate
              }
            }

            updatedTask.startDate = startDate
            updatedTask.endDate = endDate

            // Ensure all subtasks are within the new task range
            updatedTask.children = (updatedTask.children || []).map((subtask) => {
              const subtaskClamped = clampChildDates(
                subtask.startDate,
                subtask.endDate,
                startDate || '',
                endDate || ''
              )
              return { ...subtask, ...subtaskClamped }
            })

            return updatedTask
          }
          return task
        })
        
        return {
          ...updatedProject,
          children: updatedChildren
        }
      }
      return project
      })

      const validatedProjects = validateAllProjects(updated)
      saveProjects(validatedProjects)
      return validatedProjects
    })
  }, [saveProjects, validateAllProjects])

  const deleteTask = useCallback((projectId: string, taskId: string) => {
    const updated = projects.map((project) => {
      if (project.id === projectId) {
        return {
          ...project,
          children: (project.children || []).filter((t) => t.id !== taskId),
        }
      }
      return project
    })
    const validatedProjects = validateAllProjects(updated)
    setProjects(validatedProjects)
    saveProjects(validatedProjects)
  }, [projects, saveProjects, validateAllProjects])

  // ========== SUBTASK OPERATIONS ==========

  const addSubtask = useCallback((
    projectId: string,
    taskId: string,
    name?: string
  ): GanttSubtask => {
    const project = projects.find((p) => p.id === projectId)
    if (!project) {
      throw new Error(`Project ${projectId} not found`)
    }

    const task = (project.children || []).find((t) => t.id === taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    const newSubtask: GanttSubtask = {
      id: `subtask-${Date.now()}-${Math.random()}`,
      name: name || '',
      startDate: '',
      endDate: '',
      parentTaskId: taskId,
      status: 'backlog',
    }

    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          children: (p.children || []).map((t) => {
            if (t.id === taskId) {
              const updatedSubtasks = [...(t.children || []), newSubtask]
              
              // Recalculate task dates and points from all subtasks
              const calculatedDates = calculateTaskDatesFromSubtasks(updatedSubtasks)
              const totalPoints = calculateTotalPoints(updatedSubtasks)
              
              const updatedTask = { ...t, children: updatedSubtasks }
              
              if (calculatedDates) {
                // Clamp calculated dates to project range
                const taskClamped = clampChildDates(
                  calculatedDates.startDate,
                  calculatedDates.endDate,
                  p.startDate,
                  p.endDate
                )
                updatedTask.startDate = taskClamped.startDate
                updatedTask.endDate = taskClamped.endDate
                
                // If task extends beyond project, extend project
                if (
                  taskClamped.startDate < p.startDate ||
                  taskClamped.endDate > p.endDate
                ) {
                  p.startDate =
                    taskClamped.startDate < p.startDate
                      ? taskClamped.startDate
                      : p.startDate
                  p.endDate =
                    taskClamped.endDate > p.endDate
                      ? taskClamped.endDate
                      : p.endDate
                }
              }
              
              updatedTask.totalPoints = totalPoints > 0 ? totalPoints : undefined
              
              return updatedTask
            }
            return t
          }),
        }
      }
      return p
    })

    const validatedProjects = validateAllProjects(updated)
    setProjects(validatedProjects)
    saveProjects(validatedProjects)
    return newSubtask
  }, [projects, saveProjects, validateAllProjects])

  const updateSubtask = useCallback((
    projectId: string,
    taskId: string,
    subtaskId: string,
    updates: Partial<GanttSubtask>
  ) => {
    const updated = projects.map((project) => {
      if (project.id === projectId) {
        return {
          ...project,
          children: (project.children || []).map((task) => {
            if (task.id === taskId) {
              return {
                ...task,
                children: (task.children || []).map((subtask) => {
                  if (subtask.id === subtaskId) {
                    const updatedSubtask = { ...subtask, ...updates }

                    // Get the dates to validate - use updates if provided, otherwise use existing subtask dates
                    const startDateToValidate = updates.startDate !== undefined ? updates.startDate : updatedSubtask.startDate
                    const endDateToValidate = updates.endDate !== undefined ? updates.endDate : updatedSubtask.endDate

                    // Only validate if both dates are provided and non-empty
                    let startDate = startDateToValidate
                    let endDate = endDateToValidate
                    
                    if (startDate && endDate && startDate !== '' && endDate !== '') {
                      // Validate dates to ensure minimum 1 day duration
                      const validated = validateDates(startDate, endDate)
                      startDate = validated.startDate
                      endDate = validated.endDate
                      // DON'T clamp to parent task yet - let subtasks extend the task, which will extend the project
                    } else if (startDate && endDate && startDate !== '' && endDate !== '') {
                      // If only one date is provided, validate what we have
                      const validated = validateDates(startDate, endDate)
                      startDate = validated.startDate
                      endDate = validated.endDate
                    }

                    updatedSubtask.startDate = startDate
                    updatedSubtask.endDate = endDate

                    // Recalculate task dates and points from all subtasks (including the new unclamped dates)
                    const allSubtasks = task.children.map((st) => 
                      st.id === subtaskId ? updatedSubtask : st
                    )
                    const calculatedDates = calculateTaskDatesFromSubtasks(allSubtasks)
                    const totalPoints = calculateTotalPoints(allSubtasks)
                    
                    if (calculatedDates) {
                      // Don't clamp task to project - let it extend the project instead
                      task.startDate = calculatedDates.startDate
                      task.endDate = calculatedDates.endDate
                      
                      // If task extends beyond project, extend project to accommodate
                      if (
                        calculatedDates.startDate < project.startDate ||
                        calculatedDates.endDate > project.endDate
                      ) {
                        project.startDate =
                          calculatedDates.startDate < project.startDate
                            ? calculatedDates.startDate
                            : project.startDate
                        project.endDate =
                          calculatedDates.endDate > project.endDate
                            ? calculatedDates.endDate
                            : project.endDate
                      }
                    }
                    // Note: We don't clamp the subtask back to the task range because
                    // the subtask dates are what drive the task/project extension.
                    // The subtask should keep its user-specified dates.
                    
                    task.totalPoints = totalPoints > 0 ? totalPoints : undefined

                    return updatedSubtask
                  }
                  return subtask
                }),
              }
            }
            return task
          }),
        }
      }
      return project
    })

    const validatedProjects = validateAllProjects(updated)
    setProjects(validatedProjects)
    saveProjects(validatedProjects)
  }, [projects, saveProjects, validateAllProjects])

  const deleteSubtask = useCallback((
    projectId: string,
    taskId: string,
    subtaskId: string
  ) => {
    const updated = projects.map((project) => {
      if (project.id === projectId) {
        return {
          ...project,
          children: (project.children || []).map((task) => {
            if (task.id === taskId) {
              const remainingSubtasks = (task.children || []).filter((st) => st.id !== subtaskId)
              
              // Recalculate task dates and points from remaining subtasks
              const calculatedDates = calculateTaskDatesFromSubtasks(remainingSubtasks)
              const totalPoints = calculateTotalPoints(remainingSubtasks)
              
              const updatedTask = {
                ...task,
                children: remainingSubtasks,
              }
              
              if (calculatedDates) {
                // Clamp calculated dates to project range
                const taskClamped = clampChildDates(
                  calculatedDates.startDate,
                  calculatedDates.endDate,
                  project.startDate,
                  project.endDate
                )
                updatedTask.startDate = taskClamped.startDate
                updatedTask.endDate = taskClamped.endDate
              } else {
                // If no subtasks remain, keep existing task dates
                const taskValidated = ensureDates(task.startDate, task.endDate)
                updatedTask.startDate = taskValidated.startDate
                updatedTask.endDate = taskValidated.endDate
              }
              
              updatedTask.totalPoints = totalPoints > 0 ? totalPoints : undefined
              
              return updatedTask
            }
            return task
          }),
        }
      }
      return project
    })
    const validatedProjects = validateAllProjects(updated)
    setProjects(validatedProjects)
    saveProjects(validatedProjects)
  }, [projects, saveProjects, validateAllProjects])

  // ========== REORDERING OPERATIONS ==========

  const reorderProjects = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return // No change needed
    const updated = [...projects]
    const [moved] = updated.splice(fromIndex, 1)
    // When moving down (fromIndex < toIndex), after removal, items shift left
    // So we insert at toIndex (the original target position)
    // When moving up (fromIndex > toIndex), we insert at toIndex
    updated.splice(toIndex, 0, moved)
    const validatedProjects = validateAllProjects(updated)
    setProjects(validatedProjects)
    saveProjects(validatedProjects)
  }, [projects, saveProjects, validateAllProjects])

  const reorderTasks = useCallback((
    projectId: string,
    fromIndex: number,
    toIndex: number
  ) => {
    if (fromIndex === toIndex) return // No change needed
    setProjects((currentProjects) => {
      // Create a completely new array to ensure React detects the change
      const updated = currentProjects.map((project) => {
        if (project.id === projectId) {
          const tasks = [...(project.children || [])]
          if (fromIndex < 0 || fromIndex >= tasks.length || toIndex < 0 || toIndex >= tasks.length) {
            console.error('Invalid indices:', { fromIndex, toIndex, length: tasks.length })
            return project
          }
          const [moved] = tasks.splice(fromIndex, 1)
          // When moving down (fromIndex < toIndex), after removal, items shift left
          // So we insert at toIndex (the original target position)
          // When moving up (fromIndex > toIndex), we insert at toIndex
          tasks.splice(toIndex, 0, moved)
          // Create new project object with new children array
          return { ...project, children: tasks }
        }
        return project
      })
      // Validate and save
      const validatedProjects = validateAllProjects(updated)
      // Save to Supabase and localStorage (async, but state update is synchronous)
      saveProjects(validatedProjects).catch(err => {
        console.error('Failed to save tasks reorder to Supabase:', err)
      })
      // Return a new array reference
      return validatedProjects.map(p => ({ ...p }))
    })
  }, [validateAllProjects, saveProjects])

  const reorderSubtasks = useCallback((
    projectId: string,
    taskId: string,
    fromIndex: number,
    toIndex: number
  ) => {
    if (fromIndex === toIndex) return // No change needed
    setProjects((currentProjects) => {
      // Create a completely new array to ensure React detects the change
      const updated = currentProjects.map((project) => {
        if (project.id === projectId) {
          // Create new project object
          const updatedProject = {
            ...project,
            children: (project.children || []).map((task) => {
              if (task.id === taskId) {
                const subtasks = [...(task.children || [])]
                if (fromIndex < 0 || fromIndex >= subtasks.length || toIndex < 0 || toIndex >= subtasks.length) {
                  console.error('Invalid subtask indices:', { fromIndex, toIndex, length: subtasks.length })
                  return task
                }
                const [moved] = subtasks.splice(fromIndex, 1)
                // When moving down (fromIndex < toIndex), after removal, items shift left
                // So we insert at toIndex (the original target position)
                // When moving up (fromIndex > toIndex), we insert at toIndex
                subtasks.splice(toIndex, 0, moved)
                // Create new task object with new children array
                return { ...task, children: subtasks }
              }
              return task
            }),
          }
          return updatedProject
        }
        return project
      })
      // Validate and save
      const validatedProjects = validateAllProjects(updated)
      // Save to Supabase and localStorage (async, but state update is synchronous)
      saveProjects(validatedProjects).catch(err => {
        console.error('Failed to save subtasks reorder to Supabase:', err)
      })
      // Return a new array reference
      return validatedProjects.map(p => ({ ...p }))
    })
  }, [validateAllProjects, saveProjects])

  // Debug: Log when projects state changes
  useEffect(() => {
    console.log("🔧 useGantt: projects state updated - count:", projects.length)
    if (projects.length > 0) {
      console.log("🔧 useGantt: Project names:", projects.map(p => p.name))
      console.log("🔧 useGantt: Project IDs:", projects.map(p => p.id))
    }
  }, [projects])

  return {
    projects,
    addProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    reorderProjects,
    reorderTasks,
    reorderSubtasks,
  }
}

