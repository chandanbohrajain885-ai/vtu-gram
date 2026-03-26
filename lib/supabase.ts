import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Only instantiated in the browser — never during SSR prerendering.
// All pages that import this are 'use client' and wrapped with ssr:false dynamic imports.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

export type Badge = 'Student' | 'PhD Scholar' | 'Professor' | 'Assistant Professor'

export const BADGES: Badge[] = ['Student', 'PhD Scholar', 'Professor', 'Assistant Professor']

export const BADGE_STYLE: Record<Badge, string> = {
  'Student': 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  'PhD Scholar': 'bg-purple-900/40 text-purple-300 border-purple-700/40',
  'Professor': 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  'Assistant Professor': 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
}

export type Profile = {
  id: string
  name: string
  role: 'student' | 'super_admin'
  usn: string | null
  department: string | null
  semester: number | null
  year: number | null
  subjects: string[]
  is_approved: boolean
  avatar_url: string | null
  email: string | null
  badge: Badge | null
}

export type Content = {
  id: string
  title: string
  department: string
  semester: number
  subject: string
  chapter: string
  type: 'video' | 'short' | 'note' | 'question_paper'
  file_url: string
  status: 'approved' | 'pending'
}

export type Follow = {
  id: string
  follower_id: string
  following_id: string
}

export type Message = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
}

export type StudentNote = {
  id: string
  user_id: string
  subject: string
  content: string
}

export const DEPARTMENTS = [
  'MBA',
  'MCA',
  'B.TECH',
  'M.TECH',
  'ARCHITECTURE',
  'ROBOTICS AND AUTOMATION',
] as const

export type Department = (typeof DEPARTMENTS)[number]

export function getSubjectsForDepartmentSemester(
  department: string,
  semester: number
): string[] {
  const key = `${department}__${semester}`
  const map: Record<string, string[]> = {
    'B.TECH__1': ['Engineering Mathematics I', 'Engineering Physics', 'Engineering Chemistry', 'C Programming'],
    'B.TECH__2': ['Engineering Mathematics II', 'Basic Electronics', 'Engineering Drawing', 'Data Structures'],
    'B.TECH__3': ['Data Structures & Algorithms', 'Digital Logic Design', 'Mathematics III', 'Object Oriented Programming'],
    'B.TECH__4': ['Design & Analysis of Algorithms', 'Microprocessors', 'Operating Systems', 'Database Management Systems'],
    'B.TECH__5': ['Computer Networks', 'Software Engineering', 'Compiler Design', 'Web Technologies'],
    'B.TECH__6': ['Machine Learning', 'Cloud Computing', 'Information Security', 'Mobile Application Development'],
    'B.TECH__7': ['Artificial Intelligence', 'Big Data Analytics', 'Project Management', 'Elective I'],
    'B.TECH__8': ['Project Work', 'Seminar', 'Elective II', 'Internship'],
    'MCA__1': ['Discrete Mathematics', 'C Programming & Data Structures', 'Computer Organization', 'Probability & Statistics'],
    'MCA__2': ['Design & Analysis of Algorithms', 'Database Management Systems', 'Operating Systems', 'Java Programming'],
    'MCA__3': ['Computer Networks', 'Software Engineering', 'Web Technologies', 'Python Programming'],
    'MCA__4': ['Machine Learning', 'Cloud Computing', 'Mobile Computing', 'Elective I'],
    'MCA__5': ['Artificial Intelligence', 'Information Security', 'Project Work', 'Seminar'],
    'MCA__6': ['Major Project', 'Internship', 'Elective II', 'Viva Voce'],
    'MBA__1': ['Management Principles', 'Financial Accounting', 'Business Economics', 'Organizational Behavior'],
    'MBA__2': ['Marketing Management', 'Financial Management', 'Human Resource Management', 'Operations Management'],
    'MBA__3': ['Strategic Management', 'Business Analytics', 'Entrepreneurship', 'Elective I'],
    'MBA__4': ['Project Management', 'International Business', 'Major Project', 'Viva Voce'],
    'M.TECH__1': ['Advanced Algorithms', 'Research Methodology', 'Advanced Database Systems', 'Elective I'],
    'M.TECH__2': ['Machine Learning', 'Advanced Computer Networks', 'Distributed Systems', 'Elective II'],
    'M.TECH__3': ['Thesis Work Phase I', 'Seminar', 'Elective III', 'Technical Writing'],
    'M.TECH__4': ['Thesis Work Phase II', 'Viva Voce', 'Publication', 'Internship'],
    'ARCHITECTURE__1': ['Architectural Design I', 'Building Materials', 'History of Architecture', 'Architectural Drawing'],
    'ARCHITECTURE__2': ['Architectural Design II', 'Structural Systems', 'Environmental Studies', 'Computer Aided Design'],
    'ARCHITECTURE__3': ['Architectural Design III', 'Building Construction', 'Urban Design', 'Landscape Architecture'],
    'ARCHITECTURE__4': ['Architectural Design IV', 'Interior Design', 'Building Services', 'Professional Practice'],
    'ARCHITECTURE__5': ['Architectural Design V', 'Urban Planning', 'Thesis Preparation', 'Elective I'],
    'ROBOTICS AND AUTOMATION__1': ['Engineering Mathematics', 'Mechanics of Machines', 'Electronics & Circuits', 'Programming Fundamentals'],
    'ROBOTICS AND AUTOMATION__2': ['Robot Kinematics', 'Sensors & Actuators', 'Control Systems', 'Embedded Systems'],
    'ROBOTICS AND AUTOMATION__3': ['Robot Programming', 'Machine Vision', 'Artificial Intelligence', 'Industrial Automation'],
    'ROBOTICS AND AUTOMATION__4': ['Advanced Robotics', 'IoT & Cyber Physical Systems', 'Project Work', 'Elective I'],
  }

  return map[key] ?? [
    `${department} Core Subject I`,
    `${department} Core Subject II`,
    `${department} Elective I`,
    'Research Methodology',
  ]
}
