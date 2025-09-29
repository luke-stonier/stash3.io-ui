import Icon from "./Icon";
import useGlobalShortcut from "../hooks/useGlobalShortcut";
import {useEffect, useRef, useState} from "react";

export default function SearchWidget(props: { showCloseButton?: boolean, onClose?: () => void }) {

    const inputElementRef = useRef(null);
    
    const inputClickHandler = (e: React.MouseEvent) => {
        e.stopPropagation();
    }
    
    useEffect(() => {
        console.log('SearchWidget mounted');
        setTimeout(() => {
            if (inputElementRef.current) {
                (inputElementRef.current as unknown as HTMLInputElement).focus();
            }
        }, 50);
    }, [])
    
    return <div onClick={inputClickHandler} className="w-100 position-relative">
        <div
            className="bg-lighter border-0 rounded-pill w-100 d-flex align-items-center justify-content-start gap-2 px-3 py-2 overflow-hidden">
            <Icon name="search"/>
            <input ref={inputElementRef} className="bg-transparent text-white border-0 flex-fill" placeholder='Search buckets or files...'/>
            { props.showCloseButton && <div className="d-flex" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => props.onClose && props.onClose()}><Icon name="close" /></div> }
        </div>
        <div className="position-absolute"></div>
    </div>;
}

export function SearchWidgetModal() {

    const [modalActive, setModalActive] = useState(false);
    
    useGlobalShortcut([
        { key: 't', ctrl: true },
        { key: 't', meta: true },
        { key: 'f', ctrl: true },
        { key: 'f', meta: true }
    ], () => {
        setModalActive(!modalActive);
    });
    
    useGlobalShortcut([ { key: 'escape' } ], () => setModalActive(false));
    
    if (!modalActive) return <></>
    
    return <div className="position-fixed d-flex align-items-stretch justify-content-center top-0 end-0 start-0 bottom-0 p-5" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1050 }} onClick={() => setModalActive(false)}>
        <div className="w-100 h-100 d-flex align-items-center justify-content-center" style={{ maxWidth: 600 }}>
            <SearchWidget showCloseButton onClose={() => setModalActive(false)} />
        </div>
    </div>;
}