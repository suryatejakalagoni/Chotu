export type ExamReminderType = '1_week' | '3_days' | '1_day' | 'morning_of' | '1_hour'

export interface ExamReminderSelection {
  reminder_type: ExamReminderType
}

export function calcExamTriggerAt(examAt: Date, type: ExamReminderType): Date | null {
  const now = new Date()
  let trigger: Date

  switch (type) {
    case '1_week':
      trigger = new Date(examAt.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '3_days':
      trigger = new Date(examAt.getTime() - 3 * 24 * 60 * 60 * 1000)
      break
    case '1_day':
      trigger = new Date(examAt.getTime() - 24 * 60 * 60 * 1000)
      break
    case '1_hour':
      trigger = new Date(examAt.getTime() - 60 * 60 * 1000)
      break
    case 'morning_of':
      // 8:00 AM IST = 02:30 UTC
      trigger = new Date(Date.UTC(
        examAt.getUTCFullYear(),
        examAt.getUTCMonth(),
        examAt.getUTCDate(),
        2, 30, 0,
      ))
      break
    default:
      return null
  }

  return trigger > now ? trigger : null
}
