import { THRESH_TOP } from '../config/constants';

export function softmax(arr) {
  const m = Math.max(...arr);
  const exps = arr.map(v => Math.exp(v - m));
  const s = exps.reduce((a,b)=>a+b,0);
  return exps.map(v => v/s);
}

export function decide(logits, classes) {
  // Convert logits to probabilities using softmax
  const probabilities = softmax(logits);
  const maxIndex = probabilities.indexOf(Math.max(...probabilities));
  const p = probabilities[maxIndex];
  const label = classes[maxIndex];
  
  // Map material to bin based on the material_to_bin mapping
  // materials: ["glass", "paper", "cardboard", "plastic", "metal", "trash"]
  // bins: ["compost", "recycle", "landfill"]
  // material_to_bin: [1, 1, 1, 1, 1, 2] (0-indexed, so 1=recycle, 2=landfill)
  const materialToBin = {
    'glass': 'recycle',
    'paper': 'recycle', 
    'cardboard': 'recycle',
    'plastic': 'recycle',
    'metal': 'recycle',
    'trash': 'landfill'
  };
  
  const material = label.split(':')[0];
  const bin = materialToBin[material] || 'unsure';
  
  const top = p >= THRESH_TOP ? bin : 'unsure';
  return { top, label, p };
}
