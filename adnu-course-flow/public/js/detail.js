// detail.js — subject detail panel: open, close, delete

async function openSubjectDetail(subjectId) {
  var response = await fetch('/api/subjects/' + subjectId);
  if (!response.ok) return;

  var subject = await response.json();

  // Build prerequisites chips (clickable to jump to that subject)
  var prereqHtml;
  if (subject.prerequisites.length > 0) {
    prereqHtml = subject.prerequisites.map(function(p) {
      return '<span class="prereq-chip clickable" onclick="openSubjectDetail(\'' + p.id + '\')">' +
               p.code + ' — ' + p.name +
             '</span>';
    }).join('');
  } else {
    prereqHtml = '<span style="color:var(--muted)">None</span>';
  }

  // Find subjects that list this one as a prerequisite (what it unlocks)
  var allSubjects = [];
  appState.currentCourse.years.forEach(function(yearData) {
    yearData.semesters.forEach(function(sem) {
      sem.subjects.forEach(function(sub) { allSubjects.push(sub); });
    });
  });

  var unlocks = allSubjects.filter(function(sub) {
    return (sub.prerequisites || []).includes(subjectId);
  });

  var unlocksHtml;
  if (unlocks.length > 0) {
    unlocksHtml = unlocks.map(function(u) {
      return '<span class="prereq-chip clickable" onclick="openSubjectDetail(\'' + u.id + '\')">' +
               u.code + ' — ' + u.name +
             '</span>';
    }).join('');
  } else {
    unlocksHtml = '<span style="color:var(--muted)">None</span>';
  }

  getEl('detailContent').innerHTML =
    '<span class="detail-badge" style="background:' + subject.color + '">' +
      (CATEGORY_LABELS[subject.category] || subject.category) +
    '</span>' +
    '<div class="detail-title">' + subject.name + '</div>' +
    '<div class="detail-code">' +
      subject.code + ' · ' + subject.units + ' units · ' +
      'Year ' + subject.year + ', Semester ' + subject.semester +
    '</div>' +
    '<dl>' +
      '<dt>Instructor</dt><dd>' + (subject.instructor || 'TBA') + '</dd>' +
      '<dt>Description</dt><dd>' + (subject.description || '—') + '</dd>' +
      '<dt>Prerequisites</dt><dd>' + prereqHtml + '</dd>' +
      '<dt>Unlocks</dt><dd>' + unlocksHtml + '</dd>' +
    '</dl>';

  getEl('detailPanel').dataset.subjectId = subject.id;
  getEl('detailPanel').hidden = false;
}

function closeDetail() {
  getEl('detailPanel').hidden = true;
}

async function deleteSubject(subjectId) {
  var confirmed = confirm(
    'Delete this subject? Prerequisite links to/from it will also be removed. Cannot be undone.'
  );
  if (!confirmed) return;

  var response = await fetch('/api/subjects/' + subjectId, { method: 'DELETE' });

  if (!response.ok) {
    var data = await response.json().catch(function() { return {}; });
    alert(data.error || 'Failed to delete subject.');
    return;
  }

  closeDetail();

  // Refresh the course data and redraw
  if (appState.currentCourse) {
    var refresh = await fetch('/api/courses/' + appState.currentCourse.id);
    appState.currentCourse = await refresh.json();
    renderYearTabs();
    renderGrid();
    if (appState.currentView === 'overview') renderOverview();
  }
}
