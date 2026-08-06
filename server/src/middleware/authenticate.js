import jwt from "jsonwebtoken";
import User from "../modules/auth/auth.model.js";



const authenticate = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;

    if (
      !authorizationHeader ||
      !authorizationHeader.startsWith("Bearer ")
    ) {
      const error = new Error("Authentication token is required.");
      error.statusCode = 401;
      throw error;
    }

    const accessToken = authorizationHeader.split(" ")[1];

    const decodedToken = jwt.verify(
      accessToken,
      process.env.JWT_SECRET
    );

    const user = await User.findById(decodedToken.userId);

    if (!user) {
      const error = new Error(
        "The account associated with this token no longer exists."
      );
      error.statusCode = 401;
      throw error;
    }

    if (user.accountStatus !== "active") {
      const error = new Error(
        `This account is currently ${user.accountStatus}.`
      );
      error.statusCode = 403;
      throw error;
    }

    req.user = {
      userId: user._id.toString(),
      role: user.role,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      error.message = "The authentication token is invalid.";
      error.statusCode = 401;
    }

    if (error.name === "TokenExpiredError") {
      error.message = "The authentication token has expired.";
      error.statusCode = 401;
    }

    next(error);
  }
};


export default authenticate;