'use client'

import { useState, useMemo } from 'react'
import { useProjects } from '@/hooks/useProjects'
import { Project, ProjectStage, ProjectStatus, LifeCategory, Milestone, ProjectTask, ProjectSubcategory } from '@jarvis/shared'
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts'

const STAGE_COLORS: Record<ProjectStage, string> = {
  'short-term': '#f9c67a', // amber
  'medium-term': '#6b7280', // gray
  'long-term': '#171c24', // ink
}

const CATEGORY_COLORS: Record<LifeCategory, string> = {
  health: '#10b981', // green
  relationships: '#f472b6', // pink
  financial: '#3b82f6', // blue
  professional: '#8b5cf6', // purple
  fun: '#f59e0b', // orange
}

const CATEGORY_LABELS: Record<LifeCategory, string> = {
  health: 'Health',
  relationships: 'Relationships',
  financial: 'Financial',
  professional: 'Professional',
  fun: 'Fun',
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  'on-hold': 'On Hold',
  'completed': 'Completed',
}

export default function ProjectPlanner({
  onNavigateToGantt,
}: {
  onNavigateToGantt?: () => void
} = {}) {
  const {
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
  } = useProjects()

  const [selectedView, setSelectedView] = useState<'dashboard' | 'board' | 'categories' | 'timeline'>('timeline')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showProjectForm, setShowProjectForm] = useState(false)

  // Dashboard statistics
  const stats = useMemo(() => {
    const inProgress = projects.filter((p) => p.status === 'in-progress').length
    const onHold = projects.filter((p) => p.status === 'on-hold').length
    const notStarted = projects.filter((p) => p.status === 'not-started').length

    return {
      total: projects.length,
      completed: completedProjects,
      inProgress,
      onHold,
      notStarted,
    }
  }, [projects, completedProjects])

  // Chart data
  const categoryData = useMemo(() => {
    return Object.entries(projectsByCategory).map(([category, projs]) => ({
      name: CATEGORY_LABELS[category as LifeCategory],
      value: projs.length,
      color: CATEGORY_COLORS[category as LifeCategory],
    }))
  }, [projectsByCategory])

  const stageData = useMemo(() => {
    return Object.entries(projectsByStage).map(([stage, projs]) => ({
      name: stage.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      value: projs.length,
      color: STAGE_COLORS[stage as ProjectStage],
    }))
  }, [projectsByStage])

  const progressData = useMemo(() => {
    return projects
      .filter((p) => p.status === 'in-progress')
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 10)
      .map((p) => ({
        name: p.title,
        progress: p.progress,
      }))
  }, [projects])

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 bg-white/80 rounded-full p-1 border border-graphite/10">
          {(['timeline', 'dashboard', 'board', 'categories'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setSelectedView(view)}
              className={`px-4 py-1.5 text-xs uppercase tracking-wider rounded-full smooth-transition font-medium ${
                selectedView === view
                  ? 'bg-ink text-white shadow-sm'
                  : 'text-graphite/60 hover:text-ink'
              }`}
            >
              {view === 'timeline' ? 'Timeline' : view === 'dashboard' ? 'Dashboard' : view === 'board' ? 'Board' : 'Categories'}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            if (onNavigateToGantt) {
              onNavigateToGantt()
            } else {
              // Fallback: dispatch custom event for parent components to listen
              const event = new CustomEvent('navigateToView', { detail: 'gantt' })
              window.dispatchEvent(event)
            }
          }}
          className="px-4 py-1.5 text-xs font-medium bg-white border border-graphite/10 rounded-full smooth-transition text-ink hover:border-graphite/30 hover:bg-ink/5"
        >
          Gantt View
        </button>
        <button
          onClick={() => {
            if (confirm('Reset all projects with mock data? This will replace all current projects.')) {
              localStorage.removeItem('jarvis_projects')
              window.location.reload()
            }
          }}
          className="px-3 py-1.5 text-xs font-medium bg-white border border-graphite/10 rounded-full smooth-transition text-ink hover:border-graphite/30"
          title="Reset with mock data"
        >
          🔄 Reset
        </button>
        <button
          onClick={() => setShowProjectForm(!showProjectForm)}
          className="px-3 py-1.5 text-xs font-medium bg-white border border-graphite/10 rounded-full smooth-transition text-ink hover:border-graphite/30"
        >
          {showProjectForm ? 'Cancel' : '+ Project'}
        </button>
      </div>

      {/* Add Project Form */}
      {showProjectForm && (
        <ProjectForm
          onSave={(project) => {
            addProject(project)
            setShowProjectForm(false)
          }}
          onCancel={() => setShowProjectForm(false)}
        />
      )}

      {/* Timeline View */}
      {selectedView === 'timeline' && (
        <TimelineView
          projects={projects}
          projectsByStage={projectsByStage}
          onProjectClick={setSelectedProject}
        />
      )}

      {/* Dashboard View */}
      {selectedView === 'dashboard' && (
        <DashboardView
          stats={stats}
          overallProgress={overallProgress}
          categoryData={categoryData}
          stageData={stageData}
          progressData={progressData}
          projects={projects}
          onProjectClick={setSelectedProject}
        />
      )}

      {/* Board View */}
      {selectedView === 'board' && (
        <BoardView
          projectsByStage={projectsByStage}
          onProjectClick={setSelectedProject}
        />
      )}

      {/* Categories View */}
      {selectedView === 'categories' && (
        <CategoriesView
          projectsByCategory={projectsByCategory}
          onProjectClick={setSelectedProject}
        />
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdate={(updates) => updateProject(selectedProject.id, updates)}
          onDelete={() => {
            deleteProject(selectedProject.id)
            setSelectedProject(null)
          }}
          onAddMilestone={(milestone) => addMilestone(selectedProject.id, milestone)}
          onUpdateMilestone={(milestoneId, updates) => updateMilestone(selectedProject.id, milestoneId, updates)}
          onDeleteMilestone={(milestoneId) => deleteMilestone(selectedProject.id, milestoneId)}
          onAddTask={(task) => addTask(selectedProject.id, task)}
          onUpdateTask={(taskId, updates) => updateTask(selectedProject.id, taskId, updates)}
          onDeleteTask={(taskId) => deleteTask(selectedProject.id, taskId)}
        />
      )}
    </div>
  )
}

// Dashboard View Component
function DashboardView({
  stats,
  overallProgress,
  categoryData,
  stageData,
  progressData,
  projects,
  onProjectClick,
}: {
  stats: { total: number; completed: number; inProgress: number; onHold: number; notStarted: number }
  overallProgress: number
  categoryData: { name: string; value: number; color: string }[]
  stageData: { name: string; value: number; color: string }[]
  progressData: { name: string; progress: number }[]
  projects: Project[]
  onProjectClick: (project: Project) => void
}) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Projects" value={stats.total} />
        <StatCard label="Completed" value={stats.completed} color="text-green-500" />
        <StatCard label="In Progress" value={stats.inProgress} color="text-blue-500" />
        <StatCard label="On Hold" value={stats.onHold} color="text-amber-500" />
        <StatCard label="Not Started" value={stats.notStarted} color="text-graphite/60" />
      </div>

      {/* Overall Progress */}
      <div className="panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-ink">Overall Progress</h3>
          <span className="text-2xl font-bold text-ink">{overallProgress}%</span>
        </div>
        <div className="h-3 bg-linen rounded-full overflow-hidden">
          <div
            className="h-full bg-ink smooth-transition"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="panel p-6">
          <h3 className="text-lg font-semibold text-ink mb-4">Projects by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(23, 28, 36, 0.1)',
                    borderRadius: '0.75rem',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {categoryData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-graphite/70">{entry.name}</span>
                <span className="ml-auto font-semibold text-ink">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stage Distribution */}
        <div className="panel p-6">
          <h3 className="text-lg font-semibold text-ink mb-4">Projects by Stage</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(23, 28, 36, 0.1)" />
                <XAxis
                  dataKey="name"
                  stroke="rgba(23, 28, 36, 0.4)"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  stroke="rgba(23, 28, 36, 0.4)"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(23, 28, 36, 0.1)',
                    borderRadius: '0.75rem',
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Progress Projects */}
      {progressData.length > 0 && (
        <div className="panel p-6">
          <h3 className="text-lg font-semibold text-ink mb-4">Top Progress</h3>
          <div className="space-y-3">
            {progressData.map((item) => {
              const project = projects.find((p) => p.title === item.name)
              if (!project) return null
              return (
                <div
                  key={project.id}
                  onClick={() => onProjectClick(project)}
                  className="cursor-pointer hover:bg-white/50 smooth-transition p-3 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-ink">{item.name}</span>
                    <span className="text-sm font-semibold text-ink">{item.progress}%</span>
                  </div>
                  <div className="h-2 bg-linen rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ink smooth-transition"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Board View Component
function BoardView({
  projectsByStage,
  onProjectClick,
}: {
  projectsByStage: Record<ProjectStage, Project[]>
  onProjectClick: (project: Project) => void
}) {
  const stages: { stage: ProjectStage; label: string; description: string; icon: string }[] = [
    { 
      stage: 'short-term', 
      label: 'Short Term', 
      description: 'Goals to achieve in weeks',
      icon: '⚡'
    },
    { 
      stage: 'medium-term', 
      label: 'Medium Term', 
      description: 'Goals to achieve in months',
      icon: '📅'
    },
    { 
      stage: 'long-term', 
      label: 'Long Term', 
      description: 'Goals to achieve in years',
      icon: '🎯'
    },
  ]

  return (
    <div className="space-y-6">
      {/* Legend/Help Section */}
      <div className="panel p-4 bg-ink/5 border border-ink/10">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <h4 className="text-sm font-semibold text-ink mb-2">How to read this board</h4>
            <div className="space-y-1.5 text-xs text-graphite/70">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0"></div>
                <span>Completed milestone</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-ink/60 flex-shrink-0"></div>
                <span>Pending milestone</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-linen rounded-full overflow-hidden">
                  <div className="h-full bg-ink" style={{ width: '60%' }}></div>
                </div>
                <span>Task progress (completed/total)</span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <h4 className="text-sm font-semibold text-ink mb-2">Project status</h4>
            <div className="space-y-1.5 text-xs text-graphite/70">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 text-[10px] font-medium">In Progress</span>
                <span>Active work happening</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 text-[10px] font-medium">On Hold</span>
                <span>Temporarily paused</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 text-[10px] font-medium">Completed</span>
                <span>Goal achieved</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Board Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {stages.map(({ stage, label, description, icon }) => (
          <div key={stage} className="panel p-5 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{icon}</span>
                  <h3 className="text-lg font-semibold text-ink">{label}</h3>
                </div>
                <span className="text-sm text-graphite/60 bg-linen px-2 py-1 rounded-full">
                  {projectsByStage[stage].length}
                </span>
              </div>
              <p className="text-xs text-graphite/60">{description}</p>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {projectsByStage[stage].length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-xs text-graphite/50 mb-2">No projects yet</p>
                  <p className="text-xs text-graphite/40">Add a project to get started</p>
                </div>
              ) : (
                projectsByStage[stage].map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => onProjectClick(project)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Categories View Component
function CategoriesView({
  projectsByCategory,
  onProjectClick,
}: {
  projectsByCategory: Record<LifeCategory, Project[]>
  onProjectClick: (project: Project) => void
}) {
  return (
    <div className="space-y-8">
      {Object.entries(projectsByCategory).map(([category, categoryProjects]) => {
        if (categoryProjects.length === 0) return null
        return (
          <div key={category} className="panel p-6">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[category as LifeCategory] }}
              />
              <h3 className="text-xl font-semibold text-ink">{CATEGORY_LABELS[category as LifeCategory]}</h3>
              <span className="text-sm text-graphite/60">({categoryProjects.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => onProjectClick(project)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Project Card Component
function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const categoryColor = CATEGORY_COLORS[project.category]
  const statusColor = {
    'not-started': 'bg-graphite/20 text-graphite/70',
    'in-progress': 'bg-blue-500/20 text-blue-600',
    'on-hold': 'bg-amber-500/20 text-amber-600',
    'completed': 'bg-green-500/20 text-green-600',
  }[project.status]

  const completedMilestones = project.milestones.filter(m => m.completed).length
  const completedTasks = project.tasks.filter(t => t.completed).length

  return (
    <div
      onClick={onClick}
      className="panel p-4 cursor-pointer hover:shadow-md smooth-transition space-y-3 border border-graphite/10 hover:border-ink/20"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: categoryColor }}
              title={CATEGORY_LABELS[project.category]}
            />
            <h4 className="text-sm font-semibold text-ink truncate">{project.title}</h4>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium"
              style={{ backgroundColor: categoryColor }}
            >
              {CATEGORY_LABELS[project.category]}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
              {STATUS_LABELS[project.status]}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-graphite/60 font-medium">Overall Progress</span>
          <span className="font-bold text-ink">{project.progress}%</span>
        </div>
        <div className="h-2.5 bg-linen rounded-full overflow-hidden">
          <div
            className="h-full smooth-transition"
            style={{ width: `${project.progress}%`, backgroundColor: categoryColor }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-graphite/10">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-graphite/60">Milestones</span>
            <span className="font-semibold text-ink">
              {completedMilestones}/{project.milestones.length}
            </span>
          </div>
          <div className="h-1.5 bg-linen rounded-full overflow-hidden">
            <div
              className="h-full smooth-transition"
              style={{ 
                width: `${project.milestones.length > 0 ? (completedMilestones / project.milestones.length) * 100 : 0}%`, 
                backgroundColor: categoryColor 
              }}
            />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-graphite/60">Tasks</span>
            <span className="font-semibold text-ink">
              {completedTasks}/{project.tasks.length}
            </span>
          </div>
          <div className="h-1.5 bg-linen rounded-full overflow-hidden">
            <div
              className="h-full smooth-transition"
              style={{ 
                width: `${project.tasks.length > 0 ? (completedTasks / project.tasks.length) * 100 : 0}%`, 
                backgroundColor: categoryColor 
              }}
            />
          </div>
        </div>
      </div>

      {/* Quick Action Hint */}
      <div className="text-[10px] text-graphite/50 text-center pt-1">
        Click to view details →
      </div>
    </div>
  )
}

// Project Detail Modal
function ProjectDetailModal({
  project,
  onClose,
  onUpdate,
  onDelete,
  onAddMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: {
  project: Project
  onClose: () => void
  onUpdate: (updates: Partial<Project>) => void
  onDelete: () => void
  onAddMilestone: (milestone: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>) => void
  onUpdateMilestone: (milestoneId: string, updates: Partial<Milestone>) => void
  onDeleteMilestone: (milestoneId: string) => void
  onAddTask: (task: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>) => void
  onUpdateTask: (taskId: string, updates: Partial<ProjectTask>) => void
  onDeleteTask: (taskId: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="panel p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={project.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                className="text-2xl font-semibold text-ink bg-transparent border-b border-ink/20 focus:outline-none focus:border-ink"
                onBlur={() => setIsEditing(false)}
                autoFocus
              />
            ) : (
              <h2
                className="text-2xl font-semibold text-ink cursor-text"
                onClick={() => setIsEditing(true)}
              >
                {project.title}
              </h2>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span
                className="text-xs px-2 py-1 rounded-full text-white"
                style={{ backgroundColor: CATEGORY_COLORS[project.category] }}
              >
                {CATEGORY_LABELS[project.category]}
              </span>
              <select
                value={project.status}
                onChange={(e) => onUpdate({ status: e.target.value as ProjectStatus })}
                className="text-xs px-2 py-1 rounded-full border border-graphite/10 bg-white text-ink"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={project.stage}
                onChange={(e) => onUpdate({ stage: e.target.value as ProjectStage })}
                className="text-xs px-2 py-1 rounded-full border border-graphite/10 bg-white text-ink"
              >
                <option value="short-term">Short Term</option>
                <option value="medium-term">Medium Term</option>
                <option value="long-term">Long Term</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onDelete}
              className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg smooth-transition"
            >
              Delete
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs bg-ink text-white rounded-lg smooth-transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-ink">Progress</span>
            <span className="text-lg font-bold text-ink">{project.progress}%</span>
          </div>
          <div className="h-3 bg-linen rounded-full overflow-hidden">
            <div
              className="h-full smooth-transition"
              style={{
                width: `${project.progress}%`,
                backgroundColor: CATEGORY_COLORS[project.category],
              }}
            />
          </div>
        </div>

        {/* Milestones */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-ink">Milestones</h3>
            <button
              onClick={() => setShowMilestoneForm(!showMilestoneForm)}
              className="px-3 py-1 text-xs bg-white border border-graphite/10 rounded-lg text-ink hover:border-graphite/30"
            >
              + Milestone
            </button>
          </div>
          {showMilestoneForm && (
            <MilestoneForm
              onSave={(milestone) => {
                onAddMilestone(milestone)
                setShowMilestoneForm(false)
              }}
              onCancel={() => setShowMilestoneForm(false)}
            />
          )}
          <div className="space-y-3">
            {project.milestones.length === 0 ? (
              <p className="text-xs text-graphite/50 text-center py-4">No milestones yet</p>
            ) : (
              project.milestones.map((milestone) => (
                <MilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  onToggle={() =>
                    onUpdateMilestone(milestone.id, {
                      completed: !milestone.completed,
                      completedAt: !milestone.completed ? new Date().toISOString() : undefined,
                    })
                  }
                  onDelete={() => onDeleteMilestone(milestone.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Tasks */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-ink">Tasks</h3>
            <button
              onClick={() => setShowTaskForm(!showTaskForm)}
              className="px-3 py-1 text-xs bg-white border border-graphite/10 rounded-lg text-ink hover:border-graphite/30"
            >
              + Task
            </button>
          </div>
          {showTaskForm && (
            <TaskForm
              milestones={project.milestones}
              onSave={(task) => {
                onAddTask(task)
                setShowTaskForm(false)
              }}
              onCancel={() => setShowTaskForm(false)}
            />
          )}
          <div className="space-y-2">
            {project.tasks.length === 0 ? (
              <p className="text-xs text-graphite/50 text-center py-4">No tasks yet</p>
            ) : (
              project.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  milestone={project.milestones.find((m) => m.id === task.milestoneId)}
                  onToggle={() =>
                    onUpdateTask(task.id, {
                      completed: !task.completed,
                      completedAt: !task.completed ? new Date().toISOString() : undefined,
                    })
                  }
                  onDelete={() => onDeleteTask(task.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Form Components
function ProjectForm({
  onSave,
  onCancel,
}: {
  onSave: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'milestones' | 'tasks' | 'progress'>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'health' as LifeCategory,
    subcategory: 'physical' as ProjectSubcategory,
    stage: 'short-term' as ProjectStage,
    status: 'not-started' as ProjectStatus,
    targetDate: '',
  })

  const getSubcategories = (category: LifeCategory): ProjectSubcategory[] => {
    switch (category) {
      case 'health':
        return ['physical', 'mental', 'spiritual']
      case 'relationships':
        return ['myself', 'wife', 'family', 'friends']
      case 'financial':
        return ['apartment', 'furniture', 'masters-degree', 'wedding', 'travel', 'clothing']
      case 'professional':
        return ['pilot', 'personal-brand', 'aviation-marketing']
      case 'fun':
        return ['hobbies', 'activities']
      default:
        return []
    }
  }

  const subcategoryLabels: Record<ProjectSubcategory, string> = {
    physical: 'Physical',
    mental: 'Mental',
    spiritual: 'Spiritual',
    myself: 'Myself',
    wife: 'Wife',
    family: 'Family',
    friends: 'Friends',
    apartment: 'Apartment',
    furniture: 'Furniture',
    'masters-degree': "Master's Degree",
    wedding: 'Wedding',
    travel: 'Travel',
    clothing: 'Clothing',
    pilot: 'Pilot',
    'personal-brand': 'Personal Brand',
    'aviation-marketing': 'Aviation Marketing',
    hobbies: 'Hobbies',
    activities: 'Activities',
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="border border-graphite/10 rounded-xl bg-white/60 backdrop-blur-sm p-4 space-y-3">
      <input
        type="text"
        placeholder="Project title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        className="w-full px-3 py-1.5 rounded-lg border-0 bg-white/80 text-ink placeholder-graphite/40 focus:outline-none focus:ring-1 focus:ring-ink/20 smooth-transition text-sm"
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={formData.category}
          onChange={(e) => {
            const newCategory = e.target.value as LifeCategory
            const subcats = getSubcategories(newCategory)
            setFormData({ 
              ...formData, 
              category: newCategory,
              subcategory: subcats[0] || formData.subcategory
            })
          }}
          className="px-3 py-1.5 rounded-lg border-0 bg-white/80 text-ink text-sm"
        >
          <option value="health">Health</option>
          <option value="relationships">Relationships</option>
          <option value="financial">Financial</option>
          <option value="professional">Professional</option>
          <option value="fun">Fun</option>
        </select>
        <select
          value={formData.subcategory}
          onChange={(e) => setFormData({ ...formData, subcategory: e.target.value as ProjectSubcategory })}
          className="px-3 py-1.5 rounded-lg border-0 bg-white/80 text-ink text-sm"
        >
          {getSubcategories(formData.category).map((sub) => (
            <option key={sub} value={sub}>
              {subcategoryLabels[sub]}
            </option>
          ))}
        </select>
      </div>
      <select
        value={formData.stage}
        onChange={(e) => setFormData({ ...formData, stage: e.target.value as ProjectStage })}
        className="w-full px-3 py-1.5 rounded-lg border-0 bg-white/80 text-ink text-sm"
      >
        <option value="short-term">Short Term</option>
        <option value="medium-term">Medium Term</option>
        <option value="long-term">Long Term</option>
      </select>
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 px-4 py-1.5 bg-ink text-white rounded-lg font-medium hover:bg-ink/90 smooth-transition text-xs"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 bg-white border border-graphite/10 rounded-lg text-ink hover:border-graphite/30 smooth-transition text-xs"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function MilestoneForm({
  onSave,
  onCancel,
}: {
  onSave: (milestone: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetDate: '',
    completed: false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return
    onSave(formData)
    setFormData({ title: '', description: '', targetDate: '', completed: false })
  }

  return (
    <form onSubmit={handleSubmit} className="border border-graphite/10 rounded-lg bg-white/80 p-3 space-y-2 mb-3">
      <input
        type="text"
        placeholder="Milestone title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        className="w-full px-3 py-1.5 rounded-lg border-0 bg-white text-ink placeholder-graphite/40 focus:outline-none focus:ring-1 focus:ring-ink/20 text-sm"
        required
      />
      <div className="flex gap-2">
        <input
          type="date"
          value={formData.targetDate}
          onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
          className="flex-1 px-3 py-1.5 rounded-lg border-0 bg-white text-ink text-sm"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-ink text-white rounded-lg text-xs"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 bg-white border border-graphite/10 rounded-lg text-ink text-xs"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function TaskForm({
  milestones,
  onSave,
  onCancel,
}: {
  milestones: Milestone[]
  onSave: (task: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    completed: false,
    milestoneId: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return
    onSave({
      title: formData.title,
      description: formData.description || undefined,
      completed: false,
      milestoneId: formData.milestoneId || undefined,
    })
    setFormData({ title: '', description: '', completed: false, milestoneId: '' })
  }

  return (
    <form onSubmit={handleSubmit} className="border border-graphite/10 rounded-lg bg-white/80 p-3 space-y-2 mb-3">
      <input
        type="text"
        placeholder="Task title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        className="w-full px-3 py-1.5 rounded-lg border-0 bg-white text-ink placeholder-graphite/40 focus:outline-none focus:ring-1 focus:ring-ink/20 text-sm"
        required
      />
      {milestones.length > 0 && (
        <select
          value={formData.milestoneId}
          onChange={(e) => setFormData({ ...formData, milestoneId: e.target.value })}
          className="w-full px-3 py-1.5 rounded-lg border-0 bg-white text-ink text-sm"
        >
          <option value="">No milestone</option>
          {milestones.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 px-3 py-1.5 bg-ink text-white rounded-lg text-xs"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 bg-white border border-graphite/10 rounded-lg text-ink text-xs"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// Card Components
function MilestoneCard({
  milestone,
  onToggle,
  onDelete,
}: {
  milestone: Milestone
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg border border-graphite/10">
      <button
        onClick={onToggle}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 smooth-transition ${
          milestone.completed
            ? 'bg-ink border-ink text-white'
            : 'border-graphite/20 hover:border-ink'
        }`}
      >
        {milestone.completed && (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-medium ${milestone.completed ? 'line-through text-graphite/50' : 'text-ink'}`}>
          {milestone.title}
        </h4>
        {milestone.targetDate && (
          <p className="text-xs text-graphite/60">
            {new Date(milestone.targetDate).toLocaleDateString()}
          </p>
        )}
      </div>
      <button
        onClick={onDelete}
        className="text-graphite/40 hover:text-ink smooth-transition p-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function TaskCard({
  task,
  milestone,
  onToggle,
  onDelete,
}: {
  task: ProjectTask
  milestone?: Milestone
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-white/30 rounded-lg">
      <button
        onClick={onToggle}
        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 smooth-transition ${
          task.completed
            ? 'bg-ink border-ink text-white'
            : 'border-graphite/20 hover:border-ink'
        }`}
      >
        {task.completed && (
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-xs ${task.completed ? 'line-through text-graphite/50' : 'text-ink'}`}>
          {task.title}
        </p>
        {milestone && (
          <p className="text-xs text-graphite/50">→ {milestone.title}</p>
        )}
      </div>
      <button
        onClick={onDelete}
        className="text-graphite/40 hover:text-ink smooth-transition p-1"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// Timeline View Component - Visual Gantt Chart
function TimelineView({
  projects,
  projectsByStage,
  onProjectClick,
}: {
  projects: Project[]
  projectsByStage: Record<ProjectStage, Project[]>
  onProjectClick: (project: Project) => void
}) {
  const [selectedStage, setSelectedStage] = useState<ProjectStage | 'all'>('all')
  const [timeRange, setTimeRange] = useState<'1week' | '1month' | '3months' | '6months' | '1year' | '2years'>('1month')

  // Calculate timeline data with Gantt-style visualization
  const timelineData = useMemo(() => {
    const filteredProjects = selectedStage === 'all' 
      ? projects 
      : projectsByStage[selectedStage]
    
    const now = new Date()
    const months: { month: string; date: Date; year: number; monthNum: number; day?: number }[] = []
    
    let count = 0
    let increment: 'day' | 'month' = 'month'
    
    if (timeRange === '1week') {
      count = 7
      increment = 'day'
    } else if (timeRange === '1month') {
      count = 4 // 4 weeks
      increment = 'day'
    } else if (timeRange === '3months') {
      count = 3
      increment = 'month'
    } else if (timeRange === '6months') {
      count = 6
      increment = 'month'
    } else if (timeRange === '1year') {
      count = 12
      increment = 'month'
    } else {
      count = 24
      increment = 'month'
    }
    
    for (let i = 0; i < count; i++) {
      const date = new Date(now)
      if (increment === 'day') {
        if (timeRange === '1week') {
          date.setDate(date.getDate() + i)
        } else if (timeRange === '1month') {
          date.setDate(date.getDate() + i * 7) // Weekly increments for 1 month view
        }
      } else {
        date.setMonth(date.getMonth() + i)
        date.setDate(1) // Start of month
      }
      
      months.push({
        month: increment === 'day' 
          ? (timeRange === '1week' 
              ? date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
              : `Week ${i + 1}`)
          : date.toLocaleDateString('en-US', { month: 'short' }),
        date,
        year: date.getFullYear(),
        monthNum: date.getMonth(),
        day: increment === 'day' ? date.getDate() : undefined,
      })
    }
    
    return { months, projects: filteredProjects }
  }, [projects, projectsByStage, selectedStage, timeRange])

  // Get project timeline bars
  const getProjectTimeline = (project: Project) => {
    if (project.milestones.length === 0) return null
    
    const sortedMilestones = [...project.milestones]
      .filter(m => m.targetDate)
      .sort((a, b) => new Date(a.targetDate!).getTime() - new Date(b.targetDate!).getTime())
    
    if (sortedMilestones.length === 0) return null
    
    const firstMilestone = sortedMilestones[0]
    const lastMilestone = sortedMilestones[sortedMilestones.length - 1]
    const startDate = new Date(firstMilestone.targetDate!)
    const endDate = new Date(lastMilestone.targetDate!)
    
    const timelineStart = timelineData.months[0].date
    const timelineEnd = new Date(timelineData.months[timelineData.months.length - 1].date)
    
    // Adjust timeline end based on view type
    if (timeRange === '1week' || timeRange === '1month') {
      timelineEnd.setDate(timelineEnd.getDate() + 1) // Add one day for day-based views
    } else {
      timelineEnd.setMonth(timelineEnd.getMonth() + 1) // Add one month for month-based views
    }
    
    // Calculate using appropriate unit
    const isDayBased = timeRange === '1week' || timeRange === '1month'
    const totalTime = isDayBased
      ? (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24) // days
      : (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24 * 30) // months
    const startOffset = isDayBased
      ? (startDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
      : (startDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24 * 30)
    const duration = isDayBased
      ? (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      : (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    
    return {
      startPercent: Math.max(0, (startOffset / totalTime) * 100),
      widthPercent: Math.min(100, (duration / totalTime) * 100),
      milestones: sortedMilestones,
    }
  }

  return (
    <div className="space-y-6">
      {/* Timeline Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-white/80 rounded-full p-1 border border-graphite/10">
          {(['all', 'short-term', 'medium-term', 'long-term'] as const).map((stage) => (
            <button
              key={stage}
              onClick={() => setSelectedStage(stage)}
              className={`px-3 py-1 text-xs uppercase tracking-wider rounded-full smooth-transition font-medium ${
                selectedStage === stage
                  ? 'bg-ink text-white'
                  : 'text-graphite/60 hover:text-ink'
              }`}
            >
              {stage === 'all' ? 'All' : stage.replace('-', ' ')}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white/80 rounded-full p-1 border border-graphite/10">
          {(['1week', '1month', '3months', '6months', '1year', '2years'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs uppercase tracking-wider rounded-full smooth-transition font-medium ${
                timeRange === range
                  ? 'bg-ink text-white'
                  : 'text-graphite/60 hover:text-ink'
              }`}
            >
              {range === '1week' ? '1W' : range === '1month' ? '1M' : range === '3months' ? '3M' : range === '6months' ? '6M' : range === '1year' ? '1Y' : '2Y'}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Gantt Chart */}
      <div className="panel p-6 overflow-x-auto">
        <div className="min-w-full">
          {/* Month Headers */}
          <div className="flex border-b border-graphite/10 pb-3 mb-4 sticky top-0 bg-white z-10">
            <div className="w-56 flex-shrink-0">
              <p className="text-xs uppercase tracking-wider text-graphite/60 font-semibold">Project</p>
            </div>
            <div className="flex-1 flex">
              {timelineData.months.map(({ month, date, year, day }, index) => {
                const today = new Date()
                const isCurrent = 
                  timeRange === '1week' || timeRange === '1month'
                    ? date.getDate() === today.getDate() && 
                      date.getMonth() === today.getMonth() &&
                      date.getFullYear() === today.getFullYear()
                    : date.getMonth() === today.getMonth() &&
                      date.getFullYear() === today.getFullYear()
                return (
                  <div
                    key={`${year}-${date.getMonth()}-${day || date.getDate()}`}
                    className={`flex-1 text-center border-l border-graphite/10 first:border-l-0 ${
                      isCurrent ? 'bg-amber/10' : ''
                    }`}
                  >
                    <p className={`text-xs font-medium py-1 ${
                      isCurrent ? 'text-ink font-semibold' : 'text-graphite/60'
                    }`}>
                      {month}
                    </p>
                    {(timeRange === '1week' || timeRange === '1month') ? (
                      <p className="text-[10px] text-graphite/50">{date.getDate()}</p>
                    ) : (
                      <p className="text-[10px] text-graphite/50">{year}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Project Rows with Gantt Bars */}
          <div className="space-y-6">
            {timelineData.projects.map((project) => {
              const categoryColor = CATEGORY_COLORS[project.category]
              const timeline = getProjectTimeline(project)
              
              return (
                <div key={project.id} className="space-y-3">
                  {/* Project Header Row */}
                  <div className="flex items-center gap-4">
                    <div className="w-56 flex-shrink-0">
                      <div
                        onClick={() => onProjectClick(project)}
                        className="cursor-pointer hover:opacity-80 smooth-transition"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: categoryColor }}
                          />
                          <h4 className="text-sm font-semibold text-ink">{project.title}</h4>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-graphite/60">
                          <span>{CATEGORY_LABELS[project.category]}</span>
                          <span>•</span>
                          <span className="font-semibold text-ink">{project.progress}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 flex relative h-12 border border-graphite/10 rounded-lg overflow-hidden">
                      {/* Gantt Bar */}
                      {timeline && (
                        <div
                          className="absolute top-0 bottom-0 rounded-lg smooth-transition overflow-hidden"
                          style={{
                            left: `${timeline.startPercent}%`,
                            width: `${timeline.widthPercent}%`,
                            backgroundColor: `${categoryColor}15`,
                            border: `2px solid ${categoryColor}`,
                          }}
                        >
                          {/* Progress Fill */}
                          <div
                            className="absolute top-0 bottom-0 smooth-transition"
                            style={{
                              width: `${project.progress}%`,
                              backgroundColor: `${categoryColor}40`,
                            }}
                          />
                          
                          {/* Milestone Markers */}
                          {timeline.milestones.map((milestone, index) => {
                            const milestoneDate = new Date(milestone.targetDate!)
                            const timelineStart = timelineData.months[0].date
                            const timelineEnd = new Date(timelineData.months[timelineData.months.length - 1].date)
                            
                            // Adjust timeline end based on view type
                            const isDayBased = timeRange === '1week' || timeRange === '1month'
                            if (isDayBased) {
                              timelineEnd.setDate(timelineEnd.getDate() + 1)
                            } else {
                              timelineEnd.setMonth(timelineEnd.getMonth() + 1)
                            }
                            
                            const totalTime = isDayBased
                              ? (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
                              : (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24 * 30)
                            const milestoneOffset = isDayBased
                              ? (milestoneDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
                              : (milestoneDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24 * 30)
                            const position = (milestoneOffset / totalTime) * 100
                            
                            const isLongTerm = milestone.title.toLowerCase().includes('final goal')
                            const isMediumTerm = milestone.title.toLowerCase().includes('month')
                            const isShortTerm = milestone.title.toLowerCase().includes('week')
                            
                            return (
                              <div
                                key={milestone.id}
                                className="absolute top-0 bottom-0 smooth-transition"
                                style={{
                                  left: `${position - timeline.startPercent}%`,
                                  width: isLongTerm ? '3px' : isMediumTerm ? '2px' : '1px',
                                  backgroundColor: milestone.completed ? '#10b981' : categoryColor,
                                  boxShadow: milestone.completed ? '0 0 4px rgba(16, 185, 129, 0.5)' : 'none',
                                }}
                                title={`${milestone.title} - ${milestone.completed ? 'Completed' : 'Pending'}`}
                              />
                            )
                          })}
                        </div>
                      )}
                      {/* Month Grid Lines */}
                      {timelineData.months.map((_, index) => (
                        <div
                          key={index}
                          className="absolute top-0 bottom-0 border-l border-graphite/10"
                          style={{ left: `${(index / timelineData.months.length) * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Milestones List - Grouped by Type */}
                  {project.milestones.length > 0 && (
                    <div className="ml-60 space-y-3">
                      {/* Long-term milestones */}
                      {project.milestones
                        .filter(m => m.targetDate && m.title.toLowerCase().includes('final goal'))
                        .sort((a, b) => new Date(a.targetDate!).getTime() - new Date(b.targetDate!).getTime())
                        .map((milestone) => {
                          const milestoneDate = new Date(milestone.targetDate!)
                          const tasks = project.tasks.filter(t => t.milestoneId === milestone.id)
                          const completedTasks = tasks.filter(t => t.completed).length
                          const taskProgress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0
                          
                          return (
                            <div
                              key={milestone.id}
                              className="flex items-center gap-3 text-xs p-2 bg-ink/5 rounded-lg border-l-2"
                              style={{ borderColor: categoryColor }}
                            >
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: milestone.completed ? '#10b981' : categoryColor,
                                }}
                              />
                              <span className={`flex-1 font-semibold ${milestone.completed ? 'line-through text-graphite/50' : 'text-ink'}`}>
                                🎯 {milestone.title}
                              </span>
                              <span className="text-graphite/50">
                                {milestoneDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              {tasks.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-linen rounded-full overflow-hidden">
                                    <div
                                      className="h-full smooth-transition"
                                      style={{
                                        width: `${taskProgress}%`,
                                        backgroundColor: categoryColor,
                                      }}
                                    />
                                  </div>
                                  <span className="text-graphite/50 text-[10px] w-12 text-right">
                                    {completedTasks}/{tasks.length}
                                  </span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      
                      {/* Medium-term milestones */}
                      {project.milestones
                        .filter(m => m.targetDate && (m.title.toLowerCase().includes('month') || m.title.toLowerCase().includes('medium')))
                        .sort((a, b) => new Date(a.targetDate!).getTime() - new Date(b.targetDate!).getTime())
                        .slice(0, 5)
                        .map((milestone) => {
                          const milestoneDate = new Date(milestone.targetDate!)
                          const tasks = project.tasks.filter(t => t.milestoneId === milestone.id)
                          const completedTasks = tasks.filter(t => t.completed).length
                          const taskProgress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0
                          
                          return (
                            <div
                              key={milestone.id}
                              className="flex items-center gap-3 text-xs pl-4"
                            >
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: milestone.completed ? '#10b981' : categoryColor,
                                }}
                              />
                              <span className={`flex-1 ${milestone.completed ? 'line-through text-graphite/50' : 'text-ink'}`}>
                                📅 {milestone.title}
                              </span>
                              <span className="text-graphite/50">
                                {milestoneDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              {tasks.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-linen rounded-full overflow-hidden">
                                    <div
                                      className="h-full smooth-transition"
                                      style={{
                                        width: `${taskProgress}%`,
                                        backgroundColor: categoryColor,
                                      }}
                                    />
                                  </div>
                                  <span className="text-graphite/50 text-[10px] w-12 text-right">
                                    {completedTasks}/{tasks.length}
                                  </span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      
                      {/* Short-term milestones (show first 8) */}
                      {project.milestones
                        .filter(m => m.targetDate && (m.title.toLowerCase().includes('week') || m.title.toLowerCase().includes('short')))
                        .sort((a, b) => new Date(a.targetDate!).getTime() - new Date(b.targetDate!).getTime())
                        .slice(0, 8)
                        .map((milestone) => {
                          const milestoneDate = new Date(milestone.targetDate!)
                          const tasks = project.tasks.filter(t => t.milestoneId === milestone.id)
                          const completedTasks = tasks.filter(t => t.completed).length
                          const taskProgress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0
                          
                          return (
                            <div
                              key={milestone.id}
                              className="flex items-center gap-3 text-xs pl-6 text-graphite/70"
                            >
                              <div
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: milestone.completed ? '#10b981' : categoryColor,
                                }}
                              />
                              <span className={`flex-1 text-[11px] ${milestone.completed ? 'line-through text-graphite/40' : ''}`}>
                                ✓ {milestone.title}
                              </span>
                              <span className="text-graphite/40 text-[10px]">
                                {milestoneDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              {tasks.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <div className="w-12 h-1 bg-linen rounded-full overflow-hidden">
                                    <div
                                      className="h-full smooth-transition"
                                      style={{
                                        width: `${taskProgress}%`,
                                        backgroundColor: categoryColor,
                                      }}
                                    />
                                  </div>
                                  <span className="text-graphite/40 text-[9px] w-8 text-right">
                                    {completedTasks}/{tasks.length}
                                  </span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      
                      {project.milestones.filter(m => m.targetDate && m.title.toLowerCase().includes('week')).length > 8 && (
                        <div className="text-xs text-graphite/50 pl-6 italic">
                          +{project.milestones.filter(m => m.targetDate && m.title.toLowerCase().includes('week')).length - 8} more weekly milestones
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="panel p-4">
          <p className="text-xs text-graphite/60 mb-1">Total Projects</p>
          <p className="text-2xl font-semibold text-ink">
            {selectedStage === 'all' ? projects.length : projectsByStage[selectedStage].length}
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-xs text-graphite/60 mb-1">Total Milestones</p>
          <p className="text-2xl font-semibold text-ink">
            {(selectedStage === 'all' ? projects : projectsByStage[selectedStage])
              .reduce((sum, p) => sum + p.milestones.length, 0)}
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-xs text-graphite/60 mb-1">Total Tasks</p>
          <p className="text-2xl font-semibold text-ink">
            {(selectedStage === 'all' ? projects : projectsByStage[selectedStage])
              .reduce((sum, p) => sum + p.tasks.length, 0)}
          </p>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color = 'text-ink' }: { label: string; value: number; color?: string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs text-graphite/60 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  )
}

