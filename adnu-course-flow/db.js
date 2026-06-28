//
//
//    Tables:
//   "Courses"                  → id, course_name, course_code, color
//   "Subjects and Year Levels" → id, course_id, subject_code, subject_name,
//                                   subject_details, year_level, semester, units, category, instructor
//   "Prerequisites"            → id, subj_id, prerequisite_id

const supabase = require('./supabase');

const COURSES_TABLE  = 'Courses';
const SUBJECTS_TABLE = 'Subjects and Year Levels';
const PREREQS_TABLE  = 'Prerequisites';

const CATEGORY_COLORS = {
  'core':        '#31289b',
  'major':       '#2f6fb0',
  'elective':    '#4fa5a4',
  'gen ed':      '#3c7a4e',
  'Non-Credit':  '#bf9845'
};

const CATEGORY_LABELS = {
  'Core':       'Core Subject',
  'Major':      'Major Subject',
  'Elective':   'Elective',
  'Gen Ed':     'General Education',
  'Non-Credit': 'Non-Credit'
};


// ── COURSES ───────────────────────────────────────────────────────────────────

// Returns a flat list of all courses (for the sidebar)
async function getAllCourses() {
  var result = await supabase
    .from(COURSES_TABLE)
    .select('id, course_name, course_code, color')
    .order('id', { ascending: true });

  if (result.error) throw result.error;

  return result.data.map(function(c) {
    return { id: c.id, name: c.course_name, code: c.course_code, color: c.color || '#1c3f73' };
  });
}

// Inserts a new course row
async function addCourse(courseData) {
  var result = await supabase
    .from(COURSES_TABLE)
    .insert({ course_name: courseData.name, course_code: courseData.code, color: courseData.color || '#1c3f73' })
    .select()
    .single();

  if (result.error) throw result.error;

  return { id: result.data.id, name: result.data.course_name, code: result.data.course_code, color: result.data.color || '#1c3f73' };
}


// ── COURSE FLOW ───────────────────────────────────────────────────────────────

// Returns a course with subjects nested into a 4-year × 3-semester grid
async function getCourseFlow(courseId) {

  // 1. Course info
  var courseResult = await supabase
    .from(COURSES_TABLE)
    .select('id, course_name, course_code, color')
    .eq('id', courseId)
    .single();

  if (courseResult.error) throw courseResult.error;
  if (!courseResult.data) return null;

  var course = courseResult.data;

  // 2. All subjects for this course
  var subjectsResult = await supabase
    .from(SUBJECTS_TABLE)
    .select('id, subject_code, subject_name, subject_details, year_level, semester, units, category, instructor')
    .eq('course_id', courseId)
    .order('id', { ascending: true });

  if (subjectsResult.error) throw subjectsResult.error;

  var subjects = subjectsResult.data;

  // 3. Prerequisite links → build a map: { subjectId: [prereqId, ...] }
  var prereqMap = {};
  var subjectIds = subjects.map(function(s) { return s.id; });

  if (subjectIds.length > 0) {
    var prereqResult = await supabase
      .from(PREREQS_TABLE)
      .select('subj_id, prerequisite_id')
      .in('subj_id', subjectIds);

    if (prereqResult.error) throw prereqResult.error;

    prereqResult.data.forEach(function(link) {
      if (!prereqMap[link.subj_id]) prereqMap[link.subj_id] = [];
      prereqMap[link.subj_id].push(link.prerequisite_id);
    });
  }

  // 4. Arrange into grid
  var years = [1, 2, 3, 4].map(function(yearNum) {
    return {
      year: yearNum,
      semesters: [1, 2, 3].map(function(semNum) {
        return {
          semester: semNum,
          subjects: subjects
            .filter(function(s) { return s.year_level === yearNum && s.semester === semNum; })
            .map(function(s) {
              return {
                id:            s.id,
                code:          s.subject_code,
                name:          s.subject_name,
                units:         s.units || 3,
                category:      s.category || 'major',
                color:         CATEGORY_COLORS[s.category] || '#666666',
                prerequisites: prereqMap[s.id] || [],
                year:          s.year_level,
                semester:      s.semester
              };
            })
        };
      })
    };
  });

  return { id: course.id, name: course.course_name, code: course.course_code, color: course.color || '#1c3f73', years: years };
}


// ── SUBJECT DETAIL ────────────────────────────────────────────────────────────

// Returns full subject data with resolved prerequisite names
async function getSubject(subjectId) {
  var subjectResult = await supabase
    .from(SUBJECTS_TABLE)
    .select('*')
    .eq('id', subjectId)
    .single();

  if (subjectResult.error) throw subjectResult.error;
  if (!subjectResult.data) return null;

  var subject = subjectResult.data;

  // Get prerequisite IDs, then resolve their names
  var linksResult = await supabase
    .from(PREREQS_TABLE)
    .select('prerequisite_id')
    .eq('subj_id', subjectId);

  if (linksResult.error) throw linksResult.error;

  var prerequisites = [];

  if (linksResult.data.length > 0) {
    var prereqIds = linksResult.data.map(function(l) { return l.prerequisite_id; });

    var prereqSubjectsResult = await supabase
      .from(SUBJECTS_TABLE)
      .select('id, subject_code, subject_name')
      .in('id', prereqIds);

    if (prereqSubjectsResult.error) throw prereqSubjectsResult.error;

    prerequisites = prereqSubjectsResult.data.map(function(p) {
      return { id: p.id, code: p.subject_code, name: p.subject_name };
    });
  }

  return {
    id:            subject.id,
    code:          subject.subject_code,
    name:          subject.subject_name,
    description:   subject.subject_details || '',
    units:         subject.units || 3,
    category:      subject.category || 'major',
    instructor:    subject.instructor || 'TBA',
    year:          subject.year_level,
    semester:      subject.semester,
    color:         CATEGORY_COLORS[subject.category] || '#666666',
    categoryLabel: CATEGORY_LABELS[subject.category] || subject.category,
    prerequisites: prerequisites
  };
}


// ── ADD SUBJECT ───────────────────────────────────────────────────────────────

// Inserts a subject and any prerequisite links
async function addSubject(courseId, payload) {
  var subjectResult = await supabase
    .from(SUBJECTS_TABLE)
    .insert({
      course_id:       courseId,
      subject_code:    payload.code,
      subject_name:    payload.name,
      subject_details: payload.description || '',
      units:           Number(payload.units) || 3,
      category:        payload.category || 'major',
      instructor:      payload.instructor || 'TBA',
      year_level:      Number(payload.year),
      semester:        Number(payload.semester)
    })
    .select()
    .single();

  if (subjectResult.error) throw subjectResult.error;

  var newSubject = subjectResult.data;

  // Resolve prerequisite codes → IDs and insert links
  if (payload.prerequisiteCodes && payload.prerequisiteCodes.length > 0) {
    var prereqSubjectsResult = await supabase
      .from(SUBJECTS_TABLE)
      .select('id, subject_code')
      .eq('course_id', courseId)
      .in('subject_code', payload.prerequisiteCodes);

    if (prereqSubjectsResult.data && prereqSubjectsResult.data.length > 0) {
      var links = prereqSubjectsResult.data.map(function(p) {
        return { subj_id: newSubject.id, prerequisite_id: p.id };
      });

      var linkResult = await supabase.from(PREREQS_TABLE).insert(links);
      if (linkResult.error) throw linkResult.error;
    }
  }

  return { id: newSubject.id, code: newSubject.subject_code, name: newSubject.subject_name, year: newSubject.year_level, semester: newSubject.semester };
}


// ── DELETE ────────────────────────────────────────────────────────────────────

// Deletes a course plus all its subjects and prerequisite links
async function deleteCourse(courseId) {
  var subjectsResult = await supabase.from(SUBJECTS_TABLE).select('id').eq('course_id', courseId);
  if (subjectsResult.error) throw subjectsResult.error;

  var subjectIds = (subjectsResult.data || []).map(function(s) { return s.id; });

  if (subjectIds.length > 0) {
    var prereqDel = await supabase
      .from(PREREQS_TABLE)
      .delete()
      .or('subj_id.in.(' + subjectIds.join(',') + '),prerequisite_id.in.(' + subjectIds.join(',') + ')');
    if (prereqDel.error) throw prereqDel.error;

    var subDel = await supabase.from(SUBJECTS_TABLE).delete().eq('course_id', courseId);
    if (subDel.error) throw subDel.error;
  }

  var courseDel = await supabase.from(COURSES_TABLE).delete().eq('id', courseId);
  if (courseDel.error) throw courseDel.error;
}

// Deletes a subject and any prerequisite links involving it
async function deleteSubject(subjectId) {
  var prereqDel = await supabase
    .from(PREREQS_TABLE)
    .delete()
    .or('subj_id.eq.' + subjectId + ',prerequisite_id.eq.' + subjectId);
  if (prereqDel.error) throw prereqDel.error;

  var subDel = await supabase.from(SUBJECTS_TABLE).delete().eq('id', subjectId);
  if (subDel.error) throw subDel.error;
}


module.exports = { getAllCourses, addCourse, getCourseFlow, getSubject, addSubject, deleteCourse, deleteSubject };
