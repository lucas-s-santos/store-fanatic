import { createRoot } from 'react-dom/client'
// Fontes servidas pelo próprio site; importadas aqui (e não no CSS) para o
// Vite resolver os caminhos dos .woff2.
import '@fontsource-variable/inter'
import '@fontsource-variable/outfit'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(<App />)
