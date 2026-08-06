import {
  getUserById,
  loginUser,
  registerUser,
} from "./auth.service.js";

export const register = async (req, res, next) => {
  try {
    const result = await registerUser(req.body);

    res.status(201).json({
      success: true,
      message:
        result.user.verificationStatus === "pending"
          ? "Account created successfully and is awaiting verification."
          : "Account created successfully.",
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await loginUser({
      email: req.body.email,
      password: req.body.password,
    });

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await getUserById(req.user.userId);

    res.status(200).json({
      success: true,
      message: "Authenticated user retrieved successfully.",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  /*
   * The first implementation uses stateless access tokens.
   * The mobile client logs out by deleting its stored token.
   */
  res.status(200).json({
    success: true,
    message: "Logout successful. Remove the access token from the client.",
  });
};