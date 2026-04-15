import User from '../model/User.js';
import Employee from '../model/Employee.js';
import bcrypt from 'bcrypt';
export const updateProfile = async (req, res) => {
    try {
        const { name, phone } = req.body;
        const userId = req.user.id;
        // Multi-model update
        let updatedUser = await User.findByIdAndUpdate(userId, { $set: { name, phone } }, { new: true, runValidators: true }).select('-password');
        if (!updatedUser) {
            updatedUser = await Employee.findByIdAndUpdate(userId, { $set: { name, phone } }, { new: true }).select('-password');
        }
        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        let user = await User.findById(userId).select('+password');
        if (!user)
            user = await Employee.findById(userId).select('+password');
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password incorrect' });
        }
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await User.findByIdAndUpdate(userId, { password: hashedPassword });
        await Employee.findByIdAndUpdate(userId, { password: hashedPassword }, { upsert: true });
        res.json({ success: true, message: 'Password changed successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        let user = await User.findById(userId).select('-password');
        if (!user)
            user = await Employee.findById(userId).select('-password');
        res.json({ success: true, user });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
//# sourceMappingURL=settingsController.js.map