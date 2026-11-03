import express from "express";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const app = express();

app.use(express.json());

const studentsSchema = new mongoose.Schema({
  studentCode: String,
  fullName: String,
  email: String,
});

const classesSchema = new mongoose.Schema({
  className: String,
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subjects",
  },
  lecturerName: String,
  status: String,
  enrollments: [
    {
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Students",
      },
      status: String,
    },
  ],
});

const attendancesSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Students",
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Classes",
  },
  date: Date,
  status: {
    type: String,
    enum: ["PRESENT", "ABSENT"],
  },
});

const subjectsSchema = new mongoose.Schema({
  code: String,
  name: String,
  credits: Number,
  status: String,
});

const Attendances = mongoose.model("Attendances", attendancesSchema);
const Classes = mongoose.model("Classes", classesSchema);
const Subjects = mongoose.model("Subjects", subjectsSchema);
const Students = mongoose.model("Students", studentsSchema);

app.get("/", async (req, res) => {
  try {
    return res.status(200).json({ message: "Welcome to Practical Exam!" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Req2
app.get("/api/classes/:classId/students", async (req, res) => {
  try {
    const { classId } = req.params;
    const { status } = req.query;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: `Invalid classId: ${classId}` });
    }

    const classData = await Classes.findById(classId).populate({
      path: "enrollments.studentId",
      select: "studentCode fullName email",
    });

    if (!classData) {
      return res.status(404).json({ error: `Class with id: ${classId} not found` });
    }

    let enrollments = classData.enrollments || [];
    if (status) {
      enrollments = enrollments.filter(
        (e) => e.status && e.status.toLowerCase() === status.toLowerCase()
      );
    }

    const result = enrollments.map((item) => ({
      studentId: item.studentId?._id || item.studentId,
      studentCode: item.studentId?.studentCode,
      fullName: item.studentId?.fullName,
      email: item.studentId?.email,
      status: item.status,
    }));

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});


//Req4
app.get("/api/students/:studentId/attendances", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status, classId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ error: `Invalid studentId: ${studentId}` });
    }

    const student = await Students.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: `Student with id: ${studentId} not found` });
    }

    const filter = { studentId };
    if (status) {
      filter.status = status.toUpperCase();
    }
    if (classId) {
      filter.classId = classId;
    }

    const attendances = await Attendances.find(filter)
      .populate({
        path: "classId",
        select: "className lecturerName subjectId status",
        populate: {
          path: "subjectId",
          select: "code name credits",
        },
      })
      .sort({ date: 1 });

    return res.status(200).json(attendances);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

connectDB();

const PORT = process.env.PORT || 9999;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
