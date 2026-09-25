import { useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import Icon from "./Icon";
type ConfirmDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  icon?: "arrowLeft" | "login";
};
export default function ConfirmDialog({open,onCancel,onConfirm,title,message,cancelLabel,confirmLabel,icon="arrowLeft"}:ConfirmDialogProps){const{t}=useLanguage();useEffect(()=>{if(!open)return;const handler=(event:KeyboardEvent)=>event.key==="Escape"&&onCancel();document.addEventListener("keydown",handler);return()=>document.removeEventListener("keydown",handler)},[onCancel,open]);if(!open)return null;return <div className="modal-backdrop quit-backdrop" onMouseDown={event=>event.target===event.currentTarget&&onCancel()}><section className="quit-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title"><div className="quit-icon"><Icon name={icon} /></div><h2 id="confirm-dialog-title">{title??t("quitTitle")}</h2><p>{message??t("quitText")}</p><div className="quit-actions"><button type="button" onClick={onCancel}>{cancelLabel??t("stayGame")}</button><button type="button" className="quit-confirm" onClick={onConfirm}>{confirmLabel??t("quitGame")}</button></div></section></div>}
