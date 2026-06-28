// courses.js — sidebar course list: load, render, select, delete

async function loadCourses() {
  var response = await fetch('/api/courses');
  appState.courses = await response.json();
  renderSidebar();
}

function renderSidebar() {
  var nav = getEl('courseList');
  nav.innerHTML = '';

  if (appState.courses.length === 0) {
    nav.innerHTML = '<div class="loading-hint">No courses yet — add one!</div>';
    return;
  }

  appState.courses.forEach(function(course) {
    var row = document.createElement('div');
    row.className = 'course-item-row';

    var courseButton = document.createElement('button');
    courseButton.className = 'course-item';

    // Highlight if this is the active course
    if (appState.currentCourse && appState.currentCourse.id === course.id) {
      courseButton.className += ' active';
    }

    courseButton.innerHTML = course.name + '<span class="code">' + course.code + '</span>';
    courseButton.addEventListener('click', function() {
      selectCourse(course.id);
    });

    var deleteButton = document.createElement('button');
    deleteButton.className = 'course-delete-x';
    deleteButton.title = 'Delete course';
    deleteButton.textContent = '×';
    deleteButton.addEventListener('click', function(e) {
      e.stopPropagation(); // don't also trigger selectCourse
      deleteCourse(course.id, course.name);
    });

    row.appendChild(courseButton);
    row.appendChild(deleteButton);
    nav.appendChild(row);
  });
}

async function selectCourse(courseId) {
  var response = await fetch('/api/courses/' + courseId);
  if (!response.ok) return;

  appState.currentCourse = await response.json();
  appState.activeYear    = 1;
  appState.currentView   = 'year';

  renderSidebar();

  getEl('courseTitle').textContent    = appState.currentCourse.name + ' Course Flow';
  getEl('courseSubtitle').textContent = appState.currentCourse.code + ' · click a subject to view its details';
  getEl('addSubjectBtn').hidden       = false;

  // Reset the view toggle to Year View
  getEl('viewToggle').hidden = false;
  document.querySelectorAll('.view-btn').forEach(function(btn) {
    btn.classList.remove('active');
  });
  document.querySelector('[data-view="year"]').classList.add('active');
  getEl('yearView').hidden     = false;
  getEl('overviewView').hidden = true;

  renderYearTabs();
  renderGrid();
  closeDetail();
}

async function deleteCourse(courseId, courseName) {
  var confirmed = confirm(
    'Delete "' + courseName + '"? ' +
    'This will also delete all its subjects and prerequisite links. ' +
    'This cannot be undone.'
  );
  if (!confirmed) return;

  var response = await fetch('/api/courses/' + courseId, { method: 'DELETE' });

  if (!response.ok) {
    var data = await response.json().catch(function() { return {}; });
    alert(data.error || 'Failed to delete course.');
    return;
  }

  // If this was the open course, clear the main area
  if (appState.currentCourse && appState.currentCourse.id === courseId) {
    appState.currentCourse = null;

    getEl('courseTitle').textContent    = 'Select a course';
    getEl('courseSubtitle').textContent = 'Choose a course from the sidebar to view its curriculum.';
    getEl('addSubjectBtn').hidden       = true;
    getEl('viewToggle').hidden          = true;
    getEl('yearTabs').hidden            = true;
    getEl('flowGrid').innerHTML         = '';
    getEl('overviewGrid').innerHTML     = '';
    closeDetail();
  }

  await loadCourses();
}
