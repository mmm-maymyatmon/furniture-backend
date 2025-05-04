import { randomBytes } from "crypto";

export const generateOTP = () => {
    return parseInt(randomBytes(3).toString("hex"), 16) % 900000 + 100000;
};

export const generateToken = () => {
    return randomBytes(20).toString("hex");
};