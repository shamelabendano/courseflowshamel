// helpers.js — small utility functions used across all files

// Shortcut for document.getElementById()
function getEl(id) {
  return document.getElementById(id);
}

// Shows a spinner on a button while saving; restores original text when done
function setLoading(buttonId, isLoading) {
  var btn = getEl(buttonId);
  btn.disabled = isLoading;

  if (isLoading) {
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span>Saving…';
  } else {
    btn.textContent = btn.dataset.originalText || 'Save';
  }
}

// Finds a subject by ID across all years/semesters; returns null if not found
function findSubjectById(subjectId) {
  for (var i = 0; i < appState.currentCourse.years.length; i++) {
    var year = appState.currentCourse.years[i];

    for (var j = 0; j < year.semesters.length; j++) {
      var found = year.semesters[j].subjects.find(function(sub) {
        return sub.id === subjectId;
      });
      if (found) return found;
    }
  }
  return null;
}
