import { useEffect, useId, useRef, type ReactNode } from 'react';
export function DetailDrawer({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}) {
 const ref=useRef<HTMLDialogElement>(null);const id=useId();
 useEffect(()=>{const previous=document.activeElement as HTMLElement;ref.current?.showModal();return()=>{ref.current?.close();previous?.focus();};},[]);
 return <dialog ref={ref} className="ui-drawer" aria-labelledby={id} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current){const r=ref.current.getBoundingClientRect();if(e.clientX<r.left)onClose();}}}><div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-white p-6"><h2 id={id} className="text-lg font-bold">{title}</h2><button className="ui-button" onClick={onClose} autoFocus>Close</button></div><div className="space-y-5 p-6">{children}</div></dialog>;
}
