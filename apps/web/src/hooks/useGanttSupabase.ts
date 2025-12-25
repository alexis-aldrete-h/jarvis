import { supabase } from '@/lib/supabase'
import { GanttProject, GanttTask, GanttSubtask } from '@jarvis/shared'

// Check if Supabase is configured
const isSupabaseConfigured = (): boolean => {
  const configured = supabase !== null
  if (!configured) {
    console.log('🔍 Supabase check: Not configured (supabase is null)')
  } else {
    console.log('🔍 Supabase check: Configured ✓')
  }
  return configured
}

// Load all projects with their tasks and subtasks from Supabase
export const loadProjectsFromSupabase = async (): Promise<GanttProject[]> => {
  if (!isSupabaseConfigured()) {
    return []
  }

  try {
    // Load all projects
    const { data: projectsData, error: projectsError } = await supabase
      .from('gantt_projects')
      .select('*')
      .order('order', { ascending: true })

    if (projectsError) {
      console.error('Error loading projects:', projectsError)
      return []
    }

    if (!projectsData || projectsData.length === 0) {
      return []
    }

    // Load all tasks
    const { data: tasksData, error: tasksError } = await supabase
      .from('gantt_tasks')
      .select('*')
      .order('order', { ascending: true })

    if (tasksError) {
      console.error('Error loading tasks:', tasksError)
      return []
    }

    // Load all subtasks
    const { data: subtasksData, error: subtasksError } = await supabase
      .from('gantt_subtasks')
      .select('*')
      .order('order', { ascending: true })

    if (subtasksError) {
      console.error('Error loading subtasks:', subtasksError)
      return []
    }

    // Build hierarchical structure
    const projects: GanttProject[] = projectsData.map((p: any) => {
      const projectTasks = (tasksData || [])
        .filter((t: any) => t.project_id === p.id)
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        .map((t: any) => {
          const taskSubtasks = (subtasksData || [])
            .filter((st: any) => st.task_id === t.id)
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
            .map((st: any): GanttSubtask => ({
              id: st.id,
              name: st.name,
              startDate: st.start_date,
              endDate: st.end_date,
              parentTaskId: st.task_id,
              color: st.color || undefined,
              priority: st.priority || undefined,
              category: st.category || undefined,
              storyPoints: st.story_points || undefined,
              difficulty: st.difficulty || undefined,
              status: st.status || undefined,
              verified: st.verified || false,
            }))

          return {
            id: t.id,
            name: t.name,
            startDate: t.start_date,
            endDate: t.end_date,
            parentProjectId: t.project_id,
            color: t.color || undefined,
            priority: t.priority || undefined,
            category: t.category || undefined,
            // @ts-expect-error totalPoints may exist at runtime
            totalPoints: t.total_points || undefined,
            status: t.status || undefined,
            verified: t.verified || false,
            children: taskSubtasks,
          } as GanttTask
        })

      return {
        id: p.id,
        name: p.name,
        startDate: p.start_date,
        endDate: p.end_date,
        color: p.color || undefined,
        priority: p.priority || undefined,
        category: p.category || undefined,
        status: p.status || undefined,
        verified: p.verified || false,
        children: projectTasks,
      } as GanttProject
    })

    return projects
  } catch (error) {
    console.error('Error loading from Supabase:', error)
    return []
  }
}

// Save all projects to Supabase
export const saveProjectsToSupabase = async (projects: GanttProject[]): Promise<boolean> => {
  console.log('🔍 saveProjectsToSupabase called with', projects.length, 'projects')
  
  if (!isSupabaseConfigured()) {
    console.log('❌ Supabase not configured, skipping save')
    return false
  }

  if (!supabase) {
    console.error('❌ Supabase client is null even though isSupabaseConfigured returned true')
    return false
  }
  
  console.log('✅ Supabase client is available, proceeding with save...')

  try {
    console.log('🔄 Saving to Supabase:', { projectCount: projects.length })
    
    // If no projects to save, clear database and return
    if (projects.length === 0) {
      console.log('📭 No projects to save, clearing database...')
      // Delete all existing data
      await supabase.from('gantt_subtasks').delete().neq('id', '')
      await supabase.from('gantt_tasks').delete().neq('id', '')
      await supabase.from('gantt_projects').delete().neq('id', '')
      console.log('✅ Database cleared')
      return true
    }

    // Collect all current IDs from the projects array
    const currentProjectIds = new Set(projects.map(p => p.id))
    const currentTaskIds = new Set<string>()
    const currentSubtaskIds = new Set<string>()
    
    projects.forEach((p) => {
      p.children?.forEach((t) => {
        currentTaskIds.add(t.id)
        t.children?.forEach((st) => {
          currentSubtaskIds.add(st.id)
        })
      })
    })

    // Get all existing IDs from database
    const { data: existingProjects } = await supabase
      .from('gantt_projects')
      .select('id')
    
    const { data: existingTasks } = await supabase
      .from('gantt_tasks')
      .select('id')
    
    const { data: existingSubtasks } = await supabase
      .from('gantt_subtasks')
      .select('id')

    // Delete orphaned records (those that exist in DB but not in current data)
    if (existingProjects) {
      const orphanedProjects = existingProjects
        .filter(p => !currentProjectIds.has(p.id))
        .map(p => p.id)
      
      if (orphanedProjects.length > 0) {
        console.log('🗑️ Deleting orphaned projects:', orphanedProjects.length)
        const { error: deleteError } = await supabase
          .from('gantt_projects')
          .delete()
          .in('id', orphanedProjects)
        
        if (deleteError) {
          console.error('❌ Error deleting orphaned projects:', deleteError)
        } else {
          console.log('✅ Deleted orphaned projects')
        }
      }
    }

    if (existingTasks) {
      const orphanedTasks = existingTasks
        .filter(t => !currentTaskIds.has(t.id))
        .map(t => t.id)
      
      if (orphanedTasks.length > 0) {
        console.log('🗑️ Deleting orphaned tasks:', orphanedTasks.length)
        const { error: deleteError } = await supabase
          .from('gantt_tasks')
          .delete()
          .in('id', orphanedTasks)
        
        if (deleteError) {
          console.error('❌ Error deleting orphaned tasks:', deleteError)
        } else {
          console.log('✅ Deleted orphaned tasks')
        }
      }
    }

    if (existingSubtasks) {
      const orphanedSubtasks = existingSubtasks
        .filter(st => !currentSubtaskIds.has(st.id))
        .map(st => st.id)
      
      if (orphanedSubtasks.length > 0) {
        console.log('🗑️ Deleting orphaned subtasks:', orphanedSubtasks.length)
        const { error: deleteError } = await supabase
          .from('gantt_subtasks')
          .delete()
          .in('id', orphanedSubtasks)
        
        if (deleteError) {
          console.error('❌ Error deleting orphaned subtasks:', deleteError)
        } else {
          console.log('✅ Deleted orphaned subtasks')
        }
      }
    }

    // Use upsert (insert or update) for projects - this handles both new and existing
    const projectsToInsert = projects.map((p, index) => ({
      id: p.id,
      name: p.name,
      start_date: p.startDate || '',
      end_date: p.endDate || '',
      color: p.color || null,
      priority: p.priority || null,
      category: p.category || null,
      status: p.status || 'backlog',
      verified: p.verified || false,
      order: index,
    }))

    console.log('📝 Upserting projects:', projectsToInsert.length)
    const { data: projectsData, error: projectsError } = await supabase
      .from('gantt_projects')
      .upsert(projectsToInsert, { onConflict: 'id' })
      .select()

    if (projectsError) {
      console.error('❌ Error saving projects:', projectsError)
      console.error('Error details:', JSON.stringify(projectsError, null, 2))
      console.error('Projects data sample:', projectsToInsert.slice(0, 1))
      return false
    }
    console.log('✅ Projects saved:', projectsData?.length || 0)

    // Insert tasks
    const tasksToInsert: any[] = []
    projects.forEach((p) => {
      p.children?.forEach((t, taskIndex) => {
        tasksToInsert.push({
          id: t.id,
          project_id: p.id,
          name: t.name,
          start_date: t.startDate || '',
          end_date: t.endDate || '',
          color: t.color || null,
          priority: t.priority || null,
          category: t.category || null,
          total_points: (t as any).totalPoints || null,
          status: t.status || 'backlog',
          verified: t.verified || false,
          order: taskIndex,
        })
      })
    })

    if (tasksToInsert.length > 0) {
      console.log('📝 Upserting tasks:', tasksToInsert.length)
      const { data: tasksData, error: tasksError } = await supabase
        .from('gantt_tasks')
        .upsert(tasksToInsert, { onConflict: 'id' })
        .select()

      if (tasksError) {
        console.error('❌ Error saving tasks:', tasksError)
        console.error('Error details:', JSON.stringify(tasksError, null, 2))
        console.error('Tasks data sample:', tasksToInsert.slice(0, 2))
        return false
      }
      console.log('✅ Tasks saved:', tasksData?.length || 0)
    }

    // Insert subtasks
    const subtasksToInsert: any[] = []
    projects.forEach((p) => {
      p.children?.forEach((t) => {
        t.children?.forEach((st, subtaskIndex) => {
          subtasksToInsert.push({
            id: st.id,
            task_id: t.id,
            project_id: p.id,
            name: st.name,
            start_date: st.startDate || '',
            end_date: st.endDate || '',
            color: st.color || null,
            priority: st.priority || null,
            category: st.category || null,
            story_points: st.storyPoints || null,
            difficulty: st.difficulty || null,
            status: st.status || 'backlog',
            verified: st.verified || false,
            order: subtaskIndex,
          })
        })
      })
    })

    if (subtasksToInsert.length > 0) {
      console.log('📝 Upserting subtasks:', subtasksToInsert.length)
      const { data: subtasksData, error: subtasksError } = await supabase
        .from('gantt_subtasks')
        .upsert(subtasksToInsert, { onConflict: 'id' })
        .select()

      if (subtasksError) {
        console.error('❌ Error saving subtasks:', subtasksError)
        console.error('Error details:', JSON.stringify(subtasksError, null, 2))
        console.error('Subtasks data sample:', subtasksToInsert.slice(0, 2))
        return false
      }
      console.log('✅ Subtasks saved:', subtasksData?.length || 0)
    }

    console.log('✅ All data saved successfully to Supabase!')
    return true
  } catch (error) {
    console.error('❌ Exception saving to Supabase:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return false
  }
}

