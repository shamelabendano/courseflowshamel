// overview.js — full overview mode (all years side by side) and its arrows

function switchView(viewName) {
  appState.currentView = viewName;

  document.querySelectorAll('.view-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  if (viewName === 'year') {
    getEl('yearView').hidden     = false;
    getEl('overviewView').hidden = true;
    requestAnimationFrame(drawArrows);
  } else {
    getEl('yearView').hidden     = true;
    getEl('overviewView').hidden = false;
    renderOverview();
  }

  closeDetail();
}

function renderOverview() {
  var grid = getEl('overviewGrid');
  grid.innerHTML = '';

  appState.currentCourse.years.forEach(function(yearData) {
    yearData.semesters.forEach(function(sem) {
      // Skip empty Summer columns
      if (sem.semester === 3 && sem.subjects.length === 0) return;

      var col = document.createElement('div');
      col.className = 'overview-sem-col';
      col.innerHTML =
        '<h3>' + (YEAR_LABELS[yearData.year] || 'Year ' + yearData.year) + '</h3>' +
        '<div class="ov-sem-sub">' + (SEM_LABELS[sem.semester] || 'Sem ' + sem.semester) + '</div>';

      if (sem.subjects.length === 0) {
        var empty = document.createElement('div');
        empty.className   = 'empty-slot';
        empty.textContent = 'No subjects';
        col.appendChild(empty);
      }

      sem.subjects.forEach(function(sub) {
        var pill = document.createElement('button');
        pill.className        = 'overview-pill';
        pill.id               = 'ovpill-' + sub.id;
        pill.style.background = sub.color;
        pill.title            = sub.name; // tooltip on hover

        pill.innerHTML =
          '<span class="ov-code">' + sub.code + '</span>' +
          '<span class="ov-units">' + sub.units + 'u</span>';

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

          document.querySelectorAll('.overview-pill').forEach(function(p) {
            var pid = p.id.replace('ovpill-', '');
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

          document.querySelectorAll('.overview-arrow-svg path').forEach(function(path) {
            var fromId = path.getAttribute('data-from');
            var toId = path.getAttribute('data-to');
            if (toId === sub.id) {
              path.classList.add('highlight-prereq');
              path.setAttribute('marker-end', 'url(#oah-prereq)');
            } else if (fromId === sub.id) {
              path.classList.add('highlight-postreq');
              path.setAttribute('marker-end', 'url(#oah-postreq)');
            } else {
              path.classList.add('dimmed');
            }
          });
        });

        pill.addEventListener('mouseleave', function() {
          document.querySelectorAll('.overview-pill').forEach(function(p) {
            p.classList.remove('active-hover', 'highlight-prereq', 'highlight-postreq', 'dimmed');
          });
          document.querySelectorAll('.overview-arrow-svg path').forEach(function(path) {
            path.classList.remove('highlight-prereq', 'highlight-postreq', 'dimmed');
            path.setAttribute('marker-end', 'url(#oah)');
          });
        });

        col.appendChild(pill);
      });

      grid.appendChild(col);
    });
  });

  requestAnimationFrame(drawOverviewArrows);
}

function drawOverviewArrows() {
  var svg     = getEl('overviewArrowSvg');
  var wrapper = getEl('overviewWrapper');
  if (!svg || !wrapper) return;

  var wRect = wrapper.getBoundingClientRect();
  svg.style.width  = wRect.width  + 'px';
  svg.style.height = wRect.height + 'px';
  svg.setAttribute('viewBox', '0 0 ' + wRect.width + ' ' + wRect.height);

  svg.innerHTML =
    '<defs>' +
      '<marker id="oah" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">' +
        '<path d="M0,0 L5,3 L0,6 Z" fill="#cbd5e1"/>' +
      '</marker>' +
      '<marker id="oah-prereq" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">' +
        '<path d="M0,0 L5,3 L0,6 Z" fill="#3b82f6"/>' +
      '</marker>' +
      '<marker id="oah-postreq" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">' +
        '<path d="M0,0 L5,3 L0,6 Z" fill="#10b981"/>' +
      '</marker>' +
    '</defs>';

  // Flatten all subjects across all years
  var allSubjects = [];
  appState.currentCourse.years.forEach(function(yearData) {
    yearData.semesters.forEach(function(sem) {
      sem.subjects.forEach(function(sub) { allSubjects.push(sub); });
    });
  });

  allSubjects.forEach(function(sub) {
    (sub.prerequisites || []).forEach(function(prereqId) {
      var fromPill = document.getElementById('ovpill-' + prereqId);
      var toPill   = document.getElementById('ovpill-' + sub.id);
      if (!fromPill || !toPill) return;

      var fr = fromPill.getBoundingClientRect();
      var tr = toPill.getBoundingClientRect();

      var x1 = fr.right - wRect.left;
      var y1 = fr.top + fr.height / 2 - wRect.top;
      var x2 = tr.left - wRect.left;
      var y2 = tr.top + tr.height / 2 - wRect.top;

      var curve = Math.max(20, Math.abs(x2 - x1) / 2);
      var d = 'M ' + x1 + ' ' + y1 +
              ' C ' + (x1 + curve) + ' ' + y1 +
              ', '  + (x2 - curve) + ' ' + y2 +
              ', '  + x2 + ' ' + y2;

      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('id', 'ovpath-' + prereqId + '-' + sub.id);
      path.setAttribute('d', d);
      path.setAttribute('marker-end', 'url(#oah)');
      path.setAttribute('data-from', prereqId);
      path.setAttribute('data-to', sub.id);
      svg.appendChild(path);
    });
  });
}
