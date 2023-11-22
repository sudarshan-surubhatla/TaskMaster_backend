import taskModel from "../models/taskModel.js";
import userModel from "../models/userModel.js";
import { createTransport } from 'nodemailer';
import moment from 'moment-timezone';
import dotenv from "dotenv";
import cron from 'node-cron';

dotenv.config();

// Function to send email
const sendMail = async (email, subject, title, description, isReminder, isDeleted) => {
    try {
        var transporter = createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USERNAME,
                pass: process.env.GMAIL_PASSWORD
            }
        });

        const mailOptions = {
            from: 'taskmaster.mern@gmail.com',
            to: email,
            subject: subject,
            html: `
                <div style="font-family: 'Roboto', sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
                <h1 style="color: ${isDeleted ? '#FF5555' : '#007BFF'}; text-align: center; margin-bottom: 20px;">
                        ${isDeleted ? 'Task Deleted' : isReminder ? 'Task Reminder' : 'Task Added Successfully'}
                    </h1>
                    <div style="background-color: #ffffff; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                        <h2 style="color: #333; margin-bottom: 10px;">Title: ${title}</h2>
                        <p style="color: #555; margin-bottom: 0;">Description: ${description}</p>
                    </div>
                    <p style="color: #777; font-size: 14px; text-align: center;">Thank you for using TaskMaster!</p>
                     <div style="text-align: center;">
                <a href="https://your-taskmaster.vercel.app/" style="display: inline-block; padding: 10px 20px; background-color: #007BFF; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">Visit TaskMaster</a>
            </div>
                </div>`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email:', error.message);
    }
};
const scheduleEmail = (task) => {
    console.log("Scheduling email for task...");
    const datetimeFormat = { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
    const parsedDatetime = new Date(task.datetime);
    if (isNaN(parsedDatetime.getTime())) {
        console.log("Unable to parse the datetime. Please check the format of task.datetime.");
        return;
    }
    const delay = parsedDatetime - Date.now();
    setTimeout(async () => {
        try {
            console.log('Scheduled function called at:', new Intl.DateTimeFormat('en-US', datetimeFormat).format(new Date()));
            await sendMail(task.email, "Task Reminder", task.title, task.description, true, false);
            console.log('Reminder Email sent successfully');
        } catch (error) {
            console.error('Error sending email:', error.message);
            console.error('Error stack:', error.stack);
        }
    }, delay);
};

const addTask = async (req, res) => {
    const { title, description, datetime, userTimeZone } = req.body;
    const userId = req.user.id;
    const adjustedDateTime = moment(datetime).subtract(5, 'hours').subtract(30, 'minutes');
    const utcDateTime = adjustedDateTime.utc().format();

    try {
        const user = await userModel.find({ _id: userId });
        if (!user || user.length === 0) {
            console.error("User not found for ID:", userId);
            return res.status(404).json({ message: "User not found" });
        }

        const newTask = new taskModel({
            title,
            description,
            datetime: utcDateTime,
            completed: false,
            userId,
            userTimeZone,
            email: user[0].email,
        });

        const savedTask = await newTask.save();
        sendMail(user[0].email, "Task Added", title, description, false, false);
        scheduleEmail(savedTask);

        return res.status(200).json({ message: "Task added successfully" });
    } catch (error) {
        console.error("Error adding task:", error);
        return res.status(500).json({ message: error.message });
    }
};

const removeTask = (req, res) => {
    const { id } = req.params;
    taskModel.findByIdAndDelete(id)
        .then(async (deletedTask) => {
            console.log("Task deleted successfully");
            const { email, title, description } = deletedTask;
            try {
                await sendMail(email, "Task Deleted", title, description, false, true);
            } catch (error) {
                console.error('Error sending email:', error.message);
            }
            res.status(200).json({ message: "Task deleted successfully" });
        })
        .catch((error) => {
            console.error("Error deleting task:", error);
            res.status(501).json({ message: error.message });
        });
};

const updateTask = async (req, res) => {
    const { id } = req.params;
    const { title, description, datetime, completed } = req.body;
    try {
        const updatedTask = await taskModel.findByIdAndUpdate(
            id,
            { title, description, datetime, completed },
            { new: true }
        );
        res.json(updatedTask);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
const getTask = (req, res) => {
    taskModel.find({ userId: req.user.id })
        .then((data) => res.status(200).json(data))
        .catch((error) => res.status(501).json({ message: error.message }))
}
export { addTask, getTask, removeTask, updateTask }
