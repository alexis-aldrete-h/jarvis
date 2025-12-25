import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { getWeekStart, getWeekEnd, formatDate, Task } from '@jarvis/shared'
import { useTasks } from '../hooks/useTasks'

export default function WeekScreen() {
  const { tasks } = useTasks()
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const weekStart = getWeekStart(currentDate)
  const weekEnd = getWeekEnd(currentDate)
  
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + i)
    return date
  })

  const getTasksForDay = (date: Date) => {
    return tasks.filter((task) => {
      if (!task.dueDate) return false
      const taskDate = new Date(task.dueDate)
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      )
    })
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {formatDate(weekStart)} - {formatDate(weekEnd)}
        </Text>
      </View>
      <ScrollView style={styles.scrollView}>
        {weekDays.map((day, index) => {
          const dayTasks = getTasksForDay(day)
          const isToday =
            day.getDate() === new Date().getDate() &&
            day.getMonth() === new Date().getMonth() &&
            day.getFullYear() === new Date().getFullYear()

          return (
            <View
              key={index}
              style={[styles.dayCard, isToday && styles.todayCard]}
            >
              <View style={styles.dayHeader}>
                <Text style={styles.dayName}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
                <Text style={[styles.dayNumber, isToday && styles.todayNumber]}>
                  {day.getDate()}
                </Text>
              </View>
              <View style={styles.tasksContainer}>
                {dayTasks.length === 0 ? (
                  <Text style={styles.noTasksText}>No tasks scheduled</Text>
                ) : (
                  dayTasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))
                )}
              </View>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

function TaskItem({ task }: { task: Task }) {
  const priorityColors: Record<string, string> = {
    low: '#6b7280',
    medium: '#eab308',
    high: '#f97316',
    urgent: '#ef4444',
  }

  return (
    <View
      style={[
        styles.taskItem,
        { borderLeftColor: priorityColors[task.priority] },
        task.status === 'completed' && styles.completedTask,
      ]}
    >
      <Text
        style={[
          styles.taskItemTitle,
          task.status === 'completed' && styles.completedTaskText,
        ]}
      >
        {task.title}
      </Text>
      {task.status !== 'completed' && (
        <Text style={styles.taskItemPriority}>{task.priority}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    padding: 16,
    backgroundColor: '#1e293b',
  },
  headerText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  dayCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    minHeight: 150,
  },
  todayCard: {
    borderWidth: 2,
    borderColor: '#0ea5e9',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayName: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dayNumber: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: 'bold',
  },
  todayNumber: {
    color: '#0ea5e9',
  },
  tasksContainer: {
    gap: 8,
  },
  noTasksText: {
    color: '#475569',
    fontSize: 14,
    fontStyle: 'italic',
  },
  taskItem: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    marginBottom: 4,
  },
  completedTask: {
    opacity: 0.6,
  },
  taskItemTitle: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  completedTaskText: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
  taskItemPriority: {
    color: '#94a3b8',
    fontSize: 12,
  },
})

