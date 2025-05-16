// backend/src/routes/taskRoutes.js
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// POST /api/tasks - Create a new task
router.post('/', taskController.createTask);

// GET /api/tasks - Get all tasks for current user
router.get('/', taskController.getAllTasks);

// GET /api/tasks/:id - Get task by ID
router.get('/:id', taskController.getTaskById);

// PUT /api/tasks/:id - Update task
router.put('/:id', taskController.updateTask);

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', taskController.deleteTask);

// GET /api/tasks/filter/created - Get tasks created by current user
router.get('/filter/created', taskController.getCreatedTasks);

// GET /api/tasks/filter/assigned - Get tasks assigned to current user  
router.get('/filter/assigned', taskController.getAssignedTasks);

// GET /api/tasks/filter/overdue - Get overdue tasks for current user
router.get('/filter/overdue', taskController.getOverdueTasks);

// GET /api/tasks/search - Search and filter tasks
router.get('/search', taskController.searchTasks);

// POST /api/tasks/invite - Invite a user to collaborate on a task
router.post('/invite', taskController.inviteCollaborator);

module.exports = router;