import { distance } from './geometry.js';

export class PaperGate {
  locked = false;
  previous = null;
  stable = 0;
  absent = 0;
  anchor = null;

  resetStability() {
    this.anchor = null;
    this.stable = 0;
    this.absent = 0;
  }

  latch(map) {
    this.previous = map;
    this.locked = true;
    this.resetStability();
  }

  observe(hit) {
    if (this.locked) {
      this.absent = hit.kind==='empty' && hit.removed ? this.absent+1 : 0;
      if (this.absent < 5) return 'locked';
      this.locked = false;
      this.previous = null;
      this.resetStability();
      return 'removed';
    }
    if (hit.kind!=='found') {
      this.resetStability();
      return hit.kind;
    }
    const anchor = this.anchor;
    const still = anchor && anchor.type===hit.type && anchor.revision===hit.revision
      && hit.corners.every((p,i) => distance(p,anchor.corners[i]) < 4.5)
      && hit.signature.every((v,i) => Math.abs(v-anchor.signature[i]) < 28);
    if (!still) {
      this.anchor = hit;
      this.stable = 0;
    }
    this.stable++;
    return this.stable >= 3 ? 'ready' : 'stabilizing';
  }
}
