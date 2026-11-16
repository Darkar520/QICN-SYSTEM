import { freezeData } from './contracts.js';
/** Synthetic future, generated before branching; never samples live sensors. */
export function createSyntheticInputTape(ticks, seed = 11) {
  if (!Number.isInteger(ticks) || ticks < 1 || ticks > 1000 || !Number.isInteger(seed)) throw new Error('invalid_input_tape_parameters');
  let state = seed >>> 0;
  const random = () => {
    let t = (state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
  return freezeData(Array.from({length:ticks},(_,index)=>({
    entropyValue: random(),
    perception: {
      audio: {rms:0.1+0.05*random(),silenceDurationSec:(index%20)/4},
      video: {frameNovelty:0.2+0.2*random(),faceCount:1,humanPresence:{detected:true,count:1},faces:[{probability:0.8,engagement:{score:0.4+0.3*Math.sin((index+1)/7)}}]},
      awareness: {addressedToSystem:false,intentConfidence:0.2,currentFocus:'synthetic_tape'},
      isReady:true,summary:'preregistered synthetic future; no hardware input'
    }
  })));
}
