import { LogSnag } from "logsnag";
import {User} from "../entities/User";

export default class LoggingService {
    private logsnag: LogSnag = new LogSnag({
        token: process.env.LOGSNAG || "",
        project: "stash3",
    });

    constructor() { }

    public async UserRegister(user: User): Promise<void> {
        await this.SendLog("events", "User Joined", `Email: ${user.email}`, "🎉", {
            email: user.email,
        });
    }
    
    public async UserForgotPassword(user: User): Promise<void> {
        await this.SendLog("events", "User Forgot Password", `Email: ${user.email}`, "🔑", {
            email: user.email,
        });
    }
    
    public async UserResetPassword(user: User): Promise<void> {
        await this.SendLog("events", "User Reset Password", `Email: ${user.email}`, "✅", {
            email: user.email,
        });
    }
    
    public async UserChangedPassword(user: User): Promise<void> {
        await this.SendLog("events", "User Changed Password", `Email: ${user.email}`, "🔒", {
            email: user.email,
        });
    }
    
    public async UserAddedAccount(user: User, handle: string): Promise<void> {
        await this.SendLog("events", "User Added Account", `Email: ${user.email}, Handle: ${handle}`, "➕", {
            email: user.email,
            handle: handle,
        });
    }

    private async SendLog(channel: string, event: string, description: string, icon: string, tags: any, notify: boolean = true): Promise<void> {
        if (process.env.ENV_NAME === "LOCAL") {
            console.log("LOCAL LOGSNAG", event, description, icon);
            return;
        }
        try {
            console.log("LOGSNAG", event, description, icon);
            await this.logsnag.track({
                channel: channel,
                event: event,
                description: description,
                icon: icon,
                tags: tags,
                notify: notify,
            });
        } catch (exception: any) {
            console.log("Failed to send logsnag", exception);
        }
    }
}
