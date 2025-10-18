import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Inbox from './pages/Inbox';         // Add in exercises 4
import Sent from './pages/Sent';           // Add in exercises 4
import Labels from './pages/Labels';       // Add in exercises 4
import MailView from './pages/MailView';   // Add in exercises 4
import Layout from './components/Layout';  // Add in exercises 4- wraps the Gmail-style layout

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                
                {/* Protected Gmail-style layout */}
                <Route path="/" element={<Layout />}>
                    <Route path="inbox" element={<Inbox />} />
                    <Route path="sent" element={<Sent />} />
                    <Route path="labels" element={<Labels />} />
                    <Route path="mail/:id" element={<MailView />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
};

export default App;
