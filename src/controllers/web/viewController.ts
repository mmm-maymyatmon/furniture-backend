import { Request, Response, NextFunction } from "express";

export const home = (req: Request, res: Response, next: NextFunction) => {
    res.render("index", { title: "Home Page" });

}
export const about = (req: Request, res: Response, next: NextFunction) => {
    const users = [{ name: "John Doe", age: 30 }, { name: "Jane Doe", age: 25 }];
    res.render("about", { title: "About Us", users });
}