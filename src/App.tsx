import {BrowserRouter, Routes, Route} from "react-router-dom";
import {AuthProvider} from "./context/AuthContext.tsx";
import {ChatProvider} from "./context/ChatContext.tsx";
import ChatPage from "./pages/ChatPage.tsx";


export default function App() {
  return (
      <BrowserRouter>
        <AuthProvider>
          <ChatProvider>
            <Routes>
              <Route path="/" element={<ChatPage />} />
            </Routes>
          </ChatProvider>
        </AuthProvider>
      </BrowserRouter>
  )
}