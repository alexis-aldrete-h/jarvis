export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskDifficulty = 1 | 2 | 3 | 5 | 8; // 1: <1hr, 2: <4hrs, 3: 1 day, 5: 3 days, 8: 1 week

export type TaskStatus = 'todo' | 'in-progress' | 'completed' | 'cancelled';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  difficulty?: TaskDifficulty; // Time estimate
  priority?: TaskPriority; // Priority level
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TimeEntry {
  id: string;
  duration: number; // in minutes
  startTime: Date | string;
  endTime: Date | string;
  type: 'work' | 'rest';
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  difficulty?: TaskDifficulty; // Time estimate in story points
  status: TaskStatus;
  dueDate?: Date | string;
  startDate?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  category?: string;
  estimatedDuration?: number; // in minutes
  timeSpent?: number; // in minutes - total time spent on this task
  timeLog?: TimeEntry[]; // Record of individual time sessions
  tags?: string[];
  subtasks?: Subtask[];
}

export interface WeekTask {
  taskId: string;
  scheduledDate: Date | string;
  scheduledTime?: string; // HH:mm format
}

