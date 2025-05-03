export const checkUserExist = (user: any) => {
    if(user) {
        const error:any = new Error("This phone number is already registered.");
        error.status = 409;
        error.code = "Error_AlreadyExist";
        throw error;
    }
};