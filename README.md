# 🌍 React + D3.js Geography Quiz

An interactive educational web application for learning world geography through engaging quiz games. Built with modern React, TypeScript, and D3.js visualizations.

![thumbnail](public/Thumbnail.png)

## ✨ Features

### 🗺️ Country Quiz
- **Interactive 3D Globe**: Explore countries on a beautiful orthographic projection
- **Smart Difficulty Levels**: 
  - Easy: Worldwide selection
  - Medium: Regional grouping (continents)
  - Hard: Subregional focus
- **Visual Enhancements**: Country highlighting, borders, and location pins for small nations
- **Zoom & Pan**: Interactive globe manipulation with mouse controls

### 🏴 Flag Quiz
- **Flag Matching Game**: Connect flags with their corresponding countries
- **Batch Learning**: 5 flag-country pairs per round
- **Visual Feedback**: Instant success/error indication
- **Progressive Rounds**: Continuous learning with new flag sets

### 🇺🇸 US States Quiz
- **Detailed US Map**: Accurate Albers USA projection
- **State Recognition**: Learn all 50 US states and their locations
- **Auto-centering**: Automatic zoom to highlighted states
- **Geographic Accuracy**: Professional cartographic projections

## 🌐 Internationalization

- **Bilingual Support**: Full English and Russian localization
- **Dynamic Language Switching**: Change language without page reload
- **Localized Geography**: Country names in both languages
- **Cultural Adaptation**: Region-appropriate content

## ⚙️ Customization

- **Flexible Settings**: Personalize your learning experience
- **Visual Options**: Toggle borders, pins, and zoom controls
- **Difficulty Adjustment**: Adapt challenge level to your knowledge
- **Persistent Preferences**: Settings saved locally

## 🏆 Progress Tracking

- **Real-time Scoring**: Track correct and incorrect answers
- **Session Persistence**: Maintain scores across quiz modes
- **Visual Feedback**: Immediate response indication

## 🛠️ Technology Stack

- **Frontend**: React 18 with TypeScript
- **Visualizations**: D3.js for interactive maps and globe
- **UI Framework**: Material-UI (MUI) v6
- **Build System**: Vite for fast development and optimized builds
- **Routing**: React Router for seamless navigation
- **Styling**: CSS with responsive design
- **Data**: GeoJSON for accurate geographic boundaries

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sergeyvbo/globe-react.git
   cd globe-react
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000/globe-react/`

### Building for Production

```bash
npm run build
```

The build artifacts will be stored in the `build/` directory.

### Preview Production Build

```bash
npm run preview
```

## 📁 Project Structure

```
src/
├── Common/           # Shared utilities and types
│   ├── GeoData/     # Geographic data files (GeoJSON)
│   ├── types.ts     # TypeScript type definitions
│   ├── utils.ts     # Utility functions
│   └── defaults.ts  # Default configuration
├── CountryQuiz/     # Country identification quiz
├── FlagQuiz/        # Flag matching game
├── StateQuiz/       # US states quiz
├── Globe/           # 3D globe visualization component
├── Quiz/            # Reusable quiz interface
├── MainMenu/        # Settings and navigation
├── Localization/    # Translation strings
└── App.tsx          # Main application component
```

## 🌍 Geographic Data

- **World Countries**: Comprehensive GeoJSON with metadata
- **US States**: Detailed state boundaries and properties
- **Flag Data**: ISO country codes with flag image mappings
- **Multilingual Names**: Country names in multiple languages

## 🎯 Educational Value

- **Geography Learning**: Improve knowledge of world countries and US states
- **Visual Memory**: Associate flags with countries through interactive gameplay
- **Cultural Awareness**: Learn about different regions and their characteristics
- **Progressive Difficulty**: Gradual skill building from easy to challenging levels

## 🔧 Development

### Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run test suite (when configured)

### Environment Variables

Create a `.env` file for custom configuration:

```env
VITE_PUBLIC_URL=/globe-react/
```

## 📱 Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **D3.js Community** for powerful visualization tools
- **Natural Earth** for geographic data
- **Flag CDN** for flag images
- **React Community** for excellent documentation and tools

## 🔗 Links

- **Live Demo**: [https://sergeyvbo.github.io/globe-react/](https://sergeyvbo.github.io/globe-react/)
- **Repository**: [https://github.com/sergeyvbo/globe-react](https://github.com/sergeyvbo/globe-react)

---

Made with ❤️ for geography enthusiasts and learners worldwide
