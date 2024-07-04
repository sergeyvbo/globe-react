import './App.css';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { CountryQuiz } from './CountryQuiz/CountryQuiz';
import { FlagQuiz } from './FlagQuiz/FlagQuiz';
import { StateQuiz } from './StateQuiz/StateQuiz';

function App() {

    return (
        <HashRouter>
            <div className="App">
                <article className="App-article">
                    <Routes>
                        <Route path="/*" element={<CountryQuiz />} />
                        <Route path="/countries" element={<CountryQuiz />} />
                        <Route path="/flags" element={<FlagQuiz />} />
                        <Route path="/states" element={<StateQuiz />} />
                    </Routes>
                </article>
            </div>
        </HashRouter>
    )
}

export default App;
