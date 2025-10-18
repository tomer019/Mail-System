import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Register from './pages/Register';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/register" element={<Register />} />
                {/* תוסיף בהמשך עוד נתיבים כאן */}
            </Routes>
        </BrowserRouter>
    );
};

export default App;
