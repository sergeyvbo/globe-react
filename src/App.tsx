import './App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { CountryQuiz } from './CountryQuiz/CountryQuiz';
import { FlagQuiz } from './FlagQuiz/FlagQuiz';

function App() {

    return (
        <Router >
            <div className="App">
                <article className="App-article">
                    <Routes>
                        <Route path="/" element={<CountryQuiz />} />
                        <Route path="/countries" element={<CountryQuiz />} />
                        <Route path="/flags" element={<FlagQuiz />} />
                    </Routes>
                </article>
            </div>
        </Router>
    )
}

export default App;
