import './App.css';
import { CountryQuiz } from './CountryQuiz/CountryQuiz';

function App() {

  return (
    <div className="App">
      <header className="App-header">
        <p>
          Hello, World!
        </p>
      </header>
      <article className="App-article">
        <CountryQuiz />
      </article>
    </div>
  );
}

export default App;
