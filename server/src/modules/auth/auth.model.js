import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required."],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters."],
    },

    lastName: {
      type: String,
      required: [true, "Last name is required."],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters."],
    },

    email: {
      type: String,
      required: [true, "Email address is required."],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [120, "Email address cannot exceed 120 characters."],
    },

    phoneNumber: {
      type: String,
      required: [true, "Phone number is required."],
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: [8, "Password must contain at least 8 characters."],
      select: false,
    },

    role: {
      type: String,
      enum: ["customer", "seller", "rider", "admin"],
      default: "customer",
      required: true,
    },

    accountStatus: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },

    verificationStatus: {
      type: String,
      enum: ["not_required", "pending", "approved", "rejected"],
      default: "not_required",
    },

    profileImage: {
      type: String,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/*
 * Automatically hash the password whenever it is newly created
 * or modified.
 */
userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

/*
 * Compare a plain-text password against the stored password hash.
 */
userSchema.methods.comparePassword = async function comparePassword(
  candidatePassword
) {
  return bcrypt.compare(candidatePassword, this.password);
};

/*
 * Remove sensitive information when the document is converted to JSON.
 */
userSchema.methods.toJSON = function toJSON() {
  const userObject = this.toObject();

  delete userObject.password;

  return userObject;
};

const User = mongoose.model("User", userSchema);

export default User;