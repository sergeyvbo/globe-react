import './App.css';
import { CountryQuiz } from './CountryQuiz/CountryQuiz';
import { MainMenu } from './MainMenu/MainMenu';

function App() {

    return (
        <>
            <div className="App">
                <article className="App-article">
                    <CountryQuiz />
                </article>
            </div>
        </>
    );
}

export default App;
