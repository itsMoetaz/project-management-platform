const User = require('../models/User');
const bcrypt = require('bcrypt');
const { validateUser, validateUpdateUser } = require('../validators/validators');
const mongoose = require('mongoose'); // Add this import
const Workspace = require('../models/Workspace');

// const Project = require('../models/Project'); // This was missing
// const Task = require('../models/Task'); // This was missing
const jwt = require('jsonwebtoken'); // Add this line to import JWT

const getAllUsers = async (req, res) => {
    await User.find()
        .then(data => res.json(data))
        .catch(err => res.status(500).json({ error: "Failed to retrieve users", details: err }));
};
const getMe = async (req, res) => {
    try {
      // Make sure to populate workspaces field
      const user = await User.findById(req.user._id)
        .populate('workspaces')
        .select('-password')
        .exec(); 
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(user);
    } catch (err) {
        console.error("getMe error details:", {
          message: err.message,
          stack: err.stack,
          user: req.user
        });
        return res.status(500).json({ 
          error: "Failed to retrieve user", 
          details: err.message 
        });
      }
    };
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id)
            .populate({
                path: 'workspaces',
                select: 'name',  // Only get workspace name
                match: {         // Only get active workspaces
                    isDeleted: { $ne: true },
                    isArchived: { $ne: true }
                }
            });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Failed to retrieve user", details: err.message });
    }
};

const addUser = async (req, res) => {
    try {
        const { error, value } = validateUser(req.body);
        if (error) {
            return res.status(400).json({ errors: error.details.map(err => err.message) });
        }

        const { name, email, password, authentication_method, role, phone_number, bio } = value;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            authentication_method: authentication_method || 'local',
            role: role || 'user',
            phone_number: phone_number || '',
            bio: bio ? bio.trim() : '',
        });

        await newUser.save();
        res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateUser = async (req, res) => {
    try {
     

        const { id } = req.params;
        const { error } = validateUser(req.body);
        if (error) {
            return res.status(400).json({ errors: error.details.map(err => err.message) });
        }
        const { name, email, password, authentication_method, role, phone_number, bio } = req.body;
        
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.name = name || user.name;
        user.email = email || user.email;
        if (password) {
            user.password = await bcrypt.hash(password, 10);
            user.passwordChangedAt = Date.now();
        }
        user.authentication_method = authentication_method || user.authentication_method;
        user.role = role || user.role;
        user.phone_number = phone_number || user.phone_number;
        user.bio = bio ? bio.trim() : user.bio;

        await user.save();
        res.status(200).json({ message: 'User updated successfully', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const dropUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const changePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { oldPassword, newPassword } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.passwordChangedAt = Date.now();
        await user.save();
        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getLoggedUser = async (req, res, next) => {
    req.params.id = req.user._id;
    next();
};

const updateLoggedUserPassword = async (req, res, ) => {
    const user = await User.findByIdAndUpdate(
        req.user._id, 
        { password: await bcrypt.hash(req.body.password, 10),
         passwordChangedAt: Date.now() },
        { new: true }
    );

    const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE_TIME }
    );

    res.json({ status: 'success' , message: 'Password updated successfully', token });
    
};

const UpdateLoggeduserData = async (req, res) => {
  try {
    // Validate the request body
    const { error } = validateUpdateUser(req.body);
    if (error) {
      return res.status(400).json({ errors: error.details.map(detail => detail.message) });
    }
    
    // Log what fields are being processed for debugging
    console.log('Updating user with fields:', Object.keys(req.body));
    
    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id, 
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(200).json(updatedUser);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: 'Server error while updating user' });
  }
};

const deleteLoggedUser = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { isActive: false });
        res.status(200).json({ status: 'success', message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
const getBasicUserInfo = async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findById(id)
        .select('name email profile_picture')
        .exec();
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(user);
    } catch (err) {
      return res.status(500).json({ 
        error: "Failed to retrieve user", 
        details: err.message 
      });
    }
  };

  const profilePictureUpload = async (req, res) => {
    try {
        if (!req.files || !req.files.profileImage) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        const file = req.files.profileImage;
        
        // Upload to local storage or cloud service like AWS S3, Cloudinary, etc.
        // For example, with cloudinary:
        const result = await cloudinary.uploader.upload(file.tempFilePath, {
            folder: 'profile_pictures',
            public_id: `user_${req.user._id}`
        });
        
        // Update user profile in database
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id, 
            { profile_picture: result.secure_url },
            { new: true }
        );
        
        res.json({ 
            success: true, 
            profileUrl: result.secure_url,
            user: updatedUser
        });
    } catch (error) {
        console.error('Profile picture upload error:', error);
        res.status(500).json({ message: 'Error uploading profile picture' });
    }
};

// controllers/userController.js
const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const defaultProfile = {
      profile: {
        _id: userId,
        name: "Utilisateur",
        email: "",
        bio: 'Aucune bio disponible',
        phone_number: 'Aucun numéro de téléphone fourni',
        profile_picture: null,
        createdAt: new Date().toISOString(),
        skills: [] // Ajouter un tableau de compétences vide par défaut
      }
    };
    
    try {
      const user = await User.findById(userId)
        .select('name email bio phone_number profile_picture createdAt skills'); // Inclure les compétences
      
      if (!user) {
        return res.status(200).json(defaultProfile);
      }
      
      return res.status(200).json({
        profile: {
          _id: user._id,
          name: user.name,
          email: user.email,
          bio: user.bio || 'Aucune bio disponible',
          phone_number: user.phone_number || 'Aucun numéro de téléphone fourni',
          profile_picture: user.profile_picture,
          createdAt: user.createdAt,
          skills: user.skills || [] // Inclure les compétences
        }
      });
      
    } catch (userError) {
      console.error('Erreur lors de la récupération de l\'utilisateur :', userError);
      return res.status(200).json(defaultProfile);
    }
    
  } catch (error) {
    console.error('Erreur lors de la récupération du profil utilisateur :', error);
    return res.status(200).json(defaultProfile);
  }
};

const getUserWorkspacesCount = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find workspaces where user is owner
    const ownedWorkspaces = await Workspace.find({
      owner: userId,
      isDeleted: { $ne: true },
      isArchived: { $ne: true }
    });
    
    // Find workspaces where user is a member - using the CORRECT query pattern
    const memberWorkspaces = await Workspace.find({
      'members.user': userId,  // This is the correct way to query the nested user field
      isDeleted: { $ne: true },
      isArchived: { $ne: true }
    });
    
    // Combine owned and member workspaces, avoiding duplicates
    const uniqueWorkspaces = new Set();
    
    // Add owned workspaces
    ownedWorkspaces.forEach(workspace => {
      uniqueWorkspaces.add(workspace._id.toString());
    });
    
    // Add member workspaces
    memberWorkspaces.forEach(workspace => {
      uniqueWorkspaces.add(workspace._id.toString());
    });
    
    // Convert to array
    const allWorkspaceIds = Array.from(uniqueWorkspaces);
    
    return res.status(200).json({ 
      count: allWorkspaceIds.length,
      workspaces: allWorkspaceIds
    });
    
  } catch (error) {
    console.error('Error counting user workspaces:', error);
    return res.status(200).json({ count: 0 });
  }
};
const fixUserWorkspaces = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`Found user: ${user.name}, ID: ${user._id}`);
    
    try {
      // First, find workspaces where user is owner
      const ownedWorkspaces = await Workspace.find({
        owner: userId,
        isDeleted: { $ne: true },
        isArchived: { $ne: true }
      });
      
      // Then, find all workspaces
      const allWorkspaces = await Workspace.find({
        isDeleted: { $ne: true },
        isArchived: { $ne: true }
      });
      
      // Manually filter to find workspaces where user is a member
      const memberWorkspaces = allWorkspaces.filter(workspace => {
        if (!workspace.members || !Array.isArray(workspace.members)) {
          return false;
        }
        
        return workspace.members.some(member => {
          // Handle ObjectId or string comparison
          if (typeof member === 'object' && member._id) {
            return member._id.toString() === userId.toString();
          }
          return member.toString() === userId.toString();
        });
      });
      
      // Combine owned and member workspaces
      const activeWorkspaces = [
        ...ownedWorkspaces,
        ...memberWorkspaces.filter(w => 
          !ownedWorkspaces.some(ow => ow._id.toString() === w._id.toString())
        )
      ];
      
      console.log(`Found ${activeWorkspaces.length} active workspaces for user`);
      
      // Get the IDs of these workspaces
      const workspaceIds = activeWorkspaces.map(w => w._id);
      
      // Save original workspaces for comparison
      const originalWorkspaces = user.workspaces ? [...user.workspaces] : [];
      console.log(`Original workspaces: ${originalWorkspaces.length}`);
      
      // Update user document with ONLY these workspace IDs
      user.workspaces = workspaceIds;
      await user.save();
      
      return res.status(200).json({ 
        message: 'User workspace references fixed',
        workspaceCount: workspaceIds.length,
        originalCount: originalWorkspaces.length,
        workspaces: activeWorkspaces.map(w => ({
          _id: w._id.toString(),
          name: w.name,
          owner: w.owner.toString(),
          isOwner: w.owner.toString() === userId.toString()
        }))
      });
    } catch (queryError) {
      console.error('Error finding workspaces:', queryError);
      return res.status(500).json({ 
        error: queryError.message, 
        step: 'workspace_query' 
      });
    }
  } catch (error) {
    console.error('Error fixing user workspaces:', error);
    return res.status(500).json({ 
      error: error.message,
      step: 'main'
    });
  }
};
const getUserCount = async (req, res) => {
    try {
        const count = await User.countDocuments(); // 👈 Récupère le nombre total d'utilisateurs
        res.status(200).json({ count });
    } catch (err) {
        res.status(500).json({ error: "Failed to retrieve user count", details: err });
    }
};


module.exports = { getUserWorkspacesCount,fixUserWorkspaces, getUserProfile, profilePictureUpload, getBasicUserInfo, getAllUsers, addUser, updateUser, dropUser, getUserById, changePassword, getLoggedUser, updateLoggedUserPassword, UpdateLoggeduserData, deleteLoggedUser,getMe ,getUserCount};




