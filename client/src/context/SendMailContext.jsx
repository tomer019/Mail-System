import { createContext, useContext, useState } from "react";
import SendMailComponent from "../components/SendMailComponent";

const SendMailContext = createContext();

export function useSendMail() {
  return useContext(SendMailContext);
}

export function SendMailProvider({ children }) {
  const [show, setShow] = useState(false);

  return (
    <SendMailContext.Provider value={{ show, setShow }}>
      {children}
      {show && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 999,
            }}
            onClick={() => setShow(false)}
          />
          <SendMailComponent onClose={() => setShow(false)} />
        </>
      )}
    </SendMailContext.Provider>
  );
}
