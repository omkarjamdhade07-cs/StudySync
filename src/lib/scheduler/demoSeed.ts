/**
 * Demo seed data — 3 subjects, 15 topics, exams in 5–20 days.
 * Used by demo mode (localStorage, no network).
 * All dates are relative to `today` so the demo is always fresh.
 */
import { addDays } from 'date-fns'
import type { PlanInput, TopicInput, DayInput } from './types'

export const DEMO_SUBJECT_COLORS = {
  physics: '#6366f1',
  mathematics: '#0ea5e9',
  cybersecurity: '#10b981',
}

export function getDemoSeed(today: Date): PlanInput {
  const physicsExam = addDays(today, 10)
  const mathExam = addDays(today, 15)
  const cyberExam = addDays(today, 7)

  const topics: TopicInput[] = [
    // Physics (exam in 10 days)
    {
      id: 'demo-t1', subjectId: 'demo-physics', subjectName: 'Physics',
      examDate: physicsExam, difficulty: 4, confidence: 2,
      estimatedMinutes: 90, coverage: 0.1, missedCount: 1,
      lastThreeUnderstandings: [2], revisionStage: 0,
    },
    {
      id: 'demo-t2', subjectId: 'demo-physics', subjectName: 'Physics',
      examDate: physicsExam, difficulty: 3, confidence: 3,
      estimatedMinutes: 60, coverage: 0.3, missedCount: 0,
      lastThreeUnderstandings: [3, 4], revisionStage: 0,
    },
    {
      id: 'demo-t3', subjectId: 'demo-physics', subjectName: 'Physics',
      examDate: physicsExam, difficulty: 5, confidence: 1,
      estimatedMinutes: 120, coverage: 0.0, missedCount: 0,
      lastThreeUnderstandings: [], revisionStage: 0,
    },
    {
      id: 'demo-t4', subjectId: 'demo-physics', subjectName: 'Physics',
      examDate: physicsExam, difficulty: 2, confidence: 4,
      estimatedMinutes: 60, coverage: 0.6, missedCount: 0,
      lastThreeUnderstandings: [4, 5], revisionStage: 1,
    },
    {
      id: 'demo-t5', subjectId: 'demo-physics', subjectName: 'Physics',
      examDate: physicsExam, difficulty: 3, confidence: 3,
      estimatedMinutes: 75, coverage: 0.2, missedCount: 0,
      lastThreeUnderstandings: [], revisionStage: 0,
    },
    // Mathematics (exam in 15 days)
    {
      id: 'demo-t6', subjectId: 'demo-math', subjectName: 'Mathematics',
      examDate: mathExam, difficulty: 5, confidence: 2,
      estimatedMinutes: 120, coverage: 0.0, missedCount: 0,
      lastThreeUnderstandings: [], revisionStage: 0,
    },
    {
      id: 'demo-t7', subjectId: 'demo-math', subjectName: 'Mathematics',
      examDate: mathExam, difficulty: 4, confidence: 3,
      estimatedMinutes: 90, coverage: 0.15, missedCount: 1,
      lastThreeUnderstandings: [2, 3], revisionStage: 0,
    },
    {
      id: 'demo-t8', subjectId: 'demo-math', subjectName: 'Mathematics',
      examDate: mathExam, difficulty: 3, confidence: 4,
      estimatedMinutes: 60, coverage: 0.5, missedCount: 0,
      lastThreeUnderstandings: [4, 4, 5], revisionStage: 1,
    },
    {
      id: 'demo-t9', subjectId: 'demo-math', subjectName: 'Mathematics',
      examDate: mathExam, difficulty: 4, confidence: 2,
      estimatedMinutes: 90, coverage: 0.1, missedCount: 0,
      lastThreeUnderstandings: [2], revisionStage: 0,
    },
    {
      id: 'demo-t10', subjectId: 'demo-math', subjectName: 'Mathematics',
      examDate: mathExam, difficulty: 2, confidence: 5,
      estimatedMinutes: 45, coverage: 0.8, missedCount: 0,
      lastThreeUnderstandings: [5, 5], revisionStage: 2,
    },
    // Cyber Security (exam in 7 days — most urgent)
    {
      id: 'demo-t11', subjectId: 'demo-cyber', subjectName: 'Cyber Security',
      examDate: cyberExam, difficulty: 4, confidence: 2,
      estimatedMinutes: 90, coverage: 0.2, missedCount: 0,
      lastThreeUnderstandings: [2, 3], revisionStage: 0,
    },
    {
      id: 'demo-t12', subjectId: 'demo-cyber', subjectName: 'Cyber Security',
      examDate: cyberExam, difficulty: 3, confidence: 3,
      estimatedMinutes: 60, coverage: 0.4, missedCount: 0,
      lastThreeUnderstandings: [3, 3], revisionStage: 0,
    },
    {
      id: 'demo-t13', subjectId: 'demo-cyber', subjectName: 'Cyber Security',
      examDate: cyberExam, difficulty: 5, confidence: 1,
      estimatedMinutes: 90, coverage: 0.0, missedCount: 0,
      lastThreeUnderstandings: [], revisionStage: 0,
    },
    {
      id: 'demo-t14', subjectId: 'demo-cyber', subjectName: 'Cyber Security',
      examDate: cyberExam, difficulty: 3, confidence: 4,
      estimatedMinutes: 60, coverage: 0.6, missedCount: 0,
      lastThreeUnderstandings: [4, 5], revisionStage: 1,
    },
    {
      id: 'demo-t15', subjectId: 'demo-cyber', subjectName: 'Cyber Security',
      examDate: cyberExam, difficulty: 2, confidence: 3,
      estimatedMinutes: 45, coverage: 0.3, missedCount: 0,
      lastThreeUnderstandings: [3], revisionStage: 0,
    },
  ]

  // 90 min on weekdays (Mon–Fri), 120 min on weekends
  const days: DayInput[] = Array.from({ length: 20 }, (_, i) => {
    const date = addDays(today, i)
    const weekday = date.getDay()
    const isWeekend = weekday === 0 || weekday === 6
    return {
      date,
      capacityMinutes: isWeekend ? 120 : 90,
      lockedTasks: [],
    }
  })

  return {
    today,
    topics,
    days,
    preferences: {
      blockMinutes: 45,
      maxConsecutiveSameSubject: 2,
    },
  }
}

export const DEMO_SUBJECTS = [
  { id: 'demo-physics', name: 'Physics', color: DEMO_SUBJECT_COLORS.physics, examOffsetDays: 10 },
  { id: 'demo-math', name: 'Mathematics', color: DEMO_SUBJECT_COLORS.mathematics, examOffsetDays: 15 },
  { id: 'demo-cyber', name: 'Cyber Security', color: DEMO_SUBJECT_COLORS.cybersecurity, examOffsetDays: 7 },
]

export const DEMO_TOPIC_NAMES: Record<string, string> = {
  'demo-t1': 'Mechanics', 'demo-t2': 'Thermodynamics', 'demo-t3': 'Electromagnetism',
  'demo-t4': 'Optics', 'demo-t5': 'Modern Physics',
  'demo-t6': 'Calculus', 'demo-t7': 'Linear Algebra', 'demo-t8': 'Probability',
  'demo-t9': 'Differential Equations', 'demo-t10': 'Complex Numbers',
  'demo-t11': 'Cryptography', 'demo-t12': 'Network Security', 'demo-t13': 'Web Security',
  'demo-t14': 'Malware Analysis', 'demo-t15': 'Incident Response',
}
