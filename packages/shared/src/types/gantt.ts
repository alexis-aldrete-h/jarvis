import { TaskPriority } from './task';

export type StoryPoint = 0.5 | 1 | 2 | 3 | 5 | 8;

export type GanttStatus = 'backlog' | 'sprint' | 'today' | 'active' | 'completed' | 'refinement' | 'routine';

export interface GanttSubtask {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  parentTaskId: string;
  color?: string;
  priority?: TaskPriority;
  storyPoints?: StoryPoint;
  category?: string;
  difficulty?: number;
  status?: GanttStatus;
  verified?: boolean;
}

export interface GanttTask {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  parentProjectId: string;
  color?: string;
  priority?: TaskPriority;
  category?: string;
  totalPoints?: number;
  children: GanttSubtask[];
  status?: GanttStatus;
  verified?: boolean;
}

export interface GanttProject {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  color?: string;
  priority?: TaskPriority;
  category?: string;
  children: GanttTask[];
  status?: GanttStatus;
  verified?: boolean;
}
