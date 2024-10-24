import { Request, Response } from 'express';
import Meeting from '../models/Meeting'; // Adjust the import path as necessary

// Create a new meeting
export const createMeeting = async (req: Request, res: Response) => {
    const meetingData = req.body; // Ensure proper validation and sanitization

    try {
        const newMeeting = new Meeting(meetingData);
        await newMeeting.save();

        res.status(201).json(newMeeting);
    } catch (error) {
        res.status(400).json({ message: 'Failed to create meeting', error });
    }
};

// Get all meetings
export const getAllMeetings = async (req: Request, res: Response) => {
    try {
        const meetings = await Meeting.find().populate('salesTeam cre'); // Populate related fields
        res.status(200).json(meetings);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve meetings', error });
    }
};

// Get a single meeting by ID
export const getSingleMeeting = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const meeting = await Meeting.findById(id).populate('salesTeam cre'); // Populate related fields

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        res.status(200).json(meeting);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve meeting', error });
    }
};

// Update meeting details
export const updateMeeting = async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body; // Ensure proper validation and sanitization

    try {
        const meeting = await Meeting.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).populate('salesTeam cre');

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        res.status(200).json(meeting);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update meeting', error });
    }
};

