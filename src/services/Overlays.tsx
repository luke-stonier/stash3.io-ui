import ConfirmationDialog, {ConfirmationDialogProps} from "../components/ConfirmationDialog";
import React, {useEffect} from "react";
import EventEmitter from "./event-emitter";
import Icon from "../components/Icon";

type ConfirmationModal = {
    id: string;
    element: React.ReactNode;
}

type Toast = {
    id?: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    time?: Date;
    duration: number;
}

export function ToastWrapper() {

    const [components, setComponents] = React.useState<Toast[]>(ToastService.components);

    useEffect(() => {
        const sce = ToastService.stackChangeEvent.subscribe(() => {
            setComponents([...ToastService.components]);
        })

        return () => {
            ConfirmationService.stackChangeEvent.unsubscribe(sce);
        }
    }, []);
    
    const toastIcon = (toast: Toast) => {
        if (toast.type === 'info') return 'info';
        if (toast.type === 'success') return 'check_circle';
        if (toast.type === 'warning') return 'warning';
        if (toast.type === 'error') return 'error';
        return 'info';
    }
    
    const toastColor = (toast: Toast) => {
        if (toast.type === 'info') return 'text-white';
        if (toast.type === 'success') return 'text-success';
        if (toast.type === 'warning') return 'text-warning';
        if (toast.type === 'error') return 'text-danger';
        return 'text-white';
    }

    return <div className="position-fixed top-0 start-0 end-0 bottom-0 w-100 h-100"
                style={{pointerEvents: 'none', zIndex: 1050}}>
        <div className="toast-container position-absolute bottom-0 end-0 p-3">
            {components.map((c: Toast, index: number) => {
                    return <div key={c.id} className="toast bg-lighter border showing" role="alert" aria-live="assertive"
                                aria-atomic="true">
                        <div className="toast-header bg-dark text-white">
                            <Icon name={toastIcon(c)} className={`${toastColor(c)} me-2`}/>
                            <strong className="me-auto">{c.title}</strong>
                            { c.time && <small className="text-muted me-2 my-0">{c.time.toLocaleTimeString()}</small> }
                            <button type="button" className="bg-transparent p-0 border-0 my-0" onClick={() => {
                                c.id && ToastService.Remove(c.id);
                            }}>
                                <Icon name={'close'} className={'text-white lh-sm small'}/>
                            </button>
                        </div>
                        <div className="toast-body">
                            {c.message}
                        </div>
                    </div>
                }
            )}
        </div>
    </div>
}

export function ConfirmationDialogWrapper() {

    const [components, setComponents] = React.useState<ConfirmationModal[]>(ConfirmationService.components);

    useEffect(() => {
        const sce = ConfirmationService.stackChangeEvent.subscribe(() => {
            setComponents([...ConfirmationService.components]);
        })

        return () => {
            ConfirmationService.stackChangeEvent.unsubscribe(sce);
        }
    }, []);

    if (components.length === 0) return null;

    return <div className="position-fixed top-0 start-0 end-0 bottom-0 w-100 h-100"
                style={{pointerEvents: 'none', zIndex: 1050}}>
        {components.slice(-ConfirmationService.limit).map((c: ConfirmationModal, index: number) => {
            return <div key={c.id} style={{pointerEvents: 'auto'}}>
                {c.element}
            </div>
        })}
    </div>
}

export class ToastService {
    static components: Toast[] = [];
    static stackChangeEvent = new EventEmitter<void>();

    static Add = (props: Toast) => {
        props.id = `toast-dialog-${Date.now()}`;
        props.time = new Date();
        
        if (ToastService.components.findIndex((c: Toast, index: number) => c.id === props.id) > -1) {
            return;
        }
        
        ToastService.components.push({...props});
        ToastService.stackChangeEvent.emit();
        
        // auto remove after duration
        setTimeout(() => {
            ToastService.Remove(props.id!);
        }, props.duration);
    }

    static Remove = (id: string) => {
        ToastService.components = ToastService.components.filter(c => c.id !== id);
        ToastService.stackChangeEvent.emit();
    }
}

export class ConfirmationService {

    static limit = 1;
    static components: ConfirmationModal[] = [];
    static stackChangeEvent = new EventEmitter<void>();

    // create push/pop functions for components
    static Add = (props: ConfirmationDialogProps) => {
        const id = `confirmation-dialog-${Date.now()}`;

        const handleClose = (status: boolean) => {
            props.onClose(status);
            ConfirmationService.Remove(id);
        };

        const element = <ConfirmationDialog title={props.title}
                                            onClose={handleClose}
                                            children={props.children}
                                            confirmColor={props.confirmColor}
                                            cancelColor={props.cancelColor}/>;

        ConfirmationService.components.push({id, element});
        ConfirmationService.stackChangeEvent.emit();
    }

    static Remove = (id: string) => {
        ConfirmationService.components = ConfirmationService.components.filter(c => c.id !== id);
        ConfirmationService.stackChangeEvent.emit();
    }
}