// NOTE: comments in English only

const fs = require("fs").promises;
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User"); // Mongoose model (see models/User.js)
const Labels = require("../models/labels"); // optional; keep if you already have one

// inboxMap is in-memory; 
// remove it for production. Keeping a guarded call:
let inboxMap;
try {
  inboxMap = require("../utils/inboxMap");
} catch {
  inboxMap = null;
}

const SECRET = process.env.JWT_SECRET || "dev_only_replace";

// --- helpers ---
const dataUrlRegex = /^data:(image\/(png|jpeg|jpg|webp));base64,/i;


async function register(req, res) {
  try {
    console.log("=== REGISTER DEBUG START ===");
    console.log("Request body keys:", Object.keys(req.body || {}));
    console.log("Has file:", !!req.file);
    console.log("ProfilePicture field:", !!req.body.profilePicture);
    
    // pull fields from body (multer text fields also come on req.body)
    const {
      firstName,
      lastName,
      password,
      email,
      birthDate,
      phone,
      gender,
    } = req.body;

    // image source priority:
    // multer file (req.file)
    // JSON field "profilePicture" (data URL or base64)
    const profilePicture = req.body.profilePicture || null;
    
    console.log("=== AVATAR PROCESSING ===");
    console.log("Profile picture from request:", !!profilePicture);
    if (profilePicture) {
      console.log("Profile picture type:", typeof profilePicture);
      console.log("Profile picture length:", profilePicture.length);
      console.log("Profile picture sample:", profilePicture.substring(0, 100));
    }

    // minimal required validation (keep it simple here; you can plug Zod if you want)
    if (!firstName || !lastName || !password || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // unique email
    const exists = await User.findOne({ email: (email || "").toLowerCase().trim() }).lean();
    if (exists) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // password hash
    const passwordHash = await bcrypt.hash(password, 12);

    // avatar parse (optional)
    let avatarDoc = null;
    try {
      if (req.file) {
        console.log("Processing multer file...");
        avatarDoc = await parseAvatarFromUploadedFile(req.file);
      } else if (profilePicture) {
        console.log("Processing profilePicture field...");
        avatarDoc = parseAvatarFromDataUrlOrBase64(profilePicture);
        console.log("Avatar parsed successfully:", {
          hasData: !!avatarDoc?.data,
          dataLength: avatarDoc?.data?.length || 0,
          contentType: avatarDoc?.contentType
        });
      }
    } catch (e) {
      console.error("Avatar processing error:", e.message);
      return res.status(400).json({ error: e.message || "Invalid avatar" });
    } finally {
      // cleanup multer tmp file if present
      if (req.file) {
        try { await fs.unlink(req.file.path); } catch { }
      }
    }

    console.log("=== CREATING USER ===");
    console.log("Has avatar:", !!avatarDoc);

    // persist user in Mongo
    const user = await User.create({
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: String(email).toLowerCase().trim(),
      passwordHash,
      gender: String(gender || "").toLowerCase().trim() || "other",
      birthDate: birthDate ? new Date(birthDate) : null,
      phone: String(phone || "").trim(),
      avatar: avatarDoc || undefined, // ודא שזה undefined ולא null
    });

    console.log("=== USER CREATED ===");
    console.log("User ID:", user._id.toString());
    console.log("User has avatar:", !!user.avatar);

    // FIXED: Add user to inboxMap (temporary until we migrate fully to MongoDB)
    if (inboxMap) {
      try {
        inboxMap.set(user.email, []);
        console.log(`Added ${user.email} to inboxMap`);
      } catch (err) {
        console.log("Failed to add user to inboxMap:", err.message);
      }
    }

    // Create default labels
    if (Labels?.createLabel) {
      try { await Labels.createLabel(user.email, "Spam"); } catch { }
    }

    // respond
    return res.status(201).json({
      id: user._id.toString(),
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      profilePicture: avatarDoc ? { 
        contentType: avatarDoc.contentType, 
        size: avatarDoc.data.length 
      } : null,
    });
  } catch (err) {
    console.error("POST /register error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}


function parseAvatarFromDataUrlOrBase64(avatarStr) {
  console.log("=== PARSE AVATAR DEBUG ===");
  console.log("Input type:", typeof avatarStr);
  console.log("Input length:", avatarStr?.length || 0);
  console.log("Input sample:", avatarStr?.substring(0, 50) || "empty");
  
  if (!avatarStr) return null;
  
  let contentType = "image/png";
  let b64 = avatarStr;

  if (dataUrlRegex.test(avatarStr)) {
    console.log("Detected data URL format");
    const parts = avatarStr.split(";base64,");
    if (parts.length !== 2) throw new Error("Invalid data URL");
    contentType = parts[0].split(":")[1];
    b64 = parts[1];
  } else {
    console.log("Assuming raw base64 format");
  }
  
  console.log("Content type:", contentType);
  console.log("Base64 length:", b64.length);
  
  const buf = Buffer.from(b64, "base64");
  console.log("Buffer created, length:", buf.length);
  
  if (!buf.length) throw new Error("Invalid base64");
  if (buf.length > 2 * 1024 * 1024) throw new Error("Avatar too large (max 2MB)");

  // very light magic bytes check
  const isPng = buf.slice(0, 8).toString("hex") === "89504e470d0a1a0a";
  const isJpeg = buf.slice(0, 3).toString("hex") === "ffd8ff";
  const isRiff = buf.slice(0, 4).toString("ascii").toUpperCase() === "RIFF"; // webp
  
  console.log("Image validation:", { isPng, isJpeg, isRiff });
  
  if (!isPng && !isJpeg && !isRiff) throw new Error("Invalid image data");

  const result = { data: buf, contentType };
  console.log("Parse successful:", {
    contentType: result.contentType,
    dataLength: result.data.length
  });
  
  return result;
}
async function login(req, res) {
  try {
    const email = (req.body.email || "").toLowerCase().trim();
    const password = req.body.password || "";

    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Add user to inboxMap if not exists (for existing users)
    if (inboxMap && !inboxMap.has(user.email)) {
      try {
        inboxMap.set(user.email, []);
        console.log(`Added existing user ${user.email} to inboxMap`);
      } catch (err) {
        console.log("Failed to add existing user to inboxMap:", err.message);
      }
    }

    // sign with sub = user._id for consistency with auth middleware
    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email },
      SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({ token, expiresIn: 3600 });
  } catch (err) {
    console.error("POST /login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// --- Controller: GET /me (requires authenticateToken that loads req.user/req.auth) ---
async function getCurrentUser(req, res) {
  try {
    // if you used my auth middleware, req.user is the Mongo doc already:
    if (req.user && req.user._id) {
      // sanitize
      const u = { ...req.user };
      delete u.passwordHash;
      return res.status(200).json(u);
    }

    // fallback: if middleware only set payload (e.g., req.user.userId)
    const id = req.user?.sub || req.user?.userId;
    if (!id) return res.status(401).json({ error: "Unauthorized" });

    const user = await User.findById(id).select("-passwordHash").lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.status(200).json(user);
  } catch (err) {
    console.error("GET /me error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

const getAvatar = async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log(`[AVATAR] Getting avatar for user: ${userId}`);
    
    const user = await User.findById(userId).select('avatar');
    if (!user) {
      console.log(`[AVATAR] User not found: ${userId}`);
      return res.status(404).json({ error: "User not found" });
    }
    
    if (!user.avatar || !user.avatar.data) {
      console.log(`[AVATAR] Avatar not found for user: ${userId}`);
      return res.status(404).json({ error: "Avatar not found" });
    }

    console.log(`[AVATAR] Found avatar data`);
    console.log(`[AVATAR] Data type: ${typeof user.avatar.data}`);
    console.log(`[AVATAR] Is Buffer: ${Buffer.isBuffer(user.avatar.data)}`);
    console.log(`[AVATAR] Content type: ${user.avatar.contentType}`);

    res.set({
      'Content-Type': user.avatar.contentType || 'image/png',
      'Cache-Control': 'public, max-age=86400'
    });
    
    if (Buffer.isBuffer(user.avatar.data)) {
      console.log(`[AVATAR] Sending Buffer of size: ${user.avatar.data.length}`);
      return res.send(user.avatar.data);
    }
    
    if (user.avatar.data && user.avatar.data.buffer) {
      console.log(`[AVATAR] Converting MongoDB Buffer object to Buffer`);
      const buffer = Buffer.from(user.avatar.data.buffer);
      console.log(`[AVATAR] Converted buffer size: ${buffer.length}`);
      return res.send(buffer);
    }
    
    if (typeof user.avatar.data === 'string') {
      console.log(`[AVATAR] Converting base64 string to Buffer`);
      const buffer = Buffer.from(user.avatar.data, 'base64');
      return res.send(buffer);
    }
    
    console.log(`[AVATAR] Trying to convert unknown format to Buffer`);
    console.log(`[AVATAR] Raw data sample:`, user.avatar.data.toString().substring(0, 100));
    const buffer = Buffer.from(user.avatar.data);
    console.log(`[AVATAR] Final buffer size: ${buffer.length}`);
    return res.send(buffer);
    
  } catch (err) {
    console.error("Error getting avatar:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const getAvatarByEmail = async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    console.log(`[AVATAR-BY-EMAIL] Getting avatar for email: ${email}`);
    
    const user = await User.findOne({ email }).select('avatar');
    if (!user) {
      console.log(`[AVATAR-BY-EMAIL] User not found: ${email}`);
      return res.status(404).json({ error: "User not found" });
    }
    
    if (!user.avatar || !user.avatar.data) {
      console.log(`[AVATAR-BY-EMAIL] Avatar not found for email: ${email}`);
      return res.status(404).json({ error: "Avatar not found" });
    }

    console.log(`[AVATAR-BY-EMAIL] Found avatar data for: ${email}`);

    res.set({
      'Content-Type': user.avatar.contentType || 'image/png',
      'Cache-Control': 'public, max-age=86400'
    });
    
    if (Buffer.isBuffer(user.avatar.data)) {
      return res.send(user.avatar.data);
    }
    
    if (user.avatar.data && user.avatar.data.buffer) {
      const buffer = Buffer.from(user.avatar.data.buffer);
      return res.send(buffer);
    }
    
    if (typeof user.avatar.data === 'string') {
      const buffer = Buffer.from(user.avatar.data, 'base64');
      return res.send(buffer);
    }
    
    const buffer = Buffer.from(user.avatar.data);
    return res.send(buffer);
    
  } catch (err) {
    console.error("Error getting avatar by email:", err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { register, login, getCurrentUser, getAvatar,getAvatarByEmail };