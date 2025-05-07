import React, { createContext, useContext } from "react";
import { useToast } from "../components/Toast";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const toast = useToast();
  
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <toast.ToastContainer position="top-right" />
    </ToastContext.Provider>
  );
};

export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToastContext doit être utilisé à l'intérieur d'un ToastProvider");
  }
  return context;
};