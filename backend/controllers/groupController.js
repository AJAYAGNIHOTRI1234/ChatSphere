import Conversation from "../models/Conversation.js";
import User from "../models/User.js";

// ========================================
// CREATE GROUP
// ========================================
export const createGroup = async (req, res) => {
    try {
        const { groupName, participantIds, groupPicture } = req.body;
        const adminId = req.user._id;

        // Validation
        if (!groupName || !groupName.trim()) {
            return res.status(400).json({
                success: false,
                message: "Group name is required"
            });
        }

        if (!Array.isArray(participantIds) || participantIds.length < 2) {
            return res.status(400).json({
                success: false,
                message: "A group must have at least 2 other participants (minimum 3 members total)"
            });
        }

        // Deduplicate and combine participants including admin
        const uniqueMemberIds = Array.from(
            new Set([...participantIds.map((id) => id.toString()), adminId.toString()])
        );

        // Verify all participants exist in database
        const validUsers = await User.find({ _id: { $in: uniqueMemberIds } });
        if (validUsers.length < uniqueMemberIds.length) {
            return res.status(404).json({
                success: false,
                message: "One or more selected participants do not exist"
            });
        }

        // Create new group conversation
        const groupConversation = await Conversation.create({
            isGroup: true,
            groupName: groupName.trim(),
            groupPicture: groupPicture || "",
            groupAdmin: adminId,
            participants: uniqueMemberIds
        });

        const populatedGroup = await Conversation.findById(groupConversation._id)
            .populate("participants", "name email profilePicture bio isOnline lastSeen")
            .populate("groupAdmin", "name email profilePicture")
            .populate("lastMessage");

        // Broadcast to each participant's personal room via Socket.IO
        const io = req.app.get("io");
        if (io) {
            uniqueMemberIds.forEach((memberId) => {
                io.to(memberId).emit("new_group_created", populatedGroup);
            });
        }

        return res.status(201).json({
            success: true,
            message: "Group created successfully",
            data: populatedGroup
        });

    } catch (error) {
        console.error("Create Group Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ========================================
// ADD MEMBER TO GROUP
// ========================================
export const addMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        const group = await Conversation.findById(id);

        if (!group || !group.isGroup) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        // Check if requester is group admin
        if (group.groupAdmin.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Only the group admin can add members"
            });
        }

        // Check if user already in group
        const isAlreadyMember = group.participants.some(
            (p) => p.toString() === userId.toString()
        );

        if (isAlreadyMember) {
            return res.status(400).json({
                success: false,
                message: "User is already a member of this group"
            });
        }

        // Check user existence
        const userToAdd = await User.findById(userId);
        if (!userToAdd) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Add member
        group.participants.push(userId);
        await group.save();

        const updatedGroup = await Conversation.findById(id)
            .populate("participants", "name email profilePicture bio isOnline lastSeen")
            .populate("groupAdmin", "name email profilePicture")
            .populate("lastMessage");

        // Real-time broadcast
        const io = req.app.get("io");
        if (io) {
            io.to(id.toString()).emit("group_updated", updatedGroup);
            io.to(userId.toString()).emit("new_group_created", updatedGroup);
        }

        return res.status(200).json({
            success: true,
            message: "Member added successfully",
            data: updatedGroup
        });

    } catch (error) {
        console.error("Add Member Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ========================================
// REMOVE MEMBER FROM GROUP / LEAVE GROUP
// ========================================
export const removeMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        const group = await Conversation.findById(id);

        if (!group || !group.isGroup) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        const requesterId = req.user._id.toString();
        const targetUserId = userId.toString();
        const isAdmin = group.groupAdmin.toString() === requesterId;
        const isSelfLeaving = requesterId === targetUserId;

        // Only admin or the user themselves can remove
        if (!isAdmin && !isSelfLeaving) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: You can only remove yourself or be removed by admin"
            });
        }

        // Filter out participant
        group.participants = group.participants.filter(
            (p) => p.toString() !== targetUserId
        );

        // If admin leaves, assign new admin from remaining members if any
        if (group.groupAdmin.toString() === targetUserId && group.participants.length > 0) {
            group.groupAdmin = group.participants[0];
        }

        await group.save();

        const updatedGroup = await Conversation.findById(id)
            .populate("participants", "name email profilePicture bio isOnline lastSeen")
            .populate("groupAdmin", "name email profilePicture")
            .populate("lastMessage");

        // Broadcast to group and removed user
        const io = req.app.get("io");
        if (io) {
            io.to(id.toString()).emit("group_updated", updatedGroup);
            io.to(targetUserId).emit("member_removed_from_group", {
                groupId: id.toString(),
                message: "You have been removed from this group"
            });
        }

        return res.status(200).json({
            success: true,
            message: isSelfLeaving ? "Left group successfully" : "Member removed successfully",
            data: updatedGroup
        });

    } catch (error) {
        console.error("Remove Member Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ========================================
// UPDATE GROUP DETAILS (Name, Picture)
// ========================================
export const updateGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const { groupName, groupPicture } = req.body;

        const group = await Conversation.findById(id);

        if (!group || !group.isGroup) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        // Only admin can update group info
        if (group.groupAdmin.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Only the group admin can update group details"
            });
        }

        if (groupName && groupName.trim()) {
            group.groupName = groupName.trim();
        }

        if (groupPicture !== undefined) {
            group.groupPicture = groupPicture;
        }

        await group.save();

        const updatedGroup = await Conversation.findById(id)
            .populate("participants", "name email profilePicture bio isOnline lastSeen")
            .populate("groupAdmin", "name email profilePicture")
            .populate("lastMessage");

        const io = req.app.get("io");
        if (io) {
            io.to(id.toString()).emit("group_updated", updatedGroup);
        }

        return res.status(200).json({
            success: true,
            message: "Group details updated successfully",
            data: updatedGroup
        });

    } catch (error) {
        console.error("Update Group Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

