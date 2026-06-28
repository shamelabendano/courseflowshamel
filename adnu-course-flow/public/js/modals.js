// modals.js — modal open/close, Add Course form, Add Subject form

function wireModals() {
  getEl('addCourseBtn').addEventListener('click', function() {
    openModal('courseModal');
  });

  // Close buttons use data-close="modalId"
  document.querySelectorAll('[data-close]').forEach(function(btn) {
    btn.addEventListener('click', function() { closeModal(btn.dataset.close); });
  });

  // Clicking the dark overlay also closes the modal
  document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
}

function openModal(modalId) {
  getEl(modalId).hidden = false;
}

function closeModal(modalId) {
  getEl(modalId).hidden = true;
  // Clear any error text inside the modal
  var errorEl = getEl(modalId).querySelector('.form-error');
  if (errorEl) errorEl.textContent = '';
}

// ── Add Course form ───────────────────────────────────────────────────────────

function wireCourseForm() {
  getEl('saveCourseBtn').addEventListener('click', async function() {
    var name  = getEl('courseName').value.trim();
    var code  = getEl('courseCode').value.trim();
    var color = getEl('courseColor').value;

    getEl('courseErr').textContent = '';

    if (!name || !code) {
      getEl('courseErr').textContent = 'Course name and code are required.';
      return;
    }

    setLoading('saveCourseBtn', true);
    var response = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, code: code, color: color })
    });
    var data = await response.json();
    setLoading('saveCourseBtn', false);

    if (!response.ok) {
      getEl('courseErr').textContent = data.error || 'Something went wrong.';
      return;
    }

    // Reset fields
    getEl('courseName').value  = '';
    getEl('courseCode').value  = '';
    getEl('courseColor').value = '#1c3f73';

    closeModal('courseModal');
    await loadCourses();
    selectCourse(data.id);
  });
}

// ── Add Subject form ──────────────────────────────────────────────────────────

function wireSubjectForm() {
  getEl('saveSubjectBtn').addEventListener('click', async function() {
    if (!appState.currentCourse) return;

    var code      = getEl('subjectCode').value.trim();
    var name      = getEl('subjectName').value.trim();
    var year      = getEl('subjectYear').value;
    var semester  = getEl('subjectSemester').value;
    var prereqRaw = getEl('subjectPrereqs').value.trim();

    getEl('subjectErr').textContent = '';

    if (!code || !name) {
      getEl('subjectErr').textContent = 'Subject code and name are required.';
      return;
    }

    // Parse "IT101, IT102" → ['IT101', 'IT102']
    var prerequisiteCodes = prereqRaw
      ? prereqRaw.split(',').map(function(s) { return s.trim(); }).filter(Boolean)
      : [];

    var payload = {
      code:              code,
      name:              name,
      year:              year,
      semester:          semester,
      units:             getEl('subjectUnits').value,
      category:          getEl('subjectCategory').value,
      instructor:        getEl('subjectInstructor').value.trim(),
      description:       getEl('subjectDesc').value.trim(),
      prerequisiteCodes: prerequisiteCodes
    };

    setLoading('saveSubjectBtn', true);
    var response = await fetch('/api/courses/' + appState.currentCourse.id + '/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    var data = await response.json();
    setLoading('saveSubjectBtn', false);

    if (!response.ok) {
      getEl('subjectErr').textContent = data.error || 'Something went wrong.';
      return;
    }

    // Reset fields
    getEl('subjectCode').value       = '';
    getEl('subjectName').value       = '';
    getEl('subjectUnits').value      = '3';
    getEl('subjectInstructor').value = '';
    getEl('subjectPrereqs').value    = '';
    getEl('subjectDesc').value       = '';

    closeModal('subjectModal');

    appState.currentCourse = data.courseFlow;
    appState.activeYear    = Number(year);

    if (appState.currentView === 'year') {
      renderYearTabs();
      renderGrid();
    } else {
      renderOverview();
    }
  });
}
