-- ============================================================================
-- Acharya360 ExamTrack - Seed Local Database Users to Supabase
-- Inserts / updates all 8 active users (7 team members + CoE)
-- ============================================================================

INSERT INTO public.profiles (id, email, password, full_name, role, department, title, created_at, last_password_change)
VALUES
  (
    'user-coe-1',
    'coe@sspu.ac.in',
    'Admin@123',
    'Dr. Sunita Nikam',
    'COE',
    'Central Examination Office',
    'Controller of Examinations',
    '2026-01-10T09:00:00Z',
    NOW()
  ),
  (
    'user-dycoe-1',
    'DyCoe@sspu.ac.in',
    'Admin@123',
    'Dr. Kiran Shende',
    'DYCOE',
    'Central Examination Office',
    'Deputy Controller of Examinations',
    '2026-01-12T10:00:00Z',
    NOW()
  ),
  (
    'user-acoe-1',
    'Acoe@sspu.ac.in',
    'Admin@123',
    'Mr. Keshav B. Jankar',
    'ACOE',
    'Central Examination Office',
    'Assistant Controller of Examinations',
    '2026-01-15T11:30:00Z',
    NOW()
  ),
  (
    'user-1792693422261',
    'amit.vartikar@sspu.ac.in',
    'Admin@123',
    'Mr. Amit Vartikar',
    'COORDINATOR',
    'Examination Department',
    'Exam Coordinator',
    '2026-10-22T23:53:42Z',
    NOW()
  ),
  (
    'user-1792693422403',
    'shreyasi.joshi@sspu.ac.in',
    'Admin@123',
    'Ms. Shreyasi Joshi',
    'COORDINATOR',
    'Examination Department',
    'Exam Coordinator',
    '2026-10-22T23:53:42Z',
    NOW()
  ),
  (
    'user-1792693422489',
    'prathmesh.londhe@sspu.ac.in',
    'Admin@123',
    'Mr. Prathmesh Londhe',
    'COORDINATOR',
    'Examination Department',
    'Exam Coordinator',
    '2026-10-22T23:53:42Z',
    NOW()
  ),
  (
    'user-1792693422591',
    'rajkumar.wankhade@sspu.ac.in',
    'Admin@123',
    'Mr. Rajkumar Wankhade',
    'COORDINATOR',
    'Examination Department',
    'Exam Coordinator',
    '2026-10-22T23:53:42Z',
    NOW()
  ),
  (
    'user-coord-mvjwta5a-x5op',
    'suresh.patil@sspu.ac.in',
    'Admin@123',
    'Dr. Suresh Patil',
    'COORDINATOR',
    'Examination Department',
    'Exam Coordinator',
    '2026-10-23T00:33:54Z',
    NOW()
  )
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  title = EXCLUDED.title,
  last_password_change = NOW();

-- Verification query: list all profiles and their roles
SELECT id, email, full_name, role, department, title FROM public.profiles ORDER BY role, full_name;
