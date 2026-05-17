// Raw Google Calendar API calls — server-side only, never import from client components

export interface CalendarEventPayload {
  title: string
  description: string
  startTime: Date  // = reminder trigger_at
  endTime: Date    // = startTime + 15 minutes
}

export interface CreatedCalendarEvent {
  id: string
  htmlLink: string
}

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

function buildEventBody(payload: CalendarEventPayload) {
  return {
    summary:     payload.title,
    description: payload.description,
    start: {
      dateTime: payload.startTime.toISOString(),
      timeZone: 'Asia/Kolkata',
    },
    end: {
      dateTime: payload.endTime.toISOString(),
      timeZone: 'Asia/Kolkata',
    },
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 0 }],
    },
  }
}

export async function createCalendarEvent(
  accessToken: string,
  payload: CalendarEventPayload,
): Promise<CreatedCalendarEvent> {
  const res = await fetch(CALENDAR_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildEventBody(payload)),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[createCalendarEvent] Google API error:', res.status, body.slice(0, 300))
    throw new Error(`Google Calendar API error: ${res.status}`)
  }

  const data = await res.json()
  return { id: data.id, htmlLink: data.htmlLink }
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  payload: CalendarEventPayload,
): Promise<void> {
  const res = await fetch(`${CALENDAR_API}/${encodeURIComponent(eventId)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildEventBody(payload)),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[updateCalendarEvent] Google API error:', res.status, body.slice(0, 300))
    throw new Error(`Google Calendar API error: ${res.status}`)
  }
}

export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string,
): Promise<void> {
  const res = await fetch(`${CALENDAR_API}/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  // 404 = already deleted — treat as success
  if (!res.ok && res.status !== 404) {
    const body = await res.text()
    console.error('[deleteCalendarEvent] Google API error:', res.status, body.slice(0, 300))
    throw new Error(`Google Calendar API error: ${res.status}`)
  }
}
