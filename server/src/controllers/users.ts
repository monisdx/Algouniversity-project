import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.ts";
import axios from "axios";
import dotenv from "dotenv";
import { rejects } from "assert";

dotenv.config();

export const signin = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const existinguser = await User.findOne({ email });

    if (!existinguser)
      return res.status(404).json({ message: "user doesn't exit" });

    const ispasswordcorrect = await bcrypt.compare(
      password,
      existinguser.password || ""
    );

    if (!ispasswordcorrect)
      return res.status(400).json({ message: "invalid credensials" });

    const token = jwt.sign(
      { email: existinguser.email, id: existinguser._id },
      process.env.SECRET_KEY || "test",
      { expiresIn: "1d" }
    );

    res.status(200).json({ result: existinguser, token });
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
};

export const signup = async (req: Request, res: Response) => {
  const { email, password, confirmpassword, name } = req.body;

  try {
    const existinguser = await User.findOne({ email });

    if (existinguser)
      return res.status(400).json({ message: "user already exit" });

    if (password !== confirmpassword)
      return res.status(400).json({ message: "password doesn't matched" });

    const hashPassword = await bcrypt.hash(password, 12);

    const result = await User.create({ email, password: hashPassword, name });

    const token = jwt.sign(
      { email: result.email, id: result._id },
      process.env.SECRET_KEY || "test",
      { expiresIn: "1d" }
    );

    res.status(200).json({ result, token });
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
};

export const googleoauth = async (req: Request, res: Response) => {
  const { googletoken } = req.body;

  const user = await axios
    .get("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${googletoken}` },
    })
    .then(async (res) => res.data);

  const name = user.name;
  const email = user.email;
  const picture = user.picture;

  try {
    const existinguser = await User.findOne({ email });

    if (!existinguser) {
      const result = await User.create({ email, name, picture });

      const token = jwt.sign(
        { email: result.email, id: result._id },
        process.env.SECRET_KEY || "test",
        { expiresIn: "1d" }
      );

      res.status(200).json({ result, token });
    } else {
      const token = jwt.sign(
        { email: existinguser.email, id: existinguser._id },
        process.env.SECRET_KEY || "test",
        { expiresIn: "1d" }
      );

      res.status(200).json({ result: existinguser, token });
    }
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
};

export const getUserInfo = async (req: Request, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(req.userId);

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

export const getLeaderBoardUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find()
      .sort({ "problems.length": -1, name: 1 })
      .limit(5);

    res.status(200).json({ usersList: users });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const addLeaderBoardUser = async (
  user_id: string | undefined,
  problem_id: string
) => {
  const user = await User.findById(user_id);

  if (!user) throw new Error("User not exist");

  const index = user.problems.findIndex((id) => id === String(problem_id));
  if (index === -1) {
    user?.problems.push(problem_id);
    await user?.save();
  }
};
