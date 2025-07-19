import './App.css';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { CountryQuiz } from './CountryQuiz/CountryQuiz';
import { FlagQuiz } from './FlagQuiz/FlagQuiz';
import { StateQuiz } from './StateQuiz/StateQuiz';
import { UserProfile } from './Common/UserProfile';
import { ProtectedRoute } from './Common/ProtectedRoute';
import { AuthProvider } from './Common/AuthContext';

function App() {

    return (
        <AuthProvider>
            <HashRouter>
                <div className="App">
                    <article className="App-article">
                        <Routes>
                            <Route path="/*" element={<CountryQuiz />} />
                            <Route path="/countries" element={<CountryQuiz />} />
                            <Route path="/flags" element={<FlagQuiz />} />
                            <Route path="/states" element={<StateQuiz />} />
                            <Route path="/profile" element={
                                <ProtectedRoute>
                                    <UserProfile />
                                </ProtectedRoute>
                            } />
                        </Routes>
                    </article>
                </div>
            </HashRouter>
        </AuthProvider>
    )
}

export default App;
