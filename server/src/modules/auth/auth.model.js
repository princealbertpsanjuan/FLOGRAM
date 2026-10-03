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

    /*
     * Customer address book used at checkout.
     * Maximum 5 addresses; one may be the default.
     */
    savedAddresses: {
      type: [
        new mongoose.Schema(
          {
            label: { type: String, trim: true, maxlength: 40, default: "Home" },
            recipientName: { type: String, trim: true, maxlength: 120, default: "" },
            recipientPhoneNumber: { type: String, trim: true, maxlength: 30, default: "" },
            street: { type: String, trim: true, maxlength: 200, required: true },
            barangay: { type: String, trim: true, maxlength: 120, required: true },
            city: { type: String, trim: true, maxlength: 120, required: true },
            province: { type: String, trim: true, maxlength: 120, required: true },
            postalCode: { type: String, trim: true, maxlength: 12, default: "" },
            landmark: { type: String, trim: true, maxlength: 200, default: "" },
            isDefault: { type: Boolean, default: false },
          },
          { _id: true }
        ),
      ],
      default: [],
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    passwordResetCode: {
      type: String,
      default: null,
      select: false,
    },

    passwordResetCodeExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    passwordResetVerified: {
      type: Boolean,
      default: false,
      select: false,
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
  delete userObject.passwordResetCode;
  delete userObject.passwordResetCodeExpiresAt;
  delete userObject.passwordResetVerified;

  return userObject;
};

const User = mongoose.model("User", userSchema);

export default User;