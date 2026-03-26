-- Run this in Supabase SQL Editor to add subject management

-- 4. SUBJECTS CONFIG TABLE (admin-managed)
create table if not exists public.subjects_config (
  id          uuid primary key default gen_random_uuid(),
  department  text not null,
  year        int not null,
  semester    int not null,
  subject     text not null,
  created_at  timestamptz not null default now(),
  unique (department, year, semester, subject)
);

alter table public.subjects_config enable row level security;

-- Anyone authenticated can read
create policy "subjects_config: authenticated read"
  on public.subjects_config for select
  to authenticated
  using (true);

-- Only super_admin can insert/delete
create policy "subjects_config: admin insert"
  on public.subjects_config for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

create policy "subjects_config: admin delete"
  on public.subjects_config for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

-- Seed default MBA subjects
insert into public.subjects_config (department, year, semester, subject) values
  ('MBA', 1, 1, 'Business Economics'),
  ('MBA', 1, 1, 'Finance'),
  ('MBA', 1, 1, 'Accounts'),
  ('MBA', 1, 1, 'Business Statistics'),
  ('MBA', 1, 2, 'Financial Accounting'),
  ('MBA', 1, 2, 'Logistics'),
  ('MBA', 1, 2, 'Applied Economics'),
  ('MBA', 2, 3, 'Marketing Management'),
  ('MBA', 2, 3, 'Human Resource Management'),
  ('MBA', 2, 3, 'Operations Management'),
  ('MBA', 2, 4, 'Strategic Management'),
  ('MBA', 2, 4, 'Business Analytics'),
  ('MBA', 2, 4, 'Entrepreneurship'),
  ('MCA', 1, 1, 'Discrete Mathematics'),
  ('MCA', 1, 1, 'C Programming & Data Structures'),
  ('MCA', 1, 1, 'Computer Organization'),
  ('MCA', 1, 1, 'Probability & Statistics'),
  ('MCA', 1, 2, 'Design & Analysis of Algorithms'),
  ('MCA', 1, 2, 'Database Management Systems'),
  ('MCA', 1, 2, 'Operating Systems'),
  ('MCA', 1, 2, 'Java Programming'),
  ('MCA', 2, 3, 'Computer Networks'),
  ('MCA', 2, 3, 'Software Engineering'),
  ('MCA', 2, 3, 'Web Technologies'),
  ('MCA', 2, 3, 'Python Programming'),
  ('MCA', 2, 4, 'Machine Learning'),
  ('MCA', 2, 4, 'Cloud Computing'),
  ('MCA', 2, 4, 'Mobile Computing'),
  ('MCA', 3, 5, 'Artificial Intelligence'),
  ('MCA', 3, 5, 'Information Security'),
  ('MCA', 3, 5, 'Project Work'),
  ('MCA', 3, 6, 'Major Project'),
  ('MCA', 3, 6, 'Internship'),
  ('B.TECH', 1, 1, 'Engineering Mathematics I'),
  ('B.TECH', 1, 1, 'Engineering Physics'),
  ('B.TECH', 1, 1, 'Engineering Chemistry'),
  ('B.TECH', 1, 1, 'C Programming'),
  ('B.TECH', 1, 2, 'Engineering Mathematics II'),
  ('B.TECH', 1, 2, 'Basic Electronics'),
  ('B.TECH', 1, 2, 'Engineering Drawing'),
  ('B.TECH', 1, 2, 'Data Structures'),
  ('B.TECH', 2, 3, 'Data Structures & Algorithms'),
  ('B.TECH', 2, 3, 'Digital Logic Design'),
  ('B.TECH', 2, 3, 'Mathematics III'),
  ('B.TECH', 2, 3, 'Object Oriented Programming'),
  ('B.TECH', 2, 4, 'Design & Analysis of Algorithms'),
  ('B.TECH', 2, 4, 'Microprocessors'),
  ('B.TECH', 2, 4, 'Operating Systems'),
  ('B.TECH', 2, 4, 'Database Management Systems'),
  ('B.TECH', 3, 5, 'Computer Networks'),
  ('B.TECH', 3, 5, 'Software Engineering'),
  ('B.TECH', 3, 5, 'Compiler Design'),
  ('B.TECH', 3, 5, 'Web Technologies'),
  ('B.TECH', 3, 6, 'Machine Learning'),
  ('B.TECH', 3, 6, 'Cloud Computing'),
  ('B.TECH', 3, 6, 'Information Security'),
  ('B.TECH', 3, 6, 'Mobile Application Development'),
  ('B.TECH', 4, 7, 'Artificial Intelligence'),
  ('B.TECH', 4, 7, 'Big Data Analytics'),
  ('B.TECH', 4, 7, 'Project Management'),
  ('B.TECH', 4, 8, 'Project Work'),
  ('B.TECH', 4, 8, 'Seminar'),
  ('B.TECH', 4, 8, 'Internship'),
  ('M.TECH', 1, 1, 'Advanced Algorithms'),
  ('M.TECH', 1, 1, 'Research Methodology'),
  ('M.TECH', 1, 1, 'Advanced Database Systems'),
  ('M.TECH', 1, 2, 'Machine Learning'),
  ('M.TECH', 1, 2, 'Advanced Computer Networks'),
  ('M.TECH', 1, 2, 'Distributed Systems'),
  ('M.TECH', 2, 3, 'Thesis Work Phase I'),
  ('M.TECH', 2, 3, 'Seminar'),
  ('M.TECH', 2, 4, 'Thesis Work Phase II'),
  ('M.TECH', 2, 4, 'Viva Voce'),
  ('ARCHITECTURE', 1, 1, 'Architectural Design I'),
  ('ARCHITECTURE', 1, 1, 'Building Materials'),
  ('ARCHITECTURE', 1, 1, 'History of Architecture'),
  ('ARCHITECTURE', 1, 1, 'Architectural Drawing'),
  ('ARCHITECTURE', 1, 2, 'Architectural Design II'),
  ('ARCHITECTURE', 1, 2, 'Structural Systems'),
  ('ARCHITECTURE', 1, 2, 'Environmental Studies'),
  ('ARCHITECTURE', 2, 3, 'Architectural Design III'),
  ('ARCHITECTURE', 2, 3, 'Building Construction'),
  ('ARCHITECTURE', 2, 3, 'Urban Design'),
  ('ARCHITECTURE', 2, 4, 'Architectural Design IV'),
  ('ARCHITECTURE', 2, 4, 'Interior Design'),
  ('ARCHITECTURE', 3, 5, 'Architectural Design V'),
  ('ARCHITECTURE', 3, 5, 'Urban Planning'),
  ('ROBOTICS AND AUTOMATION', 1, 1, 'Engineering Mathematics'),
  ('ROBOTICS AND AUTOMATION', 1, 1, 'Mechanics of Machines'),
  ('ROBOTICS AND AUTOMATION', 1, 1, 'Electronics & Circuits'),
  ('ROBOTICS AND AUTOMATION', 1, 1, 'Programming Fundamentals'),
  ('ROBOTICS AND AUTOMATION', 1, 2, 'Robot Kinematics'),
  ('ROBOTICS AND AUTOMATION', 1, 2, 'Sensors & Actuators'),
  ('ROBOTICS AND AUTOMATION', 1, 2, 'Control Systems'),
  ('ROBOTICS AND AUTOMATION', 1, 2, 'Embedded Systems'),
  ('ROBOTICS AND AUTOMATION', 2, 3, 'Robot Programming'),
  ('ROBOTICS AND AUTOMATION', 2, 3, 'Machine Vision'),
  ('ROBOTICS AND AUTOMATION', 2, 3, 'Artificial Intelligence'),
  ('ROBOTICS AND AUTOMATION', 2, 3, 'Industrial Automation'),
  ('ROBOTICS AND AUTOMATION', 2, 4, 'Advanced Robotics'),
  ('ROBOTICS AND AUTOMATION', 2, 4, 'IoT & Cyber Physical Systems'),
  ('ROBOTICS AND AUTOMATION', 2, 4, 'Project Work')
on conflict (department, year, semester, subject) do nothing;
