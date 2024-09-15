import { createServer } from "http";
import express from "express";
import cors from "cors";
// import { Server } from "socket.io";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
dotenv.config({ path: "./config.env" });
const port = process.env.PORT;

const users = {};

// Function to generate unique filenames
const generateUniqueFilename = (originalname) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 12); // 10 char random string
  return `${timestamp}-${randomString}${path.extname(originalname)}`;
};

// Setup multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, generateUniqueFilename(file.originalname));
  },
});

const upload = multer({ storage });

// Middleware to serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("Hey Server");
});

app.use(cors());

const server = createServer(app);
const io = new Server(server);

io.on("connection", (socket) => {
  console.log("Connection established!");

  socket.on("Joined", ({ user }) => {
    users[socket.id] = user;
    console.log(user, "has joined the chat.");

    socket.broadcast.emit("userJoined", {
      user: "Bot",
      msg: `@${users[socket.id]} has joined the chat../`,
    });

    socket.emit("welcome", {
      user: "Bot",
      id: socket.id,
      msg: `Welcome to the chat @${users[socket.id]}../`,
    });
  });

  socket.on("msg", ({ user, msg, id }) => {
    io.emit("receive-msg", { user, msg, id });
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      console.log(user, "has disconnected");

      socket.broadcast.emit("userLeft", {
        user: "Bot",
        msg: `@${user} has left the chat.`,
      });

      delete users[socket.id];
    }
  });

  app.post("/upload", upload.single("file"), (req, res) => {
    const file = req.file;
    const { user, id } = req.body;

    if (!file) {
      return res.status(400).send("No file uploaded.");
    }

    const fileUrl = `/uploads/${file.filename}`;

    // Emit file upload event with user and file URL
    io.emit("fileUploaded", { fileUrl, user, id });

    // Delete the file after 10 seconds
    setTimeout(() => {
      const filePath = path.join(__dirname, "uploads", file.filename);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error("Error deleting file:", err);
        } else {
          console.log("File deleted:", file.filename);
        }
      });
    }, 10000); // 10 seconds

    res.json({ fileUrl, user });
  });
});

server.listen(port, () => console.log(`Server is running at Port -> ${port}`));
