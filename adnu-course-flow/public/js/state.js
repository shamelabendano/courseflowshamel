// state.js — shared app data; all other JS files read from here

var appState = {
  courses:       [],     // full list from the server
  currentCourse: null,   // whichever course is selected
  activeYear:    1,      // which year tab is open
  currentView:   'year'  // 'year' or 'overview'
};

var YEAR_LABELS = {
  1: 'First Year',
  2: 'Second Year',
  3: 'Third Year',
  4: 'Fourth Year'
};

var SEM_LABELS = {
  1: 'First Semester',
  2: 'Second Semester',
  3: 'Summer'
};

var CATEGORY_LABELS = {
  'Core':       'Core Subject',
  'Major':      'Major Subject',
  'Elective':   'Elective Subject',
  'Gen Ed':     'General Education Subject',
  'Non-Credit': 'Non-Credit Subject'
};
