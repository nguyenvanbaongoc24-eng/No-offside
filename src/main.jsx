import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { MotionConfig } from 'framer-motion'
import './styles/index.css'
import './styles/refinement.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user" transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}>
      <App />
    </MotionConfig>
  </React.StrictMode>,
)
