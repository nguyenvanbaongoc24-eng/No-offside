import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { MotionConfig } from 'framer-motion'
import './styles/index.css'
import './styles/refinement.css'
import './styles/soft-ui.css'
import './styles/pro.css'
import './styles/matchCard.css'
import './styles/fundCollections.css'
import './styles/matchLateReview.css'
import './styles/matchLifecycle.css'
import './styles/auth.css'

window.clearTimeout(window.noOffsideBootTimer)
delete window.noOffsideBootTimer

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user" transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}>
      <App />
    </MotionConfig>
  </React.StrictMode>,
)
