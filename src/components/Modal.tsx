import React from "react";
import ReactDOM from "react-dom";

export default function Modal({ children }: { children: React.ReactNode }) {
  const modalRoot = document.getElementById("modal-root");
  if (!modalRoot) return null;

  return ReactDOM.createPortal(children, modalRoot);
}
