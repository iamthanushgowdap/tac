import type { DayOfWeek, TimeSlotDescriptor, TimeTable, Post } from '@/types';

// Helper to format date for ICS. Example: 20240715T100000Z
const formatDateForICS = (date: Date): string => {
  return date.toISOString().replace(/-|:|\.\d{3}/g, '') + 'Z';
};

// Helper to get the upcoming date for a given day of the week and time
const getUpcomingDateTime = (dayOfWeekStr: DayOfWeek, timeStr: string): Date | null => {
  const dayMap: Record<DayOfWeek, number> = {
    Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
  };
  const targetDay = dayMap[dayOfWeekStr];
  if (targetDay === undefined) return null;

  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);

  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0; // Midnight case

  const now = new Date();
  const resultDate = new Date(now);
  resultDate.setDate(now.getDate() + (targetDay + 7 - now.getDay()) % 7);
  resultDate.setHours(hours, minutes, 0, 0);

  // If the calculated date is in the past for today, move to next week for that day
  if (resultDate < now && resultDate.toDateString() === now.toDateString() && now.getDay() === targetDay) {
    resultDate.setDate(resultDate.getDate() + 7);
  }
  
  return resultDate;
};


export const generatePostEventICS = (post: Post): string => {
  if (!post.eventDate || !post.eventStartTime || !post.eventEndTime) {
    // For non-event posts or posts missing date/time, use createdAt as a fallback or handle as error
    // For simplicity, creating a 1-hour event from createdAt if event details are missing.
    const startDate = new Date(post.createdAt);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//APSConnect//Event Calendar//EN',
      'BEGIN:VEVENT',
      `UID:${post.id}@apsconnect.example.com`,
      `DTSTAMP:${formatDateForICS(new Date())}`,
      `DTSTART:${formatDateForICS(startDate)}`,
      `DTEND:${formatDateForICS(endDate)}`,
      `SUMMARY:${post.title}`,
      `DESCRIPTION:${post.content.replace(/\n/g, '\\n')}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    return icsContent.join('\r\n');
  }

  const [year, month, day] = post.eventDate.split('-').map(Number);
  const [startHours, startMinutes] = post.eventStartTime.split(':').map(Number);
  const [endHours, endMinutes] = post.eventEndTime.split(':').map(Number);

  const startDate = new Date(year, month - 1, day, startHours, startMinutes);
  const endDate = new Date(year, month - 1, day, endHours, endMinutes);

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//APSConnect//Event Calendar//EN',
    'BEGIN:VEVENT',
    `UID:${post.id}@apsconnect.example.com`,
    `DTSTAMP:${formatDateForICS(new Date())}`,
    `DTSTART:${formatDateForICS(startDate)}`,
    `DTEND:${formatDateForICS(endDate)}`,
    `SUMMARY:${post.title}`,
    `DESCRIPTION:${post.content.replace(/\n/g, '\\n')}`,
  ];
  if (post.eventLocation) {
    icsContent.push(`LOCATION:${post.eventLocation}`);
  }
  icsContent.push('END:VEVENT');
  icsContent.push('END:VCALENDAR');
  return icsContent.join('\r\n');
};

const dayToICSFormat: Record<DayOfWeek, string> = {
  Monday: 'MO',
  Tuesday: 'TU',
  Wednesday: 'WE',
  Thursday: 'TH',
  Friday: 'FR',
  Saturday: 'SA',
};

export const generateTimetableICS = (timetable: TimeTable, timeSlots: TimeSlotDescriptor[]): string => {
  const events: string[] = [];
  const semesterEndDate = new Date(); // Assuming semester ends 4 months from now
  semesterEndDate.setMonth(semesterEndDate.getMonth() + 4);
  const untilDate = formatDateForICS(semesterEndDate).substring(0, 8); // YYYYMMDD

  timetable.schedule.forEach(daySchedule => {
    const icsDay = dayToICSFormat[daySchedule.day];
    if (!icsDay) return;

    daySchedule.entries.forEach(entry => {
      const slotDescriptor = timeSlots[entry.period];
      if (!slotDescriptor || slotDescriptor.isBreak || !entry.subject) {
        return;
      }

      const [startTimeStr, endTimeStr] = slotDescriptor.time.split(' - ');
      const startDate = getUpcomingDateTime(daySchedule.day, startTimeStr);
      const endDate = getUpcomingDateTime(daySchedule.day, endTimeStr);

      if (!startDate || !endDate) return;
      
      // Ensure startDate and endDate are in UTC for ICS
      const utcStartDate = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startDate.getHours(), startDate.getMinutes()));
      const utcEndDate = new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), endDate.getHours(), endDate.getMinutes()));


      const eventUID = `${timetable.id}-${daySchedule.day}-${entry.period}-${entry.subject.replace(/\s+/g, '')}@apsconnect.example.com`;

      events.push(
        'BEGIN:VEVENT',
        `UID:${eventUID}`,
        `DTSTAMP:${formatDateForICS(new Date())}`,
        `DTSTART:${formatDateForICS(utcStartDate)}`,
        `DTEND:${formatDateForICS(utcEndDate)}`,
        `SUMMARY:${entry.subject} (${timetable.branch} - ${timetable.semester})`,
        `RRULE:FREQ=WEEKLY;BYDAY=${icsDay};UNTIL=${untilDate}T235959Z`, // Recur weekly until semester end
        'END:VEVENT'
      );
    });
  });

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//APSConnect//Timetable Calendar//EN',
    ...events,
    'END:VCALENDAR',
  ];
  return icsContent.join('\r\n');
};


export const downloadICSFile = (filename: string, content: string): void => {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

// Helper function to parse time strings like "9:00 AM" into Date objects for a given day
export function parseTime(timeStr: string, referenceDate: Date): Date {
  const date = new Date(referenceDate);
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);

  if (modifier && modifier.toUpperCase() === 'PM' && hours < 12) {
    hours += 12;
  }
  if (modifier && modifier.toUpperCase() === 'AM' && hours === 12) { // Midnight case
    hours = 0;
  }
  date.setHours(hours, minutes, 0, 0);
  return date;
}