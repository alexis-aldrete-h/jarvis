// Test function to verify Supabase connection
// Call this from browser console: window.testSupabase()

import { supabase } from '@/lib/supabase'

export const testSupabaseConnection = async () => {
  console.log('🧪 Testing Supabase connection...')
  console.log('Supabase client:', supabase)
  
  if (!supabase) {
    console.error('❌ Supabase client is null')
    console.log('Environment variables:')
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing')
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing')
    return false
  }
  
  try {
    // Test read
    console.log('📖 Testing read...')
    const { data, error } = await supabase
      .from('gantt_projects')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Read test failed:', error)
      return false
    }
    
    console.log('✅ Read test passed')
    
    // Test write
    console.log('📝 Testing write...')
    const testProject = {
      id: `test-${Date.now()}`,
      name: 'Test Project',
      start_date: '2024-01-01',
      end_date: '2024-01-02',
      color: null,
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('gantt_projects')
      .insert(testProject)
      .select()
    
    if (insertError) {
      console.error('❌ Write test failed:', insertError)
      console.error('Error details:', JSON.stringify(insertError, null, 2))
      return false
    }
    
    console.log('✅ Write test passed:', insertData)
    
    // Clean up test data
    await supabase
      .from('gantt_projects')
      .delete()
      .eq('id', testProject.id)
    
    console.log('✅ Supabase connection test completed successfully!')
    return true
  } catch (error) {
    console.error('❌ Exception during test:', error)
    return false
  }
}

// Clear all dates for projects, tasks, and subtasks
// This will set all statuses to "TO-DO" since status is calculated from dates
export const clearAllDates = async () => {
  console.log('🗑️ Clearing all dates and setting status to TO-DO...')
  
  if (!supabase) {
    console.error('❌ Supabase client is null')
    return false
  }
  
  try {
    // Clear dates for all projects
    console.log('📝 Clearing project dates (status will be TO-DO)...')
    const { error: projectsError } = await supabase
      .from('gantt_projects')
      .update({ start_date: '', end_date: '' })
      .neq('id', '')
    
    if (projectsError) {
      console.error('❌ Error clearing project dates:', projectsError)
      return false
    }
    console.log('✅ Project dates cleared (status: TO-DO)')
    
    // Clear dates for all tasks
    console.log('📝 Clearing task dates (status will be TO-DO)...')
    const { error: tasksError } = await supabase
      .from('gantt_tasks')
      .update({ start_date: '', end_date: '' })
      .neq('id', '')
    
    if (tasksError) {
      console.error('❌ Error clearing task dates:', tasksError)
      return false
    }
    console.log('✅ Task dates cleared (status: TO-DO)')
    
    // Clear dates for all subtasks
    console.log('📝 Clearing subtask dates (status will be TO-DO)...')
    const { error: subtasksError } = await supabase
      .from('gantt_subtasks')
      .update({ start_date: '', end_date: '' })
      .neq('id', '')
    
    if (subtasksError) {
      console.error('❌ Error clearing subtask dates:', subtasksError)
      return false
    }
    console.log('✅ Subtask dates cleared (status: TO-DO)')
    
    console.log('✅ All dates cleared successfully!')
    console.log('📋 All projects, tasks, and subtasks now have TO-DO status')
    console.log('🔄 Please refresh the page to see the changes.')
    return true
  } catch (error) {
    console.error('❌ Exception clearing dates:', error)
    return false
  }
}

// Make it available globally for testing
if (typeof window !== 'undefined') {
  (window as any).testSupabase = testSupabaseConnection
  (window as any).clearAllDates = clearAllDates
}



