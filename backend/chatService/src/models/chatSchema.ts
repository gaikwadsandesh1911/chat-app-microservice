import mongoose, { Document } from "mongoose";
export interface IChat extends Document {
  users: string[];
  latestMessage: {
    text: string;
    sender: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema: mongoose.Schema<IChat> = new mongoose.Schema(
  {
    users: [{ type: String, required: true }],
    latestMessage: {
      text: String,
      sender: String,
    },
  },
  { timestamps: true }
);

export const Chat = mongoose.model<IChat>("Chat", chatSchema);
