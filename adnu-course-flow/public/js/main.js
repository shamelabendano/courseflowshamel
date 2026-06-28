// main.js — app entry point; runs on page load
// Load order: state.js → helpers.js → courses.js → grid.js → overview.js → detail.js → modals.js → main.js

document.addEventListener('DOMContentLoaded', function() {

  loadCourses();   // populate the sidebar
  wireModals();    // connect modal open/close buttons
  wireCourseForm();  // connect the Add Course save button
  wireSubjectForm(); // connect the Add Subject save button

  getEl('closeDetail').addEventListener('click', closeDetail);

  getEl('deleteSubjectBtn').addEventListener('click', function() {
    var subjectId = getEl('detailPanel').dataset.subjectId;
    if (subjectId) deleteSubject(subjectId);
  });

  getEl('addSubjectBtn').addEventListener('click', function() {
    openModal('subjectModal');
  });

  // Arrow positions are pixel-based, so redraw them on resize
  window.addEventListener('resize', function() {
    if (appState.currentCourse) {
      requestAnimationFrame(drawArrows);
      if (appState.currentView === 'overview') requestAnimationFrame(drawOverviewArrows);
    }
  });

});
