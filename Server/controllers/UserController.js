const User = require('../models/user');



const getAllUsers = (req, res) => {
    User.find()
        .then(data => res.json(data))
        .catch(err => res.status(500).json({ error: "Failed to retrieve users", details: err }));
};

const updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const updates = req.body;
        
        delete updates.password;
        delete updates.authentication_method;
        delete updates.role;
        
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ 
            error: "Failed to update user", 
            details: err.message 
        });
    }
};

const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const deletedUser = await User.findByIdAndDelete(userId);
        
        if (!deletedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: "User successfully deleted", user: deletedUser });
    } catch (err) {
        res.status(500).json({
            error: "Failed to delete user",
            details: err.message
        });
    }
};

module.exports = { 
    getAllUsers,
    updateUser,
    deleteUser 
};