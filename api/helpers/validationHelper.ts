import StatusResponse from "../data/StatusResponse";

export class ValidationHelper {
    public static ValidateEmail<T>(email: string, errorResp: StatusResponse<T>): StatusResponse<T> {
        const atPos = email.indexOf("@");
        const dotPos = email.indexOf(".", atPos);
        const atCount = email.split("").filter((c) => c == "@");
        if (atCount.length > 1) errorResp.AddMessage("Email not valid").AddFix("email", "Email must be valid");
        if (email.length < 2) errorResp.AddMessage("Email not valid").AddFix("email", "Email must be valid");
        if (atPos == -1) errorResp.AddMessage("Email not valid").AddFix("email", "Email must be valid");
        if (dotPos == -1) errorResp.AddMessage("Email not valid").AddFix("email", "Email must be valid");
        return errorResp;
    }
}
