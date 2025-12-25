'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useGanttContext } from '@/contexts/GanttContext'
import { GanttProject, GanttTask, GanttSubtask } from '@jarvis/shared'

export default function ProjectsView() {
  const {
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
    reorderTasks,
  } = useGanttContext()
  
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null)
  
  const [newProjectName, setNewProjectName] = useState('')
  const [newTaskName, setNewTaskName] = useState<Record<string, string>>({})
  const [newSubtaskName, setNewSubtaskName] = useState<Record<string, string>>({})
  
  const [showNewProject, setShowNewProject] = useState(false)
  
  // Delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'project' | 'task' | 'subtask'
    projectId?: string
    taskId?: string
    subtaskId?: string
    name: string
  } | null>(null)
  
  // Drag and drop state (still used for visual hover only)
  const draggedItemRef = useRef<{
    type: 'project' | 'task' | 'subtask'
    id: string
    projectId?: string
    taskId?: string
    index: number
  } | null>(null)
  const [draggedItem, setDraggedItem] = useState<{
    type: 'project' | 'task' | 'subtask'
    id: string
    projectId?: string
    taskId?: string
    index: number
  } | null>(null)
  const [dragOverItem, setDragOverItem] = useState<{
    type: 'project' | 'task' | 'subtask'
    id: string
    projectId?: string
    taskId?: string
    index: number
  } | null>(null)
  const [dropZoneIndex, setDropZoneIndex] = useState<{
    type: 'project' | 'task' | 'subtask'
    index: number
    projectId?: string
    taskId?: string
  } | null>(null)
  
  // Auto-expand all projects on mount
  useEffect(() => {
    setExpandedProjects(new Set(projects.map(p => p.id)))
  }, [projects.length])
  
  // Toggle project expansion
  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }
  
  // Toggle task expansion
  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }
  
  // Create new project
  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      const project = addProject(newProjectName.trim())
      setExpandedProjects(prev => new Set([...prev, project.id]))
      setNewProjectName('')
      setShowNewProject(false)
    }
  }
  
  // Start editing project name
  const handleEditProject = (projectId: string, currentName: string) => {
    setEditingProjectId(projectId)
    setNewProjectName(currentName)
  }
  
  // Save project name
  const handleSaveProjectName = (projectId: string) => {
    if (newProjectName.trim()) {
      updateProject(projectId, { name: newProjectName.trim() })
    }
    setEditingProjectId(null)
    setNewProjectName('')
  }
  
  // Create new task
  const handleCreateTask = (projectId: string, taskName?: string) => {
    const name = taskName || newTaskName[projectId]?.trim()
    if (name) {
      const task = addTask(projectId, name)
      setExpandedTasks(prev => new Set([...prev, task.id]))
      setNewTaskName(prev => ({ ...prev, [projectId]: '' }))
    }
  }
  
  // Start editing task name
  const handleEditTask = (taskId: string, currentName: string) => {
    setEditingTaskId(taskId)
    setNewTaskName(prev => ({ ...prev, [taskId]: currentName }))
  }
  
  // Save task name
  const handleSaveTaskName = (taskId: string, projectId: string) => {
    const taskName = newTaskName[taskId]?.trim()
    if (taskName) {
      updateTask(projectId, taskId, { name: taskName })
    }
    setEditingTaskId(null)
    setNewTaskName(prev => {
      const next = { ...prev }
      delete next[taskId]
      return next
    })
  }
  
  // Create new subtask
  const handleCreateSubtask = (projectId: string, taskId: string, subtaskName?: string) => {
    const name = subtaskName || newSubtaskName[taskId]?.trim()
    if (name) {
      addSubtask(projectId, taskId, name)
      setNewSubtaskName(prev => ({ ...prev, [taskId]: '' }))
    }
  }
  
  // Start editing subtask name
  const handleEditSubtask = (subtaskId: string, currentName: string) => {
    setEditingSubtaskId(subtaskId)
    setNewSubtaskName(prev => ({ ...prev, [subtaskId]: currentName }))
  }
  
  // Save subtask name
  const handleSaveSubtaskName = (projectId: string, taskId: string, subtaskId: string) => {
    const subtaskName = newSubtaskName[subtaskId]?.trim()
    if (subtaskName) {
      updateSubtask(projectId, taskId, subtaskId, { name: subtaskName })
    }
    setEditingSubtaskId(null)
    setNewSubtaskName(prev => {
      const next = { ...prev }
      delete next[subtaskId]
      return next
    })
  }
  
  // Delete handlers
  const handleDeleteProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setDeleteConfirm({
        type: 'project',
        projectId,
        name: project.name,
      })
    }
  }
  
  const handleDeleteTask = (projectId: string, taskId: string) => {
    const project = projects.find(p => p.id === projectId)
    const task = project?.children.find(t => t.id === taskId)
    if (task) {
      setDeleteConfirm({
        type: 'task',
        projectId,
        taskId,
        name: task.name,
      })
    }
  }
  
  const handleDeleteSubtask = (projectId: string, taskId: string, subtaskId: string) => {
    const project = projects.find(p => p.id === projectId)
    const task = project?.children.find(t => t.id === taskId)
    const subtask = task?.children.find(s => s.id === subtaskId)
    if (subtask) {
      setDeleteConfirm({
        type: 'subtask',
        projectId,
        taskId,
        subtaskId,
        name: subtask.name,
      })
    }
  }
  
  const confirmDelete = () => {
    if (!deleteConfirm) return
    
    if (deleteConfirm.type === 'project' && deleteConfirm.projectId) {
      deleteProject(deleteConfirm.projectId)
    } else if (deleteConfirm.type === 'task' && deleteConfirm.projectId && deleteConfirm.taskId) {
      deleteTask(deleteConfirm.projectId, deleteConfirm.taskId)
    } else if (deleteConfirm.type === 'subtask' && deleteConfirm.projectId && deleteConfirm.taskId && deleteConfirm.subtaskId) {
      deleteSubtask(deleteConfirm.projectId, deleteConfirm.taskId, deleteConfirm.subtaskId)
    }
    
    setDeleteConfirm(null)
  }
  
  const cancelDelete = () => {
    setDeleteConfirm(null)
  }
  
  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, type: 'project' | 'task' | 'subtask', id: string, index: number, projectId?: string, taskId?: string) => {
    // Check if the drag started from a button or input
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input')) {
      e.preventDefault()
      return
    }
    
    const item = { type, id, projectId, taskId, index }
    draggedItemRef.current = item
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify(item))
    console.log('Drag started:', item)
  }
  
  const handleDragOver = (e: React.DragEvent, type: 'project' | 'task' | 'subtask', id: string, index: number, projectId?: string, taskId?: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    const currentDragged = draggedItemRef.current
    if (!currentDragged) {
      e.dataTransfer.dropEffect = 'none'
      setDropZoneIndex(null)
      return
    }
    
    // Only allow reordering within the same type and context
    if (currentDragged.type !== type) {
      e.dataTransfer.dropEffect = 'none'
      setDropZoneIndex(null)
      return
    }
    
    // Check context matches for tasks and subtasks
    if (type === 'task' && currentDragged.projectId !== projectId) {
      e.dataTransfer.dropEffect = 'none'
      setDropZoneIndex(null)
      return
    }
    if (type === 'subtask' && (currentDragged.taskId !== taskId || currentDragged.projectId !== projectId)) {
      e.dataTransfer.dropEffect = 'none'
      setDropZoneIndex(null)
      return
    }
    
    // Don't allow dropping on itself
    if (currentDragged.id === id) {
      e.dataTransfer.dropEffect = 'none'
      setDropZoneIndex(null)
      return
    }
    
    // Allow the drop
    e.dataTransfer.dropEffect = 'move'
    
    // Set drag over item if it's different from dragged item
    setDragOverItem({ type, id, projectId, taskId, index })
    
    // Calculate drop zone position based on mouse position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const mouseY = e.clientY
    const elementCenterY = rect.top + rect.height / 2
    
    // Determine if we should drop before or after this item
    let dropIndex = index
    if (mouseY < elementCenterY) {
      // Dropping before this item
      dropIndex = index
    } else {
      // Dropping after this item
      dropIndex = index + 1
    }
    
    // Adjust if dragging from a position that affects the target index
    // If dragging from before the drop position, we need to account for the removed item
    if (currentDragged.index < dropIndex) {
      dropIndex = dropIndex - 1
    }
    
    setDropZoneIndex({ type, index: dropIndex, projectId, taskId })
  }
  
  const handleDragLeave = (e?: React.DragEvent) => {
    // Only clear if we're actually leaving the element (not just moving to a child)
    if (e) {
      const relatedTarget = e.relatedTarget as HTMLElement
      if (!e.currentTarget.contains(relatedTarget)) {
        setDragOverItem(null)
        setDropZoneIndex(null)
      }
    } else {
      setDragOverItem(null)
      setDropZoneIndex(null)
    }
  }
  
  const handleDrop = (e: React.DragEvent, targetType: 'project' | 'task' | 'subtask', targetId: string, targetIndex: number, targetProjectId?: string, targetTaskId?: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('=== DROP EVENT ===', { targetType, targetId, targetIndex, targetProjectId, targetTaskId })
    console.log('dropZoneIndex:', dropZoneIndex)
    
    const currentDragged = draggedItemRef.current
    console.log('currentDragged:', currentDragged)
    
    if (!currentDragged) {
      console.log('NO DRAGGED ITEM - ABORTING')
      draggedItemRef.current = null
      setDraggedItem(null)
      setDragOverItem(null)
      setDropZoneIndex(null)
      return
    }
    
    // Only allow reordering within the same type and context
    if (currentDragged.type !== targetType) {
      console.log('TYPE MISMATCH - ABORTING', { dragged: currentDragged.type, target: targetType })
      draggedItemRef.current = null
      setDraggedItem(null)
      setDragOverItem(null)
      setDropZoneIndex(null)
      return
    }
    
    // Check context matches
    if (targetType === 'task' && currentDragged.projectId !== targetProjectId) {
      console.log('TASK PROJECT MISMATCH - ABORTING', { dragged: currentDragged.projectId, target: targetProjectId })
      draggedItemRef.current = null
      setDraggedItem(null)
      setDragOverItem(null)
      setDropZoneIndex(null)
      return
    }
    
    if (targetType === 'subtask' && (currentDragged.taskId !== targetTaskId || currentDragged.projectId !== targetProjectId)) {
      console.log('SUBTASK CONTEXT MISMATCH - ABORTING', { 
        draggedTaskId: currentDragged.taskId, 
        targetTaskId,
        draggedProjectId: currentDragged.projectId,
        targetProjectId
      })
      draggedItemRef.current = null
      setDraggedItem(null)
      setDragOverItem(null)
      setDropZoneIndex(null)
      return
    }
    
    // Don't do anything if dropping on itself
    if (currentDragged.id === targetId) {
      console.log('DROPPING ON SELF - ABORTING')
      draggedItemRef.current = null
      setDraggedItem(null)
      setDragOverItem(null)
      setDropZoneIndex(null)
      return
    }
    
    // Use drop zone index if available, otherwise use target index
    let finalTargetIndex = targetIndex
    if (dropZoneIndex && dropZoneIndex.type === targetType) {
      if (targetType === 'task' && dropZoneIndex.projectId === targetProjectId) {
        finalTargetIndex = dropZoneIndex.index
        console.log('Using dropZoneIndex for task:', finalTargetIndex)
      } else if (targetType === 'subtask' && dropZoneIndex.taskId === targetTaskId && dropZoneIndex.projectId === targetProjectId) {
        finalTargetIndex = dropZoneIndex.index
        console.log('Using dropZoneIndex for subtask:', finalTargetIndex)
      } else if (targetType === 'project') {
        finalTargetIndex = dropZoneIndex.index
        console.log('Using dropZoneIndex for project:', finalTargetIndex)
      }
    } else {
      console.log('Using targetIndex (no dropZoneIndex):', finalTargetIndex)
    }
    
    // Only reorder if index actually changes
    if (currentDragged.index === finalTargetIndex) {
      console.log('SAME INDEX - NO REORDER NEEDED', { index: currentDragged.index })
      draggedItemRef.current = null
      setDraggedItem(null)
      setDragOverItem(null)
      setDropZoneIndex(null)
      return
    }
    
    console.log('=== CALLING REORDER FUNCTION ===', { 
      type: currentDragged.type, 
      from: currentDragged.index, 
      to: finalTargetIndex,
      projectId: currentDragged.projectId,
      taskId: currentDragged.taskId
    })
    
    try {
      if (currentDragged.type === 'project') {
        reorderProjects(currentDragged.index, finalTargetIndex)
      } else if (currentDragged.type === 'task') {
        reorderTasks(currentDragged.projectId!, currentDragged.index, finalTargetIndex)
      } else if (currentDragged.type === 'subtask') {
        reorderSubtasks(currentDragged.projectId!, currentDragged.taskId!, currentDragged.index, finalTargetIndex)
      }
      console.log('REORDER FUNCTION CALLED SUCCESSFULLY')
    } catch (error) {
      console.error('ERROR IN REORDER FUNCTION:', error)
    }
    
    draggedItemRef.current = null
    setDraggedItem(null)
    setDragOverItem(null)
    setDropZoneIndex(null)
  }
  
  const handleDragEnd = () => {
    draggedItemRef.current = null
    setDraggedItem(null)
    setDragOverItem(null)
    setDropZoneIndex(null)
  }
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  
  return (
    <div className="min-h-screen bg-white py-6 px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your projects, tasks, and subtasks</p>
        </div>
        
        {!showNewProject ? (
          <button
            onClick={() => setShowNewProject(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Project</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateProject()
                } else if (e.key === 'Escape') {
                  setShowNewProject(false)
                  setNewProjectName('')
                }
              }}
              placeholder="Project name..."
              className="px-3 py-2 border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 w-48"
              autoFocus
            />
            <button
              onClick={handleCreateProject}
              className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNewProject(false)
                setNewProjectName('')
              }}
              className="px-3 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              cancelDelete()
            }
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          
          {/* Modal Content */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-red-50 to-orange-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900">
                    {deleteConfirm.type === 'project' && 'Delete Project'}
                    {deleteConfirm.type === 'task' && 'Delete Task'}
                    {deleteConfirm.type === 'subtask' && 'Delete Subtask'}
                  </h3>
                  <p className="text-sm text-slate-600 mt-0.5">
                    This action cannot be undone
                  </p>
                </div>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="px-6 py-5">
              <p className="text-sm text-slate-700 leading-relaxed">
                {deleteConfirm.type === 'project' && (
                  <>
                    Are you sure you want to delete <span className="font-semibold text-slate-900">"{deleteConfirm.name}"</span>? 
                    This will permanently delete the project and all its tasks and subtasks.
                  </>
                )}
                {deleteConfirm.type === 'task' && (
                  <>
                    Are you sure you want to delete the task <span className="font-semibold text-slate-900">"{deleteConfirm.name}"</span>? 
                    This will permanently delete the task and all its subtasks.
                  </>
                )}
                {deleteConfirm.type === 'subtask' && (
                  <>
                    Are you sure you want to delete the subtask <span className="font-semibold text-slate-900">"{deleteConfirm.name}"</span>? 
                    This action cannot be undone.
                  </>
                )}
              </p>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-500">No projects yet. Create your first project!</p>
        </div>
      ) : (
        <div className="space-y-1">
          {projects.map((project, projectIndex) => (
            <ProjectCard
              key={project.id}
              project={project}
              projectIndex={projectIndex}
              isExpanded={expandedProjects.has(project.id)}
              onToggle={() => toggleProject(project.id)}
              onEdit={() => handleEditProject(project.id, project.name)}
              onDelete={() => handleDeleteProject(project.id)}
              isEditing={editingProjectId === project.id}
              editingValue={newProjectName}
              onEditingChange={setNewProjectName}
              onSave={() => handleSaveProjectName(project.id)}
              onCancel={() => {
                setEditingProjectId(null)
                setNewProjectName('')
              }}
              onAddTask={(taskName) => handleCreateTask(project.id, taskName)}
              onEditTask={handleEditTask}
              onSaveTask={(taskId) => handleSaveTaskName(taskId, project.id)}
              onCancelTask={() => {
                setEditingTaskId(null)
                setNewTaskName(prev => {
                  const next = { ...prev }
                  Object.keys(next).forEach(key => {
                    if (key.startsWith('task-')) delete next[key]
                  })
                  return next
                })
              }}
              onDeleteTask={(taskId) => handleDeleteTask(project.id, taskId)}
              editingTaskId={editingTaskId}
              taskEditingValue={newTaskName}
              onTaskEditingChange={(taskId, value) => setNewTaskName(prev => ({ ...prev, [taskId]: value }))}
              expandedTasks={expandedTasks}
              onToggleTask={toggleTask}
              onAddSubtask={(taskId, subtaskName) => handleCreateSubtask(project.id, taskId, subtaskName)}
              onEditSubtask={handleEditSubtask}
              onSaveSubtask={(taskId, subtaskId) => handleSaveSubtaskName(project.id, taskId, subtaskId)}
              onCancelSubtask={() => {
                setEditingSubtaskId(null)
                setNewSubtaskName(prev => {
                  const next = { ...prev }
                  Object.keys(next).forEach(key => {
                    if (key.startsWith('subtask-')) delete next[key]
                  })
                  return next
                })
              }}
              onDeleteSubtask={(taskId, subtaskId) => handleDeleteSubtask(project.id, taskId, subtaskId)}
              editingSubtaskId={editingSubtaskId}
              subtaskEditingValue={newSubtaskName}
              onSubtaskEditingChange={(subtaskId, value) => setNewSubtaskName(prev => ({ ...prev, [subtaskId]: value }))}
              formatDate={formatDate}
              draggedItem={draggedItem}
              dragOverItem={dragOverItem}
              dropZoneIndex={dropZoneIndex}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface ProjectCardProps {
  project: GanttProject
  projectIndex: number
  isExpanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  isEditing: boolean
  editingValue: string
  onEditingChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  onAddTask: (taskName: string) => void
  onEditTask: (taskId: string, currentName: string) => void
  onSaveTask: (taskId: string) => void
  onCancelTask: () => void
  onDeleteTask: (taskId: string) => void
  editingTaskId: string | null
  taskEditingValue: Record<string, string>
  onTaskEditingChange: (taskId: string, value: string) => void
  expandedTasks: Set<string>
  onToggleTask: (taskId: string) => void
  onAddSubtask: (taskId: string, subtaskName: string) => void
  onEditSubtask: (subtaskId: string, currentName: string) => void
  onSaveSubtask: (taskId: string, subtaskId: string) => void
  onCancelSubtask: () => void
  onDeleteSubtask: (taskId: string, subtaskId: string) => void
  editingSubtaskId: string | null
  subtaskEditingValue: Record<string, string>
  onSubtaskEditingChange: (subtaskId: string, value: string) => void
  formatDate: (date: string) => string
  draggedItem: { type: 'project' | 'task' | 'subtask'; id: string; projectId?: string; taskId?: string; index: number } | null
  dragOverItem: { type: 'project' | 'task' | 'subtask'; id: string; projectId?: string; taskId?: string; index: number } | null
  dropZoneIndex: { type: 'project' | 'task' | 'subtask'; index: number; projectId?: string; taskId?: string } | null
  onDragStart: (e: React.DragEvent, type: 'project' | 'task' | 'subtask', id: string, index: number, projectId?: string, taskId?: string) => void
  onDragOver: (e: React.DragEvent, type: 'project' | 'task' | 'subtask', id: string, index: number, projectId?: string, taskId?: string) => void
  onDragLeave: (e?: React.DragEvent) => void
  onDrop: (e: React.DragEvent, type: 'project' | 'task' | 'subtask', id: string, index: number, projectId?: string, taskId?: string) => void
  onDragEnd: () => void
}

function ProjectCard({
  project,
  projectIndex,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  isEditing,
  editingValue,
  onEditingChange,
  onSave,
  onCancel,
  onAddTask,
  onEditTask,
  onSaveTask,
  onCancelTask,
  onDeleteTask,
  editingTaskId,
  taskEditingValue,
  onTaskEditingChange,
  expandedTasks,
  onToggleTask,
  onAddSubtask,
  onEditSubtask,
  onSaveSubtask,
  onCancelSubtask,
  onDeleteSubtask,
  editingSubtaskId,
  subtaskEditingValue,
  onSubtaskEditingChange,
  formatDate,
  draggedItem,
  dragOverItem,
  dropZoneIndex,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: ProjectCardProps) {
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const taskCount = project.children.length
  
  const isDragging = draggedItem?.type === 'project' && draggedItem.id === project.id
  const isDragOver = dragOverItem?.type === 'project' && dragOverItem.id === project.id
  
  return (
    <div
      className="bg-white rounded-lg border-2 transition-all px-3 py-2 border-slate-200"
    >
      {/* Project Header - Simple row with chevron, dot, name, count, buttons */}
      <div className="flex items-center gap-3 py-2 px-1 group">
        {/* Chevron */}
            <button
              onClick={onToggle}
              onMouseDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
              draggable={false}
              className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
            >
              {isExpanded ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
            
        {/* Colored Dot */}
            <div
          className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color || '#3b82f6' }}
            />
            
        {/* Project Name */}
            {isEditing ? (
              <input
                type="text"
                value={editingValue}
                onChange={(e) => onEditingChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSave()
                  } else if (e.key === 'Escape') {
                    onCancel()
                  }
                }}
                className="flex-1 px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-slate-900 font-medium min-w-0"
                autoFocus
              />
            ) : (
              <h3
            className="text-sm font-semibold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors flex-1"
                onClick={onEdit}
              >
                {project.name}
              </h3>
            )}
        
        {/* Task Count */}
        <span className="text-xs text-slate-500 flex-shrink-0">
          {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
        </span>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
            {isEditing ? (
              <>
                <button
                  onClick={onSave}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
                >
                  Save
                </button>
                <button
                  onClick={onCancel}
                className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowNewTask(true)
                }}
                className="px-2 py-1 text-xs text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                + Add Task
                </button>
                <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="text-slate-400 hover:text-red-600 transition-colors p-1"
                title="Delete Project"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                </button>
              </>
            )}
        </div>
      </div>
      
      {/* Dashed Line Separator */}
      {isExpanded && (
        <div className="border-t border-dashed border-slate-200 my-2" />
      )}
      
      {/* Tasks Section */}
      {isExpanded && (
        <div className="pl-6 space-y-2">
          {/* New Task Input */}
          {showNewTask && (
            <div className="flex items-center gap-2 py-2">
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTaskName.trim()) {
                      onAddTask(newTaskName.trim())
                      setNewTaskName('')
                      setShowNewTask(false)
                    } else if (e.key === 'Escape') {
                      setShowNewTask(false)
                      setNewTaskName('')
                    }
                  }}
                  placeholder="Task name..."
                className="flex-1 px-3 py-1.5 border border-blue-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-slate-900"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (newTaskName.trim()) {
                      onAddTask(newTaskName.trim())
                      setNewTaskName('')
                      setShowNewTask(false)
                    }
                  }}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                Save
                </button>
                <button
                  onClick={() => {
                    setShowNewTask(false)
                    setNewTaskName('')
                  }}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
          )}
          
          {/* Tasks List */}
          {project.children.length === 0 ? null : (
            <div className="space-y-2">
              {project.children.map((task, taskIndex) => {
                // Show drop zone indicator before this task if dragging
                const showDropZoneBefore = dropZoneIndex && 
                  dropZoneIndex.type === 'task' && 
                  dropZoneIndex.projectId === project.id && 
                  dropZoneIndex.index === taskIndex
                
                return (
                  <React.Fragment key={task.id}>
                    {showDropZoneBefore && (
                      <div className="h-1 bg-blue-400 rounded-full mx-2 my-1 transition-all" />
                    )}
                    <TaskCard
                      task={task}
                      taskIndex={taskIndex}
                      projectId={project.id}
                      isExpanded={expandedTasks.has(task.id)}
                      onToggle={() => onToggleTask(task.id)}
                      onEdit={() => onEditTask(task.id, task.name)}
                      onDelete={() => onDeleteTask(task.id)}
                      isEditing={editingTaskId === task.id}
                      editingValue={taskEditingValue[task.id] || ''}
                      onEditingChange={(value) => onTaskEditingChange(task.id, value)}
                      onSave={() => onSaveTask(task.id)}
                      onCancel={onCancelTask}
                      onAddSubtask={(subtaskName) => onAddSubtask(task.id, subtaskName)}
                      onEditSubtask={onEditSubtask}
                      onSaveSubtask={(subtaskId) => onSaveSubtask(task.id, subtaskId)}
                      onCancelSubtask={onCancelSubtask}
                      onDeleteSubtask={(subtaskId) => onDeleteSubtask(task.id, subtaskId)}
                      editingSubtaskId={editingSubtaskId}
                      subtaskEditingValue={subtaskEditingValue}
                      onSubtaskEditingChange={onSubtaskEditingChange}
                      formatDate={formatDate}
                      draggedItem={draggedItem}
                      dragOverItem={dragOverItem}
                      dropZoneIndex={dropZoneIndex}
                      onDragStart={onDragStart}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                      onDragEnd={onDragEnd}
                      onMoveUp={() => reorderTasks(project.id, taskIndex, taskIndex - 1)}
                      onMoveDown={() => reorderTasks(project.id, taskIndex, taskIndex + 1)}
                      canMoveUp={taskIndex > 0}
                      canMoveDown={taskIndex < project.children.length - 1}
                    />
                    {/* Show drop zone after last task if dragging to end */}
                    {taskIndex === project.children.length - 1 && dropZoneIndex && 
                      dropZoneIndex.type === 'task' && 
                      dropZoneIndex.projectId === project.id && 
                      dropZoneIndex.index === project.children.length && (
                        <div className="h-1 bg-blue-400 rounded-full mx-2 my-1 transition-all" />
                      )}
                  </React.Fragment>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface TaskCardProps {
  task: GanttTask
  taskIndex: number
  projectId: string
  isExpanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  isEditing: boolean
  editingValue: string
  onEditingChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  onAddSubtask: (subtaskName: string) => void
  onEditSubtask: (subtaskId: string, currentName: string) => void
  onSaveSubtask: (subtaskId: string) => void
  onCancelSubtask: () => void
  onDeleteSubtask: (subtaskId: string) => void
  editingSubtaskId: string | null
  subtaskEditingValue: Record<string, string>
  onSubtaskEditingChange: (subtaskId: string, value: string) => void
  formatDate: (date: string) => string
  draggedItem: { type: 'project' | 'task' | 'subtask'; id: string; projectId?: string; taskId?: string; index: number } | null
  dragOverItem: { type: 'project' | 'task' | 'subtask'; id: string; projectId?: string; taskId?: string; index: number } | null
  dropZoneIndex: { type: 'project' | 'task' | 'subtask'; index: number; projectId?: string; taskId?: string } | null
  onDragStart: (e: React.DragEvent, type: 'project' | 'task' | 'subtask', id: string, index: number, projectId?: string, taskId?: string) => void
  onDragOver: (e: React.DragEvent, type: 'project' | 'task' | 'subtask', id: string, index: number, projectId?: string, taskId?: string) => void
  onDragLeave: (e?: React.DragEvent) => void
  onDrop: (e: React.DragEvent, type: 'project' | 'task' | 'subtask', id: string, index: number, projectId?: string, taskId?: string) => void
  onDragEnd: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}

function TaskCard({
  task,
  taskIndex,
  projectId,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  isEditing,
  editingValue,
  onEditingChange,
  onSave,
  onCancel,
  onAddSubtask,
  onEditSubtask,
  onSaveSubtask,
  onCancelSubtask,
  onDeleteSubtask,
  editingSubtaskId,
  subtaskEditingValue,
  onSubtaskEditingChange,
  formatDate,
  draggedItem,
  dragOverItem,
  dropZoneIndex,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: TaskCardProps) {
  const [showNewSubtask, setShowNewSubtask] = useState(false)
  const [newSubtaskName, setNewSubtaskName] = useState('')
  const subtaskCount = task.children.length
  
  const isDragging = draggedItem?.type === 'task' && draggedItem.id === task.id
  const isDragOver = dragOverItem?.type === 'task' && dragOverItem.id === task.id
  
  return (
    <div
      className={`bg-slate-50 rounded-lg border-2 transition-all p-3 group ${
        isDragging ? 'opacity-50 cursor-grabbing border-slate-300' : isEditing ? 'cursor-default border-slate-300' : 'cursor-grab border-slate-300'
      } ${
        isDragOver ? 'border-blue-500 bg-blue-50 shadow-md' : ''
      }`}
    >
      {/* Task Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Drag Handle removed */}
          {/* Chevron */}
          <button
            onClick={onToggle}
            onMouseDown={(e) => {
              e.stopPropagation()
            }}
            draggable={false}
            className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
          >
            {isExpanded ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
          
          {/* Task Name */}
          {isEditing ? (
            <input
              type="text"
              value={editingValue}
              onChange={(e) => onEditingChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSave()
                } else if (e.key === 'Escape') {
                  onCancel()
                }
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
              draggable={false}
              className="flex-1 px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-slate-900 font-medium min-w-0"
              autoFocus
            />
          ) : (
            <h4
              className="text-sm font-medium text-slate-800 cursor-pointer hover:text-blue-600 transition-colors flex-1 truncate"
              onClick={onEdit}
            >
              {task.name}
            </h4>
          )}
          
          {/* Subtask Count */}
          <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
            {subtaskCount} {subtaskCount === 1 ? 'subtask' : 'subtasks'}
          </span>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-2" onMouseDown={(e) => {
          e.stopPropagation()
          e.preventDefault()
        }}>
          {/* Move Up / Down */}
          <div className="flex flex-col gap-0.5 mr-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onMoveUp()
              }}
              disabled={!canMoveUp}
              className={`p-0.5 rounded transition-colors ${
                canMoveUp
                  ? 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                  : 'text-slate-200 cursor-not-allowed'
              }`}
              title="Move up"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onMoveDown()
              }}
              disabled={!canMoveDown}
              className={`p-0.5 rounded transition-colors ${
                canMoveDown
                  ? 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                  : 'text-slate-200 cursor-not-allowed'
              }`}
              title="Move down"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {isEditing ? (
            <>
              <button
                onClick={onSave}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
                draggable={false}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
              >
                Save
              </button>
              <button
                onClick={onCancel}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
                draggable={false}
                className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowNewSubtask(true)
                }}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
                draggable={false}
                className="px-2 py-1 text-xs text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                + Add Subtask
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
                draggable={false}
                className="text-slate-400 hover:text-red-600 transition-colors p-1"
                title="Delete Task"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Dashed Line Separator */}
      {isExpanded && (
        <div className="border-t border-dashed border-slate-200 my-2" />
      )}
      
      {/* Subtasks Section */}
      {isExpanded && (
        <div className="space-y-2">
          {/* New Subtask Input */}
          {showNewSubtask && (
            <div className="flex items-center gap-2 py-2">
                <input
                  type="text"
                  value={newSubtaskName}
                  onChange={(e) => setNewSubtaskName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSubtaskName.trim()) {
                      onAddSubtask(newSubtaskName.trim())
                      setNewSubtaskName('')
                      setShowNewSubtask(false)
                    } else if (e.key === 'Escape') {
                      setShowNewSubtask(false)
                      setNewSubtaskName('')
                    }
                  }}
                  placeholder="Subtask name..."
                className="flex-1 px-3 py-1.5 border border-blue-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-slate-900"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (newSubtaskName.trim()) {
                      onAddSubtask(newSubtaskName.trim())
                      setNewSubtaskName('')
                      setShowNewSubtask(false)
                    }
                  }}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                Save
                </button>
                <button
                  onClick={() => {
                    setShowNewSubtask(false)
                    setNewSubtaskName('')
                  }}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
          )}
          
          {/* Subtasks List */}
          {task.children.length === 0 ? null : (
            <div className="space-y-2">
              {task.children.map((subtask, subtaskIndex) => {
                // Show drop zone indicator before this subtask if dragging
                const showDropZoneBefore = dropZoneIndex && 
                  dropZoneIndex.type === 'subtask' && 
                  dropZoneIndex.projectId === projectId &&
                  dropZoneIndex.taskId === task.id &&
                  dropZoneIndex.index === subtaskIndex
                
                return (
                  <React.Fragment key={subtask.id}>
                    {showDropZoneBefore && (
                      <div className="h-1 bg-blue-400 rounded-full mx-2 my-1 transition-all" />
                    )}
                    <SubtaskCard
                      subtask={subtask}
                      subtaskIndex={subtaskIndex}
                      projectId={projectId}
                      taskId={task.id}
                      isEditing={editingSubtaskId === subtask.id}
                      editingValue={subtaskEditingValue[subtask.id] || ''}
                      onEditingChange={(value) => onSubtaskEditingChange(subtask.id, value)}
                      onSave={() => onSaveSubtask(subtask.id)}
                      onCancel={onCancelSubtask}
                      onEdit={() => onEditSubtask(subtask.id, subtask.name)}
                      onDelete={() => onDeleteSubtask(subtask.id)}
                      formatDate={formatDate}
                      draggedItem={draggedItem}
                      dragOverItem={dragOverItem}
                      onDragStart={onDragStart}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                      onDragEnd={onDragEnd}
                      onMoveUp={() => reorderSubtasks(projectId, task.id, subtaskIndex, subtaskIndex - 1)}
                      onMoveDown={() => reorderSubtasks(projectId, task.id, subtaskIndex, subtaskIndex + 1)}
                      canMoveUp={subtaskIndex > 0}
                      canMoveDown={subtaskIndex < task.children.length - 1}
                    />
                    {/* Show drop zone after last subtask if dragging to end */}
                    {subtaskIndex === task.children.length - 1 && dropZoneIndex && 
                      dropZoneIndex.type === 'subtask' && 
                      dropZoneIndex.projectId === projectId &&
                      dropZoneIndex.taskId === task.id &&
                      dropZoneIndex.index === task.children.length && (
                        <div className="h-1 bg-blue-400 rounded-full mx-2 my-1 transition-all" />
                      )}
                  </React.Fragment>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface SubtaskCardProps {
  subtask: GanttSubtask
  subtaskIndex: number
  projectId: string
  taskId: string
  isEditing: boolean
  editingValue: string
  onEditingChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  onEdit: () => void
  onDelete: () => void
  formatDate: (date: string) => string
  draggedItem: { type: 'project' | 'task' | 'subtask'; id: string; projectId?: string; taskId?: string; index: number } | null
  dragOverItem: { type: 'project' | 'task' | 'subtask'; id: string; projectId?: string; taskId?: string; index: number } | null
  onDragStart: (e: React.DragEvent, type: 'project' | 'task' | 'subtask', id: string, index: number, projectId?: string, taskId?: string) => void
  onDragOver: (e: React.DragEvent, type: 'project' | 'task' | 'subtask', id: string, index: number, projectId?: string, taskId?: string) => void
  onDragLeave: (e?: React.DragEvent) => void
  onDrop: (e: React.DragEvent, type: 'project' | 'task' | 'subtask', id: string, index: number, projectId?: string, taskId?: string) => void
  onDragEnd: () => void
}

function SubtaskCard({
  subtask,
  subtaskIndex,
  projectId,
  taskId,
  isEditing,
  editingValue,
  onEditingChange,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  formatDate,
  draggedItem,
  dragOverItem,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: SubtaskCardProps) {
  // Map difficulty (1-10) to closest Scrum point (1, 2, 3, 5, 8)
  const mapToScrumPoint = (diff: number): number => {
    if (diff <= 1) return 1
    if (diff <= 2) return 2
    if (diff <= 3) return 3
    if (diff <= 5) return 5
    return 8
  }
  
  const difficulty = subtask.difficulty || 5
  const scrumPoint = mapToScrumPoint(difficulty)
  const priority = subtask.priority || 'medium'
  
  const priorityColors = {
    low: 'bg-blue-100 text-blue-700 border-blue-200',
    medium: 'bg-orange-100 text-orange-700 border-orange-200',
    high: 'bg-red-100 text-red-700 border-red-200',
  }
  
  const scrumPoints = [1, 2, 3, 5, 8]
  
  const isDragging = draggedItem?.type === 'subtask' && draggedItem.id === subtask.id
  const isDragOver = dragOverItem?.type === 'subtask' && dragOverItem.id === subtask.id
  
  return (
    <div
      draggable={!isEditing}
      onDragStart={(e) => {
        onDragStart(e, 'subtask', subtask.id, subtaskIndex, projectId, taskId)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onDragOver(e, 'subtask', subtask.id, subtaskIndex, projectId, taskId)
      }}
      onDragLeave={(e) => onDragLeave(e)}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        console.log('SubtaskCard onDrop fired', { subtaskId: subtask.id, subtaskIndex, projectId, taskId, draggedItem })
        onDrop(e, 'subtask', subtask.id, subtaskIndex, projectId, taskId)
      }}
      onDragEnd={onDragEnd}
      className={`bg-white rounded-md border border-slate-100 p-3 group transition-all ${
        isDragging ? 'opacity-50 cursor-grabbing' : isEditing ? 'cursor-default' : 'cursor-grab'
      } ${
        isDragOver ? 'border-blue-400 shadow-md' : ''
      }`}
    >
      {isEditing ? (
        <div className="flex items-center gap-2">
                    <input
                      type="text"
            value={editingValue}
            onChange={(e) => onEditingChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                onSave()
                        } else if (e.key === 'Escape') {
                onCancel()
                        }
                      }}
            className="flex-1 px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-slate-900 min-w-0"
                      autoFocus
                    />
                        <button
            onClick={onSave}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
                        >
                          Save
                        </button>
                        <button
            onClick={onCancel}
            className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Subtask Title */}
            <h5
              className="text-sm font-medium text-slate-800 cursor-pointer hover:text-blue-600 transition-colors mb-2"
              onClick={onEdit}
            >
              {subtask.name}
            </h5>
            
            {/* Metadata Row */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Priority Tag */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Priority:</span>
                  </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${priorityColors[priority]}`}>
                  {priority}
                </span>
              </div>
              
              {/* Difficulty Indicator - Scrum Points */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">Difficulty:</span>
                <div className="flex items-center gap-1">
                  {scrumPoints.map((point) => (
                    <div
                      key={point}
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                        point === scrumPoint
                          ? 'bg-blue-500 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                    >
                      {point}
                </div>
              ))}
            </div>
              </div>
              
              {/* Date Range */}
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{formatDate(subtask.startDate)} → {formatDate(subtask.endDate)}</span>
              </div>
            </div>
          </div>
          
          {/* Delete Button */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="text-slate-400 hover:text-red-600 transition-colors p-1"
              title="Delete Subtask"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
