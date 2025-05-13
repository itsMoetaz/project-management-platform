require("dotenv").config();

const Bug = require("../models/Bug");
const Project = require("../models/Project");
const Workspace = require("../models/Workspace");
const { validateBug } = require("../validators/BugValidators");
const mongoose = require("mongoose");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

// Config Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Config Storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "bugs",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const upload = multer({ storage });

// Middleware for upload
exports.upload = upload;

const BugController = {
  // Create a new bug
  createBug: async (req, res) => {
    try {
      const { projectId } = req.params;
      // Validate project ID
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID format",
        });
      }
      // Find the project and populate its workspace
      const project = await Project.findById(projectId).populate("workspace");
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      if (!project.workspace) {
        const workspace = await Workspace.findOne({
          projects: { $in: [projectId] },
        });
        if (!workspace) {
          return res.status(404).json({
            success: false,
            message: "Workspace not found for this project",
          });
        }
        project.workspace = workspace;
      }

      const isOwner =
        project.workspace.owner.toString() === req.user._id.toString();

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: "Only workspace owners can create bugs",
        });
      }

      const bugData = {
        ...req.body,
        project_id: projectId,
        reported_by: req.user._id,
        image: req.file?.path || "",
      };

      const bug = new Bug(bugData);
      await bug.save();

      // Add bug to project's bugs array
      await Project.findByIdAndUpdate(projectId, {
        $push: { id_bugs: bug._id },
      });

      console.log(`Added bug ${bug._id} to project ${projectId}`);

      // Return the populated bug
      const populatedBug = await Bug.findById(bug._id)
        .populate("assigned_to", "name email profile_picture")
        .populate("reported_by", "name email profile_picture");

      res.status(201).json({
        success: true,
        data: populatedBug,
        message: "Bug created successfully",
      });
    } catch (error) {
      console.error("Error creating bug:", error);
      console.error("Details:", error.stack);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  },

  // Get all bugs
  getAllBugs: async (req, res) => {
    try {
      const bugs = await Bug.find()
        .populate("assigned_to", "name email")
        .populate("reported_by", "name email")
        .populate("project_id", "project_name");

      res.status(200).json({
        success: true,
        data: bugs,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Get bugs by project ID
  getBugsByProject: async (req, res) => {
    try {
      const { projectId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID format",
        });
      }

      const bugs = await Bug.find({ project_id: projectId })
        .populate("assigned_to", "name email profile_picture")
        .populate("reported_by", "name email profile_picture")
        .sort({ created_at: -1 });

      res.status(200).json({
        success: true,
        data: bugs,
      });
    } catch (error) {
      console.error("Error fetching bugs for project:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  },

  // Get bugs reported by or assigned to a specific user
  getUserBugs: async (req, res) => {
    try {
      const { userId } = req.params;
      const bugs = await Bug.find({
        $or: [{ reported_by: userId }, { assigned_to: userId }],
      })
        .populate("project_id", "project_name")
        .populate("assigned_to", "name email")
        .populate("reported_by", "name email");

      res.status(200).json({
        success: true,
        data: bugs,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Get a single bug by ID
  getBugById: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid bug ID format",
        });
      }

      const bug = await Bug.findById(id)
        .populate("assigned_to", "name email profile_picture")
        .populate("reported_by", "name email profile_picture")
        .populate("project_id", "project_name");

      if (!bug) {
        return res.status(404).json({
          success: false,
          message: "Bug not found",
        });
      }

      res.status(200).json({
        success: true,
        data: bug,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Update a bug
  updateBug: async (req, res) => {
    try {
      // Validate request body
      const { error } = validateBug(req.body, { abortEarly: false });
      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path[0],
          message: detail.message,
        }));
        return res.status(400).json({
          success: false,
          errors: errors,
        });
      }

      const { id } = req.params; // Consistent with updateTask
      const updates = req.body;

      console.log("this body back end", req.body);

      // Update the bug
      const updatedBug = await Bug.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      })
        .populate("assigned_to", "name email profile_picture")
        .populate("reported_by", "name email profile_picture");

      if (!updatedBug) {
        return res.status(404).json({
          success: false,
          message: "Bug not found",
        });
      }
      console.log("this body back end", req.body);

      res.status(200).json({
        success: true,
        data: updatedBug,
        message: "Bug updated successfully",
      });
    } catch (error) {
      console.error("Error updating bug:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  },
  // Update bug status
  updateBugStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid bug ID format",
        });
      }

      // Validate request body
      const { error } = bugValidator.updateStatus.validate(
        { status },
        { abortEarly: false }
      );
      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path[0],
          message: detail.message,
        }));
        return res.status(400).json({
          success: false,
          errors: errors,
        });
      }

      const bug = await Bug.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true }
      )
        .populate("assigned_to", "name email profile_picture")
        .populate("reported_by", "name email profile_picture")
        .populate("project_id", "project_name");

      if (!bug) {
        return res.status(404).json({
          success: false,
          message: "Bug not found",
        });
      }

      res.status(200).json({
        success: true,
        data: bug,
        message: "Bug status updated successfully",
      });
    } catch (error) {
      console.error("Error updating bug status:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  deleteBug: async (req, res) => {
    try {
      const { id } = req.params;

      // Validate bug ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid bug ID format",
        });
      }

      // Find the bug
      const bug = await Bug.findById(id);
      if (!bug) {
        return res.status(404).json({
          success: false,
          message: "Bug not found",
        });
      }

      // Find the project and populate its workspace
      const project = await Project.findById(bug.project_id).populate(
        "workspace"
      );
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      // Check if workspace is populated
      if (!project.workspace) {
        const workspace = await Workspace.findOne({
          projects: { $in: [bug.project_id] },
        });
        if (!workspace) {
          return res.status(404).json({
            success: false,
            message: "Workspace not found for this project",
          });
        }
        project.workspace = workspace;
      }

      // Check if the user is the owner of the workspace
      const isOwner =
        project.workspace.owner.toString() === req.user._id.toString();
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: "Only workspace owners can delete bugs",
        });
      }

      // Remove bug from project's bugs array
      await Project.findByIdAndUpdate(bug.project_id, {
        $pull: { id_bugs: id },
      });

      // Delete the bug
      await Bug.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: "Bug deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting bug:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  },

  // Assign a bug to a member
  assignBug: async (req, res) => {
    try {
      const { id } = req.params;
      const { assigned_to } = req.body;

      // Validate bug ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid bug ID format",
        });
      }

      // Find the bug
      const bug = await Bug.findById(id);
      if (!bug) {
        return res.status(404).json({
          success: false,
          message: "Bug not found",
        });
      }
      // Check if bug status is OPEN
    if (bug.status !== 'OPEN') {
      return res.status(400).json({
        success: false,
        message: 'Bug can only be assigned when its status is OPEN',
      });
    }

      // Check if the bug is already assigned to the user
    if (bug.assigned_to && bug.assigned_to.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Bug is already assigned to you",
      });
    }

      // Find the project and populate its workspace
      const project = await Project.findById(bug.project_id).populate(
        "workspace"
      );
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      // Check if workspace is populated
      if (!project.workspace) {
        const workspace = await Workspace.findOne({
          projects: { $in: [bug.project_id] },
        });
        if (!workspace) {
          return res.status(404).json({
            success: false,
            message: "Workspace not found for this project",
          });
        }
        project.workspace = workspace;
      }

      // Check if the user is the workspace owner
      const isOwner =
        project.workspace.owner.toString() === req.user._id.toString();
      if (isOwner) {
        return res.status(403).json({
          success: false,
          message: "Workspace owners cannot assign bugs",
        });
      } else {
        console.log("id membre ", req.user._id.toString());
      }

      // Check if the user is a project member
      const isMember = project.id_teamMembre.some(
        (member) => member.toString() === req.user._id.toString()
      );
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: "Only project members can assign bugs",
        });
      }

      // Update the bug
      bug.assigned_to = req.user._id;
      bug.status = "IN_PROGRESS";
      bug.updated_at = new Date();
      await bug.save();

      // Populate and return the updated bug
      const populatedBug = await Bug.findById(id)
        .populate("assigned_to", "name email profile_picture")
        .populate("reported_by", "name email profile_picture")
        .populate("project_id", "project_name");

      res.status(200).json({
        success: true,
        data: populatedBug,
        message: "Bug assigned successfully",
      });
    } catch (error) {
      console.error("Error assigning bug:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  },


  solveBug: async (req, res) => {
    try {
    const { id } = req.params;

    // Validate bug ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bug ID format',
      });
    }

    // Find the bug
    const bug = await Bug.findById(id);
    if (!bug) {
      return res.status(404).json({
        success: false,
        message: 'Bug not found',
      });
    }

    // Check if bug status is IN_PROGRESS
    if (bug.status !== 'IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        message: 'Bug can only be resolved when its status is IN_PROGRESS',
      });
    }

    // Check if the user is assigned to the bug
    if (!bug.assigned_to || bug.assigned_to.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned user can resolve this bug',
      });
    }

    // Check if current date is past deadline or closure_date
    const currentDate = new Date();
    if (bug.deadline && currentDate > bug.deadline) {
      return res.status(400).json({
        success: false,
        message: 'Cannot resolve bug: Deadline has passed',
      });
    }
    if (bug.closure_date && currentDate > bug.closure_date) {
      return res.status(400).json({
        success: false,
        message: 'Cannot resolve bug: Closure date has passed',
      });
    }

    // Update the bug
    bug.status = 'RESOLVED';
    //bug.updated_at = new Date(); // Set updated_at to current date/time
    //bug.closure_date = bug.closure_date || new Date(); // Set closure_date if not already set
    await bug.save();

    // Populate and return the updated bug
    const populatedBug = await Bug.findById(id)
      .populate('assigned_to', 'name email profile_picture')
      .populate('reported_by', 'name email profile_picture')
      .populate('project_id', 'project_name');

    res.status(200).json({
      success: true,
      data: populatedBug,
      message: 'Bug resolved successfully',
    });
  } catch (error) {
    console.error('Error resolving bug:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
    
  },
};
module.exports = BugController;
