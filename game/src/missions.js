// Missions: ring courses with a landing finish, and the score they award.
import { MISSIONS } from './config.js';
import { ringCourse } from './world.js';

export function startMission(index) {
  const def = MISSIONS[Math.min(index, MISSIONS.length - 1)];
  return { def, rings: ringCourse(def.rings), index };
}

export function missionText(state) {
  const { plane: p, rings, mission } = state;
  if (p.ringsPassed < rings.length) {
    return `${mission.def.name}: fly through ring ${p.ringsPassed + 1} of ${rings.length}`;
  }
  return `${mission.def.name}: all rings clear — land on the home runway!`;
}

export function landingScore(plane, mission) {
  return plane.score + Math.round(plane.fuel) * 2 + Math.max(0, 100 - plane.damage) + mission.def.par;
}
