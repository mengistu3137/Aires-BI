import bcrypt from "bcryptjs";
import { signToken } from "../../utils/jwt.js";

export const hashPassword = async (plainPassword) => {
  return bcrypt.hash(plainPassword, 10);
};

export const comparePassword = async (plainPassword, hash) => {
  return bcrypt.compare(plainPassword, hash);
};

export const sanitizeUser = (user) => {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

export const generateAuthPayload = (user) => {
  const token = signToken({
    id: user.id,
    role: user.role,
  });

  return {
    user: sanitizeUser(user),
    token,
  };
};