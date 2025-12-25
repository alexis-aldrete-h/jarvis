import { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Task, TaskStatus, TaskPriority } from '@jarvis/shared'

const STORAGE_KEY = 'jarvis_tasks'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY)
      if (stored) {
        setTasks(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Failed to load tasks:', e)
    }
  }

  const saveTasks = async (newTasks: Task[]) => {
    try {
      setTasks(newTasks)
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTasks))
    } catch (e) {
      console.error('Failed to save tasks:', e)
    }
  }

  const addTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await saveTasks([...tasks, newTask])
    return newTask
  }

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const updated = tasks.map((task) =>
      task.id === id
        ? { ...task, ...updates, updatedAt: new Date().toISOString() }
        : task
    )
    await saveTasks(updated)
  }

  const deleteTask = async (id: string) => {
    await saveTasks(tasks.filter((task) => task.id !== id))
  }

  const toggleTaskStatus = async (id: string) => {
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

    await updateTask(id, { status: newStatus })
  }

  return {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
  }
}

