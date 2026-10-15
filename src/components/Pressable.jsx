import React, {forwardRef} from 'react';
import {motion, useReducedMotion} from 'framer-motion';

// One motion policy for native buttons, including disabled and submit behavior.
const Pressable = forwardRef(function Pressable({whileTap,transition, ...props},ref) {
  const reduced = useReducedMotion();
  if(typeof document==='undefined' || typeof document.createElement!=='function')return <button ref={ref} {...props}/>;
  return <motion.button ref={ref} {...props} whileTap={props.disabled || reduced ? undefined : whileTap || {scale:0.98}} transition={transition || {duration:0.12}} />;
});
export default Pressable;
