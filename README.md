# cool-ascii-game-with-collisions
Cool ASCII game with pixel (character) based collisions.

I wrote this when the internet was out and I was bored.

## About Collisions

Collisions are based on world chars and entity chars.
Spaces are always treated as empty.

World chars that can be collided with are defined in the `defaultColliders` const and can be overridden per-entity.

Entities collide based on their non-space image chars, allowing free-form collisions without needing bounding boxes.
Think like collisions in Tetris.
