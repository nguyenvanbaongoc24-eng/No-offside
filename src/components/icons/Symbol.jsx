import React, {forwardRef} from 'react';
export function createSymbol(name, variants) {
  const Symbol = forwardRef(function MaterialSymbol({size=20,filled=false,strokeWidth,stroke,fill,absoluteStrokeWidth,color='currentColor',className='',style,title,children,...props},ref){
    const accessible=props['aria-label'] || props['aria-labelledby'];
    const dimension=typeof size==='number'?Math.max(18,size):size;
    const variant=variants[filled?1:0];
    return <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={variant.viewBox} width={dimension} height={dimension} fill="currentColor" color={color} focusable="false" aria-hidden={accessible?undefined:true} role={accessible?'img':undefined} {...props} data-symbol={name} data-filled={filled?'true':'false'} className={'material-symbol '+className} style={{...style,flexShrink:0,minWidth:18,minHeight:18}}>
      {title&&<title>{title}</title>}{variant.paths.map((d,i)=><path key={i} d={d}/>)}{children}
    </svg>;
  });
  Symbol.displayName='MaterialSymbol('+name+')';
  return Symbol;
}
