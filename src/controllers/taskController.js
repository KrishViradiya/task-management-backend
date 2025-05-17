// backend/src/controllers/taskController.js
const Task = require("../models/Task");
const User = require("../models/User");
const Notification = require("../models/Notification");
const notificationService = require("../services/notificationService");
const { emitTaskUpdate } = require("../utils/socketEvents");

// Create a new task
exports.createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      dueDate,
      priority,
      status,
      assignedTo,
      collaborators,
    } = req.body;

    // Process collaborator emails if provided
    let collaboratorIds = [];
    let notFoundEmails = [];

    if (collaborators && collaborators.length > 0) {
      // If collaborators are provided as emails, find the corresponding users
      if (
        typeof collaborators[0] === "string" &&
        collaborators[0].includes("@")
      ) {
        const users = await User.find({ email: { $in: collaborators } });
        collaboratorIds = users.map((user) => user._id);

        // Check if any emails were not found
        if (users.length < collaborators.length) {
          const foundEmails = users.map((user) => user.email.toLowerCase());
          notFoundEmails = collaborators.filter(
            (email) => !foundEmails.includes(email.toLowerCase())
          );

          // Log the emails that weren't found for debugging
          if (notFoundEmails.length > 0) {
            console.log(
              `The following collaborator emails were not found: ${notFoundEmails.join(
                ", "
              )}`
            );
          }
        }
      } else {
        // If collaborators are already provided as IDs
        collaboratorIds = collaborators;
      }
    }

    // Create new task
    const newTask = new Task({
      title,
      description,
      dueDate,
      priority,
      status,
      createdBy: req.userId,
      assignedTo,
      collaborators: collaboratorIds,
    });

    await newTask.save();

    // Create notification if task is assigned to someone
    if (assignedTo) {
      const creator = await User.findById(req.userId).select("username");

      await notificationService.createNotification(req, {
        recipient: assignedTo,
        sender: req.userId,
        task: newTask._id,
        type: "task_assigned",
        message: `${creator.username} assigned you a new task: ${title}`,
      });
    }

    // Create notifications for collaborators
    if (collaboratorIds.length > 0) {
      const creator = await User.findById(req.userId).select("username");

      const notifications = collaboratorIds.map((collaboratorId) => ({
        recipient: collaboratorId,
        sender: req.userId,
        task: newTask._id,
        type: "task_assigned",
        message: `${creator.username} added you as a collaborator on task: ${title}`,
      }));

      await notificationService.createManyNotifications(req, notifications);
    }

    // Return the task with populated fields
    const populatedTask = await Task.findById(newTask._id)
      .populate("createdBy", "username")
      .populate("assignedTo", "username")
      .populate("collaborators", "username email");

    // If some emails weren't found, include a warning in the response
    if (notFoundEmails.length > 0) {
      return res.status(201).json({
        task: populatedTask,
        warning: `The following collaborator emails were not found: ${notFoundEmails.join(
          ", "
        )}`,
      });
    }

    res.status(201).json(populatedTask);
  } catch (error) {
    res.status(500).json({
      message: "Error creating task",
      error: error.message,
    });
  }
};

// Get all tasks for current user (created, assigned, or collaborating)
exports.getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      $or: [
        { createdBy: req.userId },
        { assignedTo: req.userId },
        { collaborators: req.userId },
      ],
    })
      .populate("createdBy", "username")
      .populate("assignedTo", "username")
      .populate("collaborators", "username email")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching tasks",
      error: error.message,
    });
  }
};

// Get all tasks in the system (admin/manager only)
exports.getAllTasksAdmin = async (req, res) => {
  try {
    // Get the current user to check their role
    const user = await User.findById(req.userId);
    
    // Only admins and managers can access all tasks
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return res.status(403).json({
        message: "Access denied. You do not have permission to view all tasks."
      });
    }
    
    // Find all tasks in the system
    const tasks = await Task.find()
      .populate("createdBy", "username email")
      .populate("assignedTo", "username email")
      .populate("collaborators", "username email")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching all tasks",
      error: error.message,
    });
  }
};

// Get task by ID
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("createdBy", "username")
      .populate("assignedTo", "username")
      .populate("collaborators", "username email");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user has permission to view this task
    const isCollaborator =
      task.collaborators &&
      task.collaborators.some((collab) => collab._id.toString() === req.userId);

    if (
      task.createdBy._id.toString() !== req.userId &&
      task.assignedTo?._id.toString() !== req.userId &&
      !isCollaborator
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this task" });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching task",
      error: error.message,
    });
  }
};

// Update task
exports.updateTask = async (req, res) => {
  try {
    const {
      title,
      description,
      dueDate,
      priority,
      status,
      assignedTo,
      collaborators,
    } = req.body;

    // Find task
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user has permission to update this task
    const isCollaborator =
      task.collaborators &&
      task.collaborators.some((collab) => collab.toString() === req.userId);
    
    // Get user to check for special permissions
    const user = await User.findById(req.userId);
    const hasUpdateAnyPermission = user && (user.role === 'admin' || user.permissions.updateAnyTask);
    
    if (
      task.createdBy.toString() !== req.userId &&
      task.assignedTo?.toString() !== req.userId &&
      !isCollaborator &&
      !hasUpdateAnyPermission
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this task" });
    }

    // Create notification if assignedTo changed
    if (assignedTo && task.assignedTo?.toString() !== assignedTo) {
      const creator = await User.findById(req.userId).select("username");

      await notificationService.createNotification(req, {
        recipient: assignedTo,
        sender: req.userId,
        task: task._id,
        type: "task_assigned",
        message: `${creator.username} assigned you a task: ${
          title || task.title
        }`,
      });
    }

    // Update task
    const updateData = {
      updatedAt: Date.now(),
    };

    // Only update fields that are provided and that the user has permission to update
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (dueDate) updateData.dueDate = dueDate;
    if (priority) updateData.priority = priority;
    if (status) updateData.status = status;

    // Only the creator or users with special permissions can change assignment and collaborators
    if (task.createdBy.toString() === req.userId || hasUpdateAnyPermission || 
        (user && user.permissions.assignTask)) {
      if (assignedTo) updateData.assignedTo = assignedTo;
      if (collaborators) updateData.collaborators = collaborators;
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
      .populate("createdBy", "username")
      .populate("assignedTo", "username")
      .populate("collaborators", "username email");
    
    // Emit task update to all collaborators
    const io = req.app.get('io');
    if (io) {
      const allCollaborators = [
        ...updatedTask.collaborators.map(c => c._id.toString()), 
        updatedTask.assignedTo?._id.toString(),
        updatedTask.createdBy._id.toString()
      ].filter(Boolean);
      
      emitTaskUpdate(io, allCollaborators, updatedTask);
    }

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({
      message: "Error updating task",
      error: error.message,
    });
  }
};

// Delete task
exports.deleteTask = async (req, res) => {
  try {
    // Find task
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user has permission to delete this task
    // Get user to check for special permissions
    const user = await User.findById(req.userId);
    const hasDeleteAnyPermission = user && (user.role === 'admin' || user.permissions.deleteAnyTask);
    
    if (task.createdBy.toString() !== req.userId && !hasDeleteAnyPermission) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this task" });
    }

    // Delete task
    await Task.findByIdAndDelete(req.params.id);

    // Delete associated notifications
    await Notification.deleteMany({ task: req.params.id });

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting task",
      error: error.message,
    });
  }
};

// Get tasks created by current user
exports.getCreatedTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ createdBy: req.userId })
      .populate("assignedTo", "username")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching created tasks",
      error: error.message,
    });
  }
};

// Get tasks assigned to current user
exports.getAssignedTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.userId })
      .populate("createdBy", "username")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching assigned tasks",
      error: error.message,
    });
  }
};

// Get overdue tasks for current user
exports.getOverdueTasks = async (req, res) => {
  try {
    const today = new Date();

    const tasks = await Task.find({
      $or: [{ createdBy: req.userId }, { assignedTo: req.userId }],
      dueDate: { $lt: today },
      status: { $ne: "completed" },
    })
      .populate("createdBy", "username")
      .populate("assignedTo", "username")
      .sort({ dueDate: 1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching overdue tasks",
      error: error.message,
    });
  }
};

// Search and filter tasks
exports.searchTasks = async (req, res) => {
  try {
    const { search, status, priority, fromDate, toDate } = req.query;

    // Build query
    const query = {
      $or: [
        { createdBy: req.userId },
        { assignedTo: req.userId },
        { collaborators: req.userId },
      ],
    };

    // Add search if provided
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    // Add priority filter if provided
    if (priority) {
      query.priority = priority;
    }

    // Add date range filter if provided
    if (fromDate || toDate) {
      query.dueDate = {};

      if (fromDate) {
        query.dueDate.$gte = new Date(fromDate);
      }

      if (toDate) {
        query.dueDate.$lte = new Date(toDate);
      }
    }

    const tasks = await Task.find(query)
      .populate("createdBy", "username")
      .populate("assignedTo", "username")
      .populate("collaborators", "username email")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({
      message: "Error searching tasks",
      error: error.message,
    });
  }
};

// Invite user to collaborate on a task
exports.inviteCollaborator = async (req, res) => {
  try {
    const { taskId, email } = req.body;

    // Find task
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user has permission to invite collaborators
    const isCollaborator =
      task.collaborators &&
      task.collaborators.some((collab) => collab.toString() === req.userId);

    if (
      task.createdBy.toString() !== req.userId &&
      task.assignedTo?.toString() !== req.userId &&
      !isCollaborator
    ) {
      return res.status(403).json({
        message: "Not authorized to invite collaborators to this task",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User with this email not found" });
    }

    // Check if user is already a collaborator
    const collaboratorIds = task.collaborators.map((c) => c.toString());
    if (collaboratorIds.includes(user._id.toString())) {
      return res
        .status(400)
        .json({ message: "User is already a collaborator on this task" });
    }

    // Add user to collaborators
    if (!task.collaborators) {
      task.collaborators = [];
    }

    task.collaborators.push(user._id);
    await task.save();

    // Create notification for the invited user
    const inviter = await User.findById(req.userId).select("username");

    await notificationService.createNotification(req, {
      recipient: user._id,
      sender: req.userId,
      task: task._id,
      type: "task_assigned",
      message: `${inviter.username} invited you to collaborate on task: ${task.title}`,
    });
    
    // Emit task update to all collaborators
    const io = req.app.get('io');
    if (io) {
      const allCollaborators = [...task.collaborators.map(c => c.toString()), task.assignedTo?.toString()].filter(Boolean);
      emitTaskUpdate(io, allCollaborators, task);
    }

    // Return updated task with populated fields
    const updatedTask = await Task.findById(taskId)
      .populate("createdBy", "username")
      .populate("assignedTo", "username")
      .populate("collaborators", "username email");

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({
      message: "Error inviting collaborator",
      error: error.message,
    });
  }
};
