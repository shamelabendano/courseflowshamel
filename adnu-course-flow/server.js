// server.js — Express web server
// npm start → open http://localhost:3000

const express = require('express');
const path    = require('path');
const db      = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // serves index.html, CSS, JS


// ── GET routes ────────────────────────────────────────────────────────────────

// All courses (sidebar list)
app.get('/api/courses', async function(req, res) {
  try {
    res.json(await db.getAllCourses());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// One course with full year/semester/subject tree
app.get('/api/courses/:courseId', async function(req, res) {
  try {
    var course = await db.getCourseFlow(req.params.courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single subject detail (for the detail panel)
app.get('/api/subjects/:subjectId', async function(req, res) {
  try {
    var subject = await db.getSubject(req.params.subjectId);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    res.json(subject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ── POST routes ───────────────────────────────────────────────────────────────

// Create a new course
app.post('/api/courses', async function(req, res) {
  var name  = req.body.name;
  var code  = req.body.code;
  var color = req.body.color;

  if (!name || !code) return res.status(400).json({ error: 'name and code are required' });

  try {
    var course = await db.addCourse({ name: name, code: code, color: color });
    res.status(201).json(course);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'A course with code "' + code + '" already exists.' });
    res.status(500).json({ error: err.message });
  }
});

// Add a subject to a course
app.post('/api/courses/:courseId/subjects', async function(req, res) {
  var year = req.body.year, semester = req.body.semester, code = req.body.code, name = req.body.name;

  if (!year || !semester || !code || !name) {
    return res.status(400).json({ error: 'year, semester, code, and name are required' });
  }

  try {
    var prereqCodes = (req.body.prerequisiteCodes || []).map(function(s) { return s.trim(); }).filter(Boolean);
    var payload     = Object.assign({}, req.body, { prerequisiteCodes: prereqCodes });
    var subject     = await db.addSubject(req.params.courseId, payload);
    var courseFlow  = await db.getCourseFlow(req.params.courseId);
    res.status(201).json({ subject: subject, courseFlow: courseFlow });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'A subject with code "' + req.body.code + '" already exists in this course.' });
    res.status(500).json({ error: err.message });
  }
});


// ── DELETE routes ─────────────────────────────────────────────────────────────

// Delete a course (cascades to subjects + prereq links)
app.delete('/api/courses/:courseId', async function(req, res) {
  try {
    await db.deleteCourse(req.params.courseId);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a subject (also removes its prereq links)
app.delete('/api/subjects/:subjectId', async function(req, res) {
  try {
    await db.deleteSubject(req.params.subjectId);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.listen(PORT, function() {
  console.log('ADNU Course Flow running at http://localhost:' + PORT);
});

module.exports = app;
