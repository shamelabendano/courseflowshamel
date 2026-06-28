// grid.js — year tabs, subject pill grid, and prerequisite arrows (year view)

function renderYearTabs() {
  var tabs = getEl('yearTabs');
  tabs.hidden    = false;
  tabs.innerHTML = '';

  appState.currentCourse.years.forEach(function(yearData) {
    var btn = document.createElement('button');
    btn.className   = 'year-tab' + (yearData.year === appState.activeYear ? ' active' : '');
    btn.textContent = YEAR_LABELS[yearData.year] || 'Year ' + yearData.year;

    btn.addEventListener('click', function() {
      appState.activeYear = yearData.year;
      renderYearTabs();
      renderGrid();
    });

    tabs.appendChild(btn);
  });
}

function renderGrid() {
  var grid = getEl('flowGrid');
  grid.innerHTML = '';

  var yearData = appState.currentCourse.years.find(function(y) {
    return y.year === appState.activeYear;
  });
  if (!yearData) return;

  // Track which subject IDs are visible so we can flag off-page prereqs
  var visibleIds = new Set();
  yearData.semesters.forEach(function(sem) {
    sem.subjects.forEach(function(sub) { visibleIds.add(sub.id); });
  });

  yearData.semesters.forEach(function(sem) {
    // Skip empty Summer columns
    if (sem.semester === 3 && sem.subjects.length === 0) return;

    var col = document.createElement('div');
    col.className = 'semester-col';

    var heading = document.createElement('h4');
    heading.textContent = SEM_LABELS[sem.semester] || 'Semester ' + sem.semester;
    col.appendChild(heading);

    if (sem.subjects.length === 0) {
      var empty = document.createElement('div');
      empty.className   = 'empty-slot';
      empty.textContent = 'No subjects added yet';
      col.appendChild(empty);
    }

    sem.subjects.forEach(function(sub) {
      var pill = document.createElement('button');
      pill.className        = 'subject-pill';
      pill.id               = 'pill-' + sub.id;
      pill.style.background = sub.color;

      // Prereqs on other years get a "!" badge with a tooltip
      var offPage = (sub.prerequisites || []).filter(function(pid) {
        return !visibleIds.has(pid);
      });

      var badgeHtml = '';
      if (offPage.length > 0) {
        var labels = offPage.map(function(pid) {
          var found = findSubjectById(pid);
          return found ? found.code + ' (Yr ' + found.year + ')' : '';
        }).filter(Boolean).join(', ');

        badgeHtml = '<span class="cross-badge" title="Requires: ' + labels + '">!</span>';
      }

      pill.innerHTML =
        '<span>' + sub.code + ' — ' + sub.name + '</span>' +
        '<span class="pill-right">' +
          badgeHtml +
          '<span class="pill-units">' + sub.units + 'u</span>' +
        '</span>';

      pill.addEventListener('click', function() { openSubjectDetail(sub.id); });

      pill.addEventListener('mouseenter', function() {
        var prereqs = new Set(sub.prerequisites || []);
        var postreqs = new Set();
        appState.currentCourse.years.forEach(function(y) {
          y.semesters.forEach(function(sm) {
            sm.subjects.forEach(function(s) {
              if ((s.prerequisites || []).indexOf(sub.id) !== -1) {
                postreqs.add(s.id);
              }
            });
          });
        });

        document.querySelectorAll('.subject-pill').forEach(function(p) {
          var pid = p.id.replace('pill-', '');
          if (pid === sub.id) {
            p.classList.add('active-hover');
          } else if (prereqs.has(pid)) {
            p.classList.add('highlight-prereq');
          } else if (postreqs.has(pid)) {
            p.classList.add('highlight-postreq');
          } else {
            p.classList.add('dimmed');
          }
        });

        document.querySelectorAll('#arrowLayer path').forEach(function(path) {
          var fromId = path.getAttribute('data-from');
          var toId = path.getAttribute('data-to');
          if (toId === sub.id) {
            path.classList.add('highlight-prereq');
            path.setAttribute('marker-end', 'url(#ah-prereq)');
          } else if (fromId === sub.id) {
            path.classList.add('highlight-postreq');
            path.setAttribute('marker-end', 'url(#ah-postreq)');
          } else {
            path.classList.add('dimmed');
          }
        });
      });

      pill.addEventListener('mouseleave', function() {
        document.querySelectorAll('.subject-pill').forEach(function(p) {
          p.classList.remove('active-hover', 'highlight-prereq', 'highlight-postreq', 'dimmed');
        });
        document.querySelectorAll('#arrowLayer path').forEach(function(path) {
          path.classList.remove('highlight-prereq', 'highlight-postreq', 'dimmed');
          path.setAttribute('marker-end', 'url(#ah)');
        });
      });

      col.appendChild(pill);
    });

    grid.appendChild(col);
  });

  requestAnimationFrame(drawArrows);
}

function drawArrows() {
  var svg     = getEl('arrowLayer');
  var wrapper = svg.closest('.flow-grid-wrapper');
  if (!svg || !wrapper) return;

  // Resize the SVG overlay to match the grid container
  var wRect = wrapper.getBoundingClientRect();
  svg.setAttribute('width',   wRect.width);
  svg.setAttribute('height',  wRect.height);
  svg.setAttribute('viewBox', '0 0 ' + wRect.width + ' ' + wRect.height);

  svg.innerHTML =
    '<defs>' +
      '<marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">' +
        '<path d="M0,0 L6,3 L0,6 Z" fill="#cbd5e1"/>' +
      '</marker>' +
      '<marker id="ah-prereq" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">' +
        '<path d="M0,0 L6,3 L0,6 Z" fill="#3b82f6"/>' +
      '</marker>' +
      '<marker id="ah-postreq" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">' +
        '<path d="M0,0 L6,3 L0,6 Z" fill="#10b981"/>' +
      '</marker>' +
    '</defs>';

  var yearData = appState.currentCourse.years.find(function(y) {
    return y.year === appState.activeYear;
  });
  if (!yearData) return;

  var allVisible = [];
  yearData.semesters.forEach(function(sem) {
    sem.subjects.forEach(function(sub) { allVisible.push(sub); });
  });

  allVisible.forEach(function(sub) {
    (sub.prerequisites || []).forEach(function(prereqId) {
      var fromPill = document.getElementById('pill-' + prereqId);
      var toPill   = document.getElementById('pill-' + sub.id);
      if (!fromPill || !toPill) return;

      var fr = fromPill.getBoundingClientRect();
      var tr = toPill.getBoundingClientRect();

      // Line goes from right edge of prereq pill to left edge of subject pill
      var x1 = fr.right - wRect.left;
      var y1 = fr.top + fr.height / 2 - wRect.top;
      var x2 = tr.left - wRect.left;
      var y2 = tr.top + tr.height / 2 - wRect.top;

      var curve = Math.max(40, Math.abs(x2 - x1) / 2);
      var d = 'M ' + x1 + ' ' + y1 +
              ' C ' + (x1 + curve) + ' ' + y1 +
              ', '  + (x2 - curve) + ' ' + y2 +
              ', '  + x2 + ' ' + y2;

      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('id', 'path-' + prereqId + '-' + sub.id);
      path.setAttribute('d', d);
      path.setAttribute('marker-end', 'url(#ah)');
      path.setAttribute('data-from', prereqId);
      path.setAttribute('data-to', sub.id);
      svg.appendChild(path);
    });
  });
}
