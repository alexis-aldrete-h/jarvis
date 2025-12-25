'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useGantt } from '@/hooks/useGantt'
import { GanttProject } from '@jarvis/shared'

interface GanttContextType {
  projects: GanttProject[]
  addProject: (name?: string) => GanttProject
  updateProject: (id: string, updates: Partial<GanttProject>) => void
  deleteProject: (id: string) => void
  addTask: (projectId: string, name?: string) => import('@jarvis/shared').GanttTask
  updateTask: (projectId: string, taskId: string, updates: Partial<import('@jarvis/shared').GanttTask>) => void
  deleteTask: (projectId: string, taskId: string) => void
  addSubtask: (projectId: string, taskId: string, name?: string) => import('@jarvis/shared').GanttSubtask
  updateSubtask: (projectId: string, taskId: string, subtaskId: string, updates: Partial<import('@jarvis/shared').GanttSubtask>) => void
  deleteSubtask: (projectId: string, taskId: string, subtaskId: string) => void
  reorderProjects: (fromIndex: number, toIndex: number) => void
  reorderTasks: (projectId: string, fromIndex: number, toIndex: number) => void
  reorderSubtasks: (projectId: string, taskId: string, fromIndex: number, toIndex: number) => void
}

const GanttContext = createContext<GanttContextType | undefined>(undefined)

export function GanttProvider({ children }: { children: ReactNode }) {
  const ganttValue = useGantt()
  
  return (
    <GanttContext.Provider value={ganttValue}>
      {children}
    </GanttContext.Provider>
  )
}

export function useGanttContext() {
  const context = useContext(GanttContext)
  if (context === undefined) {
    throw new Error('useGanttContext must be used within a GanttProvider')
  }
  return context
}


