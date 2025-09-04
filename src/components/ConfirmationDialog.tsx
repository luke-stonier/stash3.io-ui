import Icon from "./Icon";
import React from "react";

export type ConfirmationDialogProps = {
    title: string;
    children: React.ReactNode;
    onClose: (status: boolean) => void;
    cancelColor: string;
    confirmColor: string;
}

export default function ConfirmationDialog(props: ConfirmationDialogProps) {
    return <div className="position-absolute d-flex align-items-center justify-content-center"
                style={{top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.75)'}}>
        <div className="shadow-lg bg-dark rounded-3 p-3" style={{minWidth: 500, maxWidth: '90vw'}}
             onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-start">
                <div>
                    <p className="my-0 fs-4">{props.title}</p>
                </div>
            </div>

            <div>
                {props.children}
            </div>
            
            <div className="d-flex algin-items-center justify-content-end gap-2 mt-3">
                <button className={`btn btn-${props.cancelColor}`} onClick={() => props.onClose(false)}>Cancel</button>
                <button className={`btn btn-${props.confirmColor}`} onClick={() => props.onClose(true)}>Confirm</button>
            </div>
        </div>
    </div>
}