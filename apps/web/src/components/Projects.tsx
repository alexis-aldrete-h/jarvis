'use client'

import { useState, useRef, useEffect } from 'react'
import { useGanttContext } from '@/contexts/GanttContext'
import { GanttProject, GanttTask, GanttSubtask } from '@jarvis/shared'

export default function Projects() {
  const { projects, addProject, updateProject, deleteProject, addTask, updateTask, deleteTask, addSubtask, updateSubtask, deleteSubtask } = useGanttContext()
  
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null)
  
  const [newProjectName, setNewProjectName] = useState('')
  const [newTaskName, setNewTaskName] = useState<Record<string, string>>({})
  const [newSubtaskName, setNewSubtaskName] = useState<Record<string, string>>({})
  
  const [showNewProject, setShowNewProject] = useState(false)
  
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
    if (confirm('Delete this project and all its tasks and subtasks?')) {
      deleteProject(projectId)
    }
  }
  
  const handleDeleteTask = (projectId: string, taskId: string) => {
    if (confirm('Delete this task and all its subtasks?')) {
      deleteTask(projectId, taskId)
    }
  }
  
  const handleDeleteSubtask = (projectId: string, taskId: string, subtaskId: string) => {
    deleteSubtask(projectId, taskId, subtaskId)
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-ink mb-2">Projects</h1>
          <p className="text-slate-600">Create and manage your projects with tasks and subtasks</p>
        </div>
        
        {/* New Project Input */}
        {showNewProject ? (
          <div className="mb-6 p-4 bg-white rounded-xl border-2 border-blue-300 shadow-sm">
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
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-ink"
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCreateProject}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Create Project
              </button>
              <button
                onClick={() => {
                  setShowNewProject(false)
                  setNewProjectName('')
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewProject(true)}
            className="mb-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            <span>New Project</span>
          </button>
        )}
        
        {/* Projects List */}
        <div className="space-y-4">
          {projects.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <p className="text-slate-500 text-lg">No projects yet. Create your first project!</p>
            </div>
          ) : (
            projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
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
                onAddTask={(taskName) => {
                  handleCreateTask(project.id, taskName)
                }}
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
                onAddSubtask={(taskId, subtaskName) => {
                  handleCreateSubtask(project.id, taskId, subtaskName)
                }}
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
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

interface ProjectCardProps {
  project: GanttProject
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
}

function ProjectCard({
  project,
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
}: ProjectCardProps) {
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Project Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={onToggle}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              {isExpanded ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
            
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
                className="flex-1 px-3 py-1.5 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-ink"
                autoFocus
              />
            ) : (
              <h3
                className="text-lg font-semibold text-ink cursor-pointer hover:text-blue-600 transition-colors flex-1"
                onClick={onEdit}
              >
                {project.name}
              </h3>
            )}
            
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color || '#3b82f6' }}
            />
          </div>
          
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={onSave}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={onCancel}
                  className="px-3 py-1.5 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onEdit}
                  className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={onDelete}
                  className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 transition-colors"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Tasks */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {/* New Task Input */}
          {showNewTask ? (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2">
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
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-ink"
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  Save Task
                </button>
                <button
                  onClick={() => {
                    setShowNewTask(false)
                    setNewTaskName('')
                  }}
                  className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewTask(true)}
              className="w-full px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2 border border-dashed border-slate-300"
            >
              <span>+</span>
              <span>Add Task</span>
            </button>
          )}
          
          {/* Tasks List */}
          {project.children.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No tasks yet</p>
          ) : (
            project.children.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
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
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

interface TaskCardProps {
  task: GanttTask
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
}

function TaskCard({
  task,
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
}: TaskCardProps) {
  const [showNewSubtask, setShowNewSubtask] = useState(false)
  const [newSubtaskName, setNewSubtaskName] = useState('')
  
  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
      {/* Task Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={onToggle}
            className="text-slate-400 hover:text-slate-600 transition-colors"
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
              className="flex-1 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-ink"
              autoFocus
            />
          ) : (
            <h4
              className="text-sm font-medium text-slate-800 cursor-pointer hover:text-blue-600 transition-colors flex-1"
              onClick={onEdit}
            >
              {task.name}
            </h4>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={onSave}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
              <button
                onClick={onCancel}
                className="px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onEdit}
                className="px-2 py-1 text-xs text-slate-600 hover:text-slate-800 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={onDelete}
                className="px-2 py-1 text-xs text-red-600 hover:text-red-800 transition-colors"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Subtasks */}
      {isExpanded && (
        <div className="ml-6 mt-2 space-y-2">
          {/* New Subtask Input */}
          {showNewSubtask ? (
            <div className="p-2 bg-white rounded border border-slate-200">
              <div className="flex items-center gap-2">
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
                  className="flex-1 px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-ink"
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
                  className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-medium whitespace-nowrap"
                >
                  Save Subtask
                </button>
                <button
                  onClick={() => {
                    setShowNewSubtask(false)
                    setNewSubtaskName('')
                  }}
                  className="px-2 py-1.5 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewSubtask(true)}
              className="w-full px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-white rounded transition-colors flex items-center gap-2 border border-dashed border-slate-300"
            >
              <span>+</span>
              <span>Add Subtask</span>
            </button>
          )}
          
          {/* Subtasks List */}
          {task.children.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">No subtasks yet</p>
          ) : (
            task.children.map((subtask) => (
              <div key={subtask.id} className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                {editingSubtaskId === subtask.id ? (
                  <input
                    type="text"
                    value={subtaskEditingValue[subtask.id] || ''}
                    onChange={(e) => onSubtaskEditingChange(subtask.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onSaveSubtask(subtask.id)
                      } else if (e.key === 'Escape') {
                        onCancelSubtask()
                      }
                    }}
                    className="flex-1 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-ink"
                    autoFocus
                  />
                ) : (
                  <span
                    className="text-xs text-slate-700 cursor-pointer hover:text-blue-600 transition-colors flex-1"
                    onClick={() => onEditSubtask(subtask.id, subtask.name)}
                  >
                    {subtask.name}
                  </span>
                )}
                
                <div className="flex items-center gap-2">
                  {editingSubtaskId === subtask.id ? (
                    <>
                      <button
                        onClick={() => onSaveSubtask(subtask.id)}
                        className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={onCancelSubtask}
                        className="px-2 py-0.5 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => onEditSubtask(subtask.id, subtask.name)}
                        className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteSubtask(subtask.id)}
                        className="px-2 py-0.5 text-xs text-red-600 hover:text-red-800 transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

