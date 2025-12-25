import { Task } from './task';

export interface DaySchedule {
  date: Date | string;
  tasks: Task[];
  events: CalendarEvent[];
  notes?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date | string;
  endTime: Date | string;
  location?: string;
  color?: string;
}

export interface WeekView {
  weekStart: Date | string;
  weekEnd: Date | string;
  days: DaySchedule[];
}

export interface TimeBlock {
  id: string;
  taskId?: string;
  eventId?: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  title: string;
  type: 'task' | 'event' | 'break' | 'free';
}

