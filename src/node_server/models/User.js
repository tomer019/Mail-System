// NOTE: comments in English only
const mongoose = require("mongoose");
const { fa } = require("zod/locales");
const { Schema, model } = mongoose;

const UserSchema = new Schema(
    {
        firstName: { type: String, trim: true, required: true },
        lastName: { type: String, trim: true, required: true },
        email: { type: String, trim: true, lowercase: true, unique: true, required: true, index: true },
        passwordHash: { type: String, required: true },

        gender: { type: String, enum: ["male", "female", "other"], required: false },
        birthDate: { type: Date, required: false }, // set to true if you enforce it
        phone: { type: String, trim: true, required: false }, // set to true if you enforce it

        avatar: { data: Buffer, contentType: String }, // small files only
    },
    { timestamps: true }
);

module.exports = model("User", UserSchema);
