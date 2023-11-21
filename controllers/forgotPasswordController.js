import userModel from "../models/userModel.js";
import { createTransport } from "nodemailer"
import crypto from "crypto"
import bcrypt from "bcrypt"
import dotenv from "dotenv"
dotenv.config()

const forgotPassword = async (req, res) => {
    const { email } = req.body;
    
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetToken = resetToken;
    await user.save();

    const resetUrl = `http://localhost:3000/resetPassword?token=${resetToken}`;
    var transporter = createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.GMAIL_USERNAME,
            pass: process.env.GMAIL_PASSWORD
        }
    });

    var mailOptions = {
        from: 'taskmaster.mern@gmail.com',
        to: email,
        subject: "Reset Password",
        html:`<h1>Reset Password</h1><h2>Click on the link to reset your password</h2><h3>${resetUrl}</h3>`
    };

    await transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
    
    res.status(200).json({ message: 'A link to reset your password have been sent to your email.' });
  };

const resetPassword = async (req, res) => {
    const { token, password } = req.body;

    console.log("token: ", token);
    const user = await userModel.findOne({ resetToken:token });
    if (!user) {
      return res.status(400).json({ message: 'Invalid token' });
    }
    
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetToken = null;
    await user.save(); 
    res.status(200).json({ message: 'Password reset successful' });
  };
 export {forgotPassword, resetPassword}
  
