import User from "../models/user.model.js";
import Message from '../models/message.model.js';
import cloudinary from '../lib/cloudinary.js';
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {

    try {
        const loggedInUserId = req.user._id;

        // now we will tell mongoose to give us all users (not their password though) except the current user

        const filteredusers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password")

        res.status(200).json(filteredusers);

    } catch (error) {
        console.log('Error in getUsersForSidebar', error.message)
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export const getMessages = async (req, res) => {

    try {

        const { id: userToChatId } = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myId },
            ]
        })
        res.status(200).json(messages);
    }

    catch (error) {
        console.log('Error in getMessages controller', error.message)
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export const sendMessage = async (req, res) => {


    try {

        const { text, image } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        let imageUrl;

        if (image) {

            // Upload base64 image to cloudinary

            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        };

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl

        });

        await newMessage.save();

        //  realtime chat functionality goes here by ==> socket.io

        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        res.status(201).json(newMessage);

    } catch (error) {
        console.log('Error in sendMessages controller', error.message)
        res.status(500).json({ error: "Internal Server Error" })
    };

}