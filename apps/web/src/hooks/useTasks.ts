'use client'

import { useState, useEffect } from 'react'
import { Task, TaskStatus, TaskPriority, Subtask } from '@jarvis/shared'

const STORAGE_KEY = 'jarvis_tasks'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setTasks(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to load tasks:', e)
      }
    }
  }, [])

  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTasks))
  }

  const addTask = (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveTasks([...tasks, newTask])
    return newTask
  }

  const updateTask = (id: string, updates: Partial<Task>) => {
    const updated = tasks.map((task) =>
      task.id === id
        ? { ...task, ...updates, updatedAt: new Date().toISOString() }
        : task
    )
    saveTasks(updated)
  }

  const deleteTask = (id: string) => {
    saveTasks(tasks.filter((task) => task.id !== id))
  }

  const toggleTaskStatus = (id: string) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return

    let newStatus: TaskStatus
    if (task.status === 'completed') {
      newStatus = 'todo'
    } else if (task.status === 'todo') {
      newStatus = 'in-progress'
    } else {
      newStatus = 'completed'
    }

    updateTask(id, { status: newStatus })
  }

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task || !task.subtasks) return

    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId
        ? { ...st, completed: !st.completed, updatedAt: new Date().toISOString() }
        : st
    )

    updateTask(taskId, { subtasks: updatedSubtasks })
  }

  const addSubtask = (taskId: string, title: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    const now = new Date().toISOString()
    const newSubtask: Subtask = {
      id: `subtask-${Date.now()}-${Math.random()}`,
      title,
      completed: false,
      createdAt: now,
      updatedAt: now,
    }

    const updatedSubtasks = [...(task.subtasks || []), newSubtask]
    updateTask(taskId, { subtasks: updatedSubtasks })
  }

  const deleteSubtask = (taskId: string, subtaskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task || !task.subtasks) return

    const updatedSubtasks = task.subtasks.filter((st) => st.id !== subtaskId)
    updateTask(taskId, { subtasks: updatedSubtasks })
  }

  return {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
  }
}

