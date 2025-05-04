export const checkUserExist = (user: any) => {
    if(user) {
        const error:any = new Error("This phone number is already registered.");
        error.status = 409;
        error.code = "Error_AlreadyExist";
        throw error;
    }
};

export const checkOtpErrorIfSameDate = (isSameDate: boolean, errorCount: number) => {
    if(isSameDate && errorCount === 5) {
        const error:any = new Error("Otp is wrong 5 times.Please try again tomorrow.");
        error.status = 401;
        error.code = "Error_OverLimit";
        throw error;
    }
}

// export const checkUserNotExist = (user: any) => {
//     if(!user) {
//         const error:any = new Error("User not found.");
//         error.status = 404;
//         error.code = "Error_NotFound";
//         throw error;
//     }
// };