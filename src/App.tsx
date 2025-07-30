import './App.css';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { CountryQuiz } from './CountryQuiz/CountryQuiz';
import { FlagQuiz } from './FlagQuiz/FlagQuiz';
import { StateQuiz } from './StateQuiz/StateQuiz';
import { UserProfile } from './Common/UserProfile';
import { ProtectedRoute } from './Common/Auth/ProtectedRoute';
import { AuthProvider } from './Common/Auth/AuthContext';
import { SessionDemo } from './Common/SessionDemo';
import { StatsPage, LeaderboardPage } from './Statistics';
import { 
  ModalProvider, 
  UserProfileModal, 
  StatisticsModal, 
  LeaderboardModal 
} from './Common/Modals';

function App() {

    return (
        <AuthProvider>
            <ModalProvider>
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
                                <Route path="/stats" element={
                                    <ProtectedRoute>
                                        <StatsPage />
                                    </ProtectedRoute>
                                } />
                                <Route path="/leaderboard" element={<LeaderboardPage />} />
                                <Route path="/session-demo" element={<SessionDemo />} />
                            </Routes>
                        </article>
                        
                        {/* Modal Components - Rendered at app level for proper z-index */}
                        <UserProfileModal />
                        <StatisticsModal />
                        <LeaderboardModal />
                    </div>
                </HashRouter>
            </ModalProvider>
        </AuthProvider>
    )
}

export default App;
