import mongoose from "mongoose";

const taskInstance = mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    userId: { type: String, required: true },
    completed: { type: Boolean, required: true },
    datetime: { type: Date, required: false },
    userTimeZone: { type: String, required: false },
    email: { type: String, required: true }, 
  },
  { timestamps: true }
);

const taskModel = mongoose.model("Task", taskInstance);

export default taskModel;