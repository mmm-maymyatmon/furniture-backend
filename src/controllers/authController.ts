import { Request, Response, NextFunction } from "express"

export const register = async (req : Request, res : Response, next : NextFunction) => {
    res.status(200).json({message : "Register"})
}

export const login = async (req : Request, res : Response, next : NextFunction) => {
    res.status(200).json({message : "Login"})
}

export const verifyOtp = async (req : Request, res : Response, next : NextFunction) => {
    res.status(200).json({message : "Verify OTP"})
}

export const confirmPassword = async (req : Request, res : Response, next : NextFunction) => {
    res.status(200).json({message : "Confirm Password"})
}