import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://woqhizacenduogpxglen.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcWhpemFjZW5kdW9ncHhnbGVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNzMzNTIsImV4cCI6MjEwNTc0OTM1Mn0.4tOcZb-Z2asUwy6rj6AcLcDREO-KijpLsOYOgEB62AM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const dummySchedule = {
    pkg_no: 1,
    logic1: 'Test Logic',
    cm_school_name: 'Test School',
    cm_course_name: 'Test Course',
    program_code: 'BTECH-CSE',
    semester: 1,
    elective: undefined,
    paper_code: 'P-1',
    sm_subject_name: 'Test Subject',
    student_count: 50,
    regular_count: 40,
    backlog_count: 10,
    exam_day: 1,
    exam_date: '2026-05-14',
    date_odd_even: '14-05-2026_Odd',
    am_pm: 'AM',
    exam_time: '10:30 am to 12:30 pm',
    exam_type: 'Regular',
    exam_year: '2026'
  };

  const { data, error } = await supabase.from('exam_schedules').insert([dummySchedule]).select();
  if (error) {
    console.error('Insert Failed:', error);
  } else {
    console.log('Insert Succeeded:', data);
  }
}

testInsert();
