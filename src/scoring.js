import {TARGET,DURATION} from './game-state.js';

export function harvestStats(game) {
  const seeds=Math.max(0,Math.min(TARGET,Math.floor(game.collected)));
  const time=Math.max(0,Math.min(DURATION,Math.ceil(game.elapsed)));
  const bonus=seeds===TARGET?Math.max(0,DURATION-time)*10:0;
  return {score:seeds*100+bonus,seeds,time};
}
