import { THRESH_TOP } from '../config/constants';

export function softmax(arr) {
  const m = Math.max(...arr);
  const exps = arr.map(v => Math.exp(v - m));
  const s = exps.reduce((a,b)=>a+b,0);
  return exps.map(v => v/s);
}

export function decide(logits, classes) {
  const maxIndex = logits.indexOf(Math.max(...logits));
  const p = logits[maxIndex];
  const label = classes[maxIndex];
  const top = p >= THRESH_TOP ? label.split(':')[0] : 'unsure';
  return { top, label, p };
}
