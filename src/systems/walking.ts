/* 
 * systems/controllable.ts
 * 
 * This is the system that animates walking characters using their spritesheet
 * (stored in the image component), and actually moving walking entities by
 * their speed, unless there's an entity with a hitbox in the way. This means
 * that this sytem is also responsible for collision checking.
 */

import * as components from "../components";
import { System, SystemTrigger } from "../engine/ecs";
import { cloneAudio, tryMove } from "../helpers";

export default class WalkingSystem extends System {
    constructor() {
        super([
            components.WalkingComponent,
            components.SpeedComponent,
            components.ImageComponent
        ], SystemTrigger.Tick, (game, entity) => {
            const speed = game.ecs.getComponent(entity, components.SpeedComponent);
            const image = game.ecs.getComponent(entity, components.ImageComponent);
            const position = game.ecs.getComponent(entity, components.PositionComponent);

            // set the row of spritesheet for direction
            if (speed.speedX === 0 && speed.speedY === 0) { // if not moving
                image.frame.y = 0; // top row of spritesheet
            } else {
                const angle = Math.atan2(speed.speedY, speed.speedX);

                image.frame.y = 0;

                if (angle > -5 * Math.PI / 8 && angle < -3 * Math.PI / 8) {
                    image.frame.y = 16;
                } else if (angle >= -3 * Math.PI / 8 && angle <= 3 * Math.PI / 8) {
                    image.frame.y = 3 * 16;
                } else if (angle <= -5 * Math.PI / 8 || angle >= 5 * Math.PI / 8) {
                    image.frame.y = 2 * 16;
                }
            }

            // move the entity (but don't move if there's a hitbox in the way)
            tryMove(game, entity);

            // if moving
            if (speed.speedX !== 0 || speed.speedY !== 0) {
                // change frame every x milliseconds depending on speed (350 is arbitrary)
                const timeBetweenFrames = 1 / speed.currentVelocity * 400;
                if (performance.now() - image.timeOflastFrameChange >= timeBetweenFrames) {
                    image.frame.x += 16; // move right one frame
                    image.frame.x %= 64; // wrap around to the first frame if at the end
                    image.timeOflastFrameChange = performance.now();

                    if (image.frame.x === 16 || image.frame.x === 48) {
                        const clone = cloneAudio(game.getAudio("footstep"));
                        clone.volume *= .7; // quieten footsteps a bit
                        // reduce volume based on speed (so the faster you go, the louder the footsteps)
                        clone.volume *= speed.currentVelocity / speed.velocity;
                        clone.play();
                    }
                }
            } else { // if not moving
                // reset frame to default
                image.frame.x = 0;
            }

            const walkingComponent = game.ecs.getComponent(entity, components.WalkingComponent);

            // if the entity has health and can get tired by walking
            if (game.ecs.hasComponent(entity, components.HealthComponent) && walkingComponent.canGetTired) {
                const health = game.ecs.getComponent(entity, components.HealthComponent);

                if (speed.currentVelocity !== 0) {
                    // remove health based on speed (1/120th of the velocity per tick)
                    health.damage(speed.currentVelocity / 120);
                } else {
                    // heal if resting (1/3000th of the max health per tick)
                    health.heal(health.maxHealth / 3000);
                }
            }

            // if the entity is the player
            if (entity === game.player) {
                // move to neighboring room if walking through door
                if (position.pixels.x < -(game.tileSize / 2) && position.room.x > 0) {
                    position.room.x--;
                    position.pixels.x = game.tileSize * game.roomSize.x - (game.tileSize / 2);
                } else if (position.pixels.x > game.tileSize * game.roomSize.x - (game.tileSize / 2) && position.room.x < game.roomSize.x - 1) {
                    position.room.x++;
                    position.pixels.x = -(game.tileSize / 2);
                } else if (position.pixels.y < -(game.tileSize / 2) && position.room.y > 0) {
                    position.room.y--;
                    position.pixels.y = game.tileSize * game.roomSize.y - (game.tileSize / 2);
                } else if (position.pixels.y > game.tileSize * game.roomSize.y - (game.tileSize / 2) && position.room.y < game.roomSize.y - 1) {
                    position.room.y++;
                    position.pixels.y = -(game.tileSize / 2);
                }
            }
        });
    }
}