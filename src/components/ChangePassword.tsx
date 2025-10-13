import React, { useState } from "react";
import HttpService from "../services/http/http-service";

export default function ChangePassword() {
    const [changingPassword, setChangingPassword] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [apiError, setApiError] = useState("");
    const [success, setSuccess] = useState("");

    const resetForm = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setError("");
        setApiError("");
        setSuccess("");
    };

    const handleCancel = () => {
        resetForm();
        setChangingPassword(false);
    };

    const handleChangePassword = async () => {
        setError("");
        setApiError("");
        setSuccess("");

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setError("Please fill in all fields.");
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setError("New password and confirmation do not match.");
            return;
        }
        if (newPassword === currentPassword) {
            setError("New password must be different from current password.");
            return;
        }

        const request = {
            currentPassword: currentPassword,
            newPassword: newPassword,
            newPasswordRepeat: confirmNewPassword
        };

        setIsSubmitting(true);
        try {
            HttpService.post(`/auth/change-password`, request, (resp: any) => {
                setSuccess("Password changed successfully.");
                resetForm();
                setChangingPassword(false);
                setIsSubmitting(false);
            }, (err: any) => {
                const message = err?.error || err?.message || `Request failed (${err.status})`;
                setApiError(message);
                setIsSubmitting(false);
                return;
            });
        } catch (err) {
            setApiError("Network error. Please check your connection and try again.");
        }
    };

    return (
        <div className="mt-4">
            {changingPassword ? (
                <div className="d-flex flex-column align-items-center justify-content-center w-100">
                    {(error || apiError || success) && (
                        <div className="w-100 mb-3">
                            {error && <div className="alert alert-warning">{error}</div>}
                            {apiError && <div className="alert alert-danger">{apiError}</div>}
                            {success && <div className="alert alert-success">{success}</div>}
                        </div>
                    )}

                    <div className="mb-3 w-100">
                        <label htmlFor="currentPassword" className="form-label">Current Password</label>
                        <input
                            type="password"
                            className="form-control"
                            id="currentPassword"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            onKeyDown={((e) => {
                                if (e.key === 'Enter') handleChangePassword()
                            })}
                        />
                    </div>
                    <div className="mb-3 w-100">
                        <label htmlFor="newPassword" className="form-label">New Password</label>
                        <input
                            type="password"
                            className="form-control"
                            id="newPassword"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            onKeyDown={((e) => {
                                if (e.key === 'Enter') handleChangePassword()
                            })}
                        />
                    </div>
                    <div className="mb-3 w-100">
                        <label htmlFor="confirmNewPassword" className="form-label">Confirm New Password</label>
                        <input
                            type="password"
                            className="form-control"
                            id="confirmNewPassword"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            onKeyDown={((e) => {
                                if (e.key === 'Enter') handleChangePassword()
                            })}
                        />
                    </div>

                    <div className="d-flex align-items-center justify-content-start w-100">
                        <button
                            className="btn btn-primary me-2"
                            onClick={handleChangePassword}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Submitting…" : "Submit"}
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={handleCancel}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <button className="btn btn-primary" onClick={() => setChangingPassword(true)}>
                    Change Password
                </button>
            )}
        </div>
    );
}
