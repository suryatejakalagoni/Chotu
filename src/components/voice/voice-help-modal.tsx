'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const COMMAND_GROUPS = [
  {
    label: 'Income',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    examples: [
      'Received 500 from dad',
      'Got 1000 as allowance',
      'Earned 2000 from part-time',
      'Scholarship 5000',
      'Gift 300 from mom',
    ],
  },
  {
    label: 'Expense',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    examples: [
      'Spent 150 on lunch',
      'Paid 200 for chai',
      'Bought coffee for 30',
      'Auto 50',
      'One fifty on books',
    ],
  },
  {
    label: 'Assignment',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    examples: [
      'Maths assignment due Friday',
      'Physics homework due tomorrow at 5',
      'Submit chemistry lab by next Monday',
      'DS lab due 5th December',
    ],
  },
  {
    label: 'Exam',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    examples: [
      'Chemistry exam next Thursday at 10am',
      'Physics mid-sem on December 5',
      'Math viva tomorrow at 2pm',
      'DS quiz this Friday',
    ],
  },
  {
    label: 'Spending query',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    examples: [
      'How much did I spend this week?',
      'What did I spend on food this month?',
      'Total spend today',
      'Show my expenses this week',
    ],
  },
  {
    label: 'Reminder',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    examples: [
      'Remind me to submit form by 6pm',
      'Remind me to call dad tomorrow at 8',
      'Set a reminder to pay fees next Monday',
    ],
  },
  {
    label: 'Attendance',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    examples: [
      'Attended physics today',
      'Attended maths',
    ],
    note: 'Logged for when the attendance tracker ships.',
  },
] as const

interface Props {
  open: boolean
  onClose: () => void
}

export function VoiceHelpModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[82vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Voice commands</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-1">
          Tap the mic and say any of these. Works best on Chrome for Android.
        </p>

        <div className="space-y-5 pt-1">
          {COMMAND_GROUPS.map((group) => (
            <div key={group.label}>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold mb-2 ${group.color}`}
              >
                {group.label}
              </span>
              <ul className="space-y-1.5">
                {group.examples.map((ex) => (
                  <li
                    key={ex}
                    className="text-sm text-foreground/80 pl-3 border-l-2 border-muted font-mono"
                  >
                    &ldquo;{ex}&rdquo;
                  </li>
                ))}
              </ul>
              {'note' in group && group.note && (
                <p className="text-xs text-muted-foreground mt-1.5 italic pl-3">
                  {group.note}
                </p>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground pt-2 border-t">
          Tip: You can edit the transcript in the confirmation modal before saving.
        </p>
      </DialogContent>
    </Dialog>
  )
}
