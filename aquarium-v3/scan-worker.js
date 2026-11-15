import { detectSheet, paperFingerprint, removalVisible } from './detect.js?v=3.1.0';

self.onmessage = ({data:{frame, previous}}) => {
  try {
    const result = detectSheet(frame);
    if (result.kind==='found') result.signature = paperFingerprint(frame,result);
    if (previous && result.kind==='empty') result.removed = removalVisible(frame,previous);
    self.postMessage({result});
  } catch (error) {
    self.postMessage({error:error.message});
  }
};
