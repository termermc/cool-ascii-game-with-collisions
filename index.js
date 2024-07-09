process.stdin.setRawMode(true)
process.stdin.resume()
process.stdin.setEncoding('utf8')

const defaultColliders = [
	'=', // Wall
]

/**
 * Returns a random integer between min and max (inclusive)
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randomInt(min, max) {
	return Math.round(Math.random() * (max - min) + min)
}

/** @typedef {string[][]} GridData */

class Grid {
	/**
	 * Creates a new grid by copying an existing grid
	 * @param {Grid} existingGrid The grifalsed to copy
	 * @returns {Grid} A copy of the grid
	 */
	static from(existingGrid) {
		const yArr = new Array(existingGrid.data.length)

		for (let y = 0; y < yArr.length; y++) {
			yArr[y] = Array.from(existingGrid.data[y])
		}

		return new Grid(yArr)
	}

	/**
	 * @type {GridData}
	 */
	data

	/**
	 *
	 * @param {GridData} data
	 */
	constructor(data) {
		this.data = data
	}

	/**
	 * Stamps grid data onto this grid's data at the specified offsets
	 * @param {GridData} gridData
	 * @param {number} offsetX
	 * @param {number} offsetY
	 */
	stamp(gridData, offsetX, offsetY) {
		for (let y = offsetY; y < gridData.length + offsetY; y++) {
			for (let x = offsetX; x < gridData[y - offsetY].length + offsetX; x++) {
				if (y < 0 || y >= this.data.length || x >= this.data[y].length) {
					break
				}

				const newChar = gridData[y - offsetY][x - offsetX]

				if (newChar !== ' ') {
					this.data[y][x] = newChar
				}
			}
		}
	}
}

class Entity {
	/**
	 * @type {World}
	 */
	world

	/**
	 * @type {GridData}
	 */
	img

	/**
	 * @type {number}
	 */
	x

	/**
	 * @type {number}
	 */
	y

	/**
	 * @type {string[]}
	 */
	collidesWith

	/**
	 *
	 * @param {World} world
	 * @param {GridData} img
	 * @param {number} x
	 * @param {number} y
	 * @param {string[]} collidesWith
	 */
	constructor(world, img, x, y, collidesWith = defaultColliders) {
		this.world = world
		this.img = img
		this.x = x
		this.y = y
		this.collidesWith = collidesWith
	}

	/**
	 * Function called when another entity collides with this entity
	 * @param {Entity} entity The entity that collided with this entity
	 */
	onCollided(entity) {}

	/**
	 * Checks if there would be any collisions at the specified coordinates, and if so, which entities would be collided with (if any)
	 * @param {number} offsetX
	 * @param {number} offsetY
	 * @returns {[boolean, Entity[]]} A tuple of whether a world grid collision occurred, and an array of entities that were collided with, if any.
	 * If either the boolean is true or the array has at least one element, a collision has occurred.
	 */
	checkCollisionsAt(offsetX, offsetY) {
		const self = this.img
		const gData = this.world.grid.data

		let collidedWorld = false
		/** @type {Entity[]} */
		const collidedEntities = []

		for (let y = 0; y < self.length; y++) {
			const selfCol = self[y]

			for (let x = 0; x < selfCol.length; x++) {
				if (selfCol[x] === ' ') {
					continue
				}

				const gCoordX = offsetX + x
				const gCoordY = offsetY + y

				// Check for world grid collision
				if (
					gCoordY >= 0 && gCoordY < gData.length &&
					gCoordX >= 0 && gCoordX < gData[gCoordY].length
				) {
					const gChar = gData[gCoordY][gCoordX]

					if (this.collidesWith.includes(gChar)) {
						collidedWorld = true
					}
				}

				// Check for entity collisions
				for (const entity of this.world.entities) {
					if (entity === this) {
						continue
					}

					const eData = entity.img

					if (
						gCoordY >= entity.y && gCoordY < eData.length + entity.y &&
						gCoordX >= entity.x && gCoordX < eData[gCoordY - entity.y].length + entity.x
					) {
						const eChar = eData[gCoordY - entity.y][gCoordX - entity.x]

						if (eChar !== ' ' && !collidedEntities.includes(entity)) {
							collidedEntities.push(entity)
						}
					}
				}
			}
		}

		return [collidedWorld, collidedEntities]
	}

	/**
	 * Same as {@link checkCollisionsAt}, but simply returns a boolean instead of detailed collision information
	 * @param {number} offsetX
	 * @param {number} offsetY
	 * @returns {boolean} If the entity would collide with anything at the specified coordinates
	 */
	checkAnyCollisionsAt(offsetX, offsetY) {
		const [collidedWorld, collidedEntities] = this.checkCollisionsAt(offsetX, offsetY)

		return collidedWorld || collidedEntities.length > 0
	}

	/**
	 * Moves the entity by the specified X and Y deltas.
	 * Optionally checks for collisions and adjusts the final X and Y based on them.
	 * @param {number} x The X delta to move by
	 * @param {number} y The Y delta to move by
	 * @returns {[number, number, Entity[]]} A tuple of the X and Y deltas the entity moved by (may be less than the specified X and Y deltas) and any entities that were collided with
	 */
	moveBy(x, y) {
		let progressX = 0
		let progressY = 0
		const destX = x
		const destY = y

		let deltaX
		if (x > 0) {
			deltaX = 1
		} else if (x < 0) {
			deltaX = -1
		} else {
			deltaX = 0
		}
		let deltaY
		if (y > 0) {
			deltaY = 1
		} else if (y < 0) {
			deltaY = -1
		} else {
			deltaY = 0
		}

		/** @type {Entity[]} */
		const collidedEntities = []

		while (
			(destX === 0 || progressX !== destX) &&
			(destY === 0 || progressY !== destY) &&
			(deltaX !== 0 || deltaY !== 0)
		) {
			if (deltaX !== 0) {
				const [collidedWorldX, collidedEntitiesX] = this.checkCollisionsAt(this.x + progressX + deltaX, this.y + progressY)

				if (collidedWorldX || collidedEntitiesX.length > 0) {
					deltaX = 0
				} else {
					progressX += deltaX
				}

				for (const entity of collidedEntitiesX) {
					if (!collidedEntities.includes(entity)) {
						collidedEntities.push(entity)
					}
				}
			}

			if (deltaY !== 0) {
				const [collidedWorldY, collidedEntitiesY] = this.checkCollisionsAt(this.x + progressX, this.y + progressY + deltaY)

				if (collidedWorldY || collidedEntitiesY.length > 0) {
					deltaY = 0
				} else {
					progressY += deltaY
				}

				for (const entity of collidedEntitiesY) {
					if (!collidedEntities.includes(entity)) {
						collidedEntities.push(entity)
					}
				}
			}
		}

		this.x += deltaX
		this.y += deltaY

		// Dispatch collision events
		for (const entity of collidedEntities) {
			entity.onCollided(this)
		}

		return [progressX, progressY, collidedEntities]
	}
}

class World {
	/**
	 * @type {Grid}
	 */
	grid

	/**
	 * @type {Entity[]}
	 */
	entities

	/**
	 *
	 * @param {Grid} grid
	 */
	constructor(grid) {
		this.grid = grid
		this.entities = []
	}
}

const world = new World(
	new Grid([
		['=', '=', '=', '=', '=', '=', '=', '=', '=', '=', '=', '=', '=', '=', '=', '=', '=', '=', '=', '='],
		['=', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '='],
		['=', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '='],
		['=', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '='],
		['=', ' ', ' ', ' ', '=', '=', '=', '=', '=', '=', '=', '=', '=', '=', '=', '=', ' ', ' ', ' ', '='],
		['=', ' ', ' ', ' ', '=', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '=', ' ', ' ', ' ', '='],
		['=', ' ', ' ', ' ', '=', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '=', ' ', ' ', ' ', '='],
		['=', ' ', ' ', ' ', '=', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '=', ' ', ' ', ' ', '='],
		['=', ' ', ' ', ' ', '=', ' ', ' ', ' ', ' ', ' ', ' ', '*', '*', ' ', ' ', '=', ' ', ' ', ' ', '='],
		['=', ' ', ' ', ' ', '=', ' ', ' ', ' ', ' ', ' ', ' ', '*', '*', ' ', ' ', '=', ' ', ' ', ' ', '='],
		['=', ' ', ' ', ' ', '=', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '=', ' ', ' ', ' ', '='],
		['=', ' ', ' ', ' ', '=', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '=', ' ', ' ', ' ', '='],
		['=', ' ', ' ', ' ', '=', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '=', ' ', ' ', ' ', '='],
		['=', ' ', ' ', ' ', '=', '=', ' ', ' ', ' ', ' ', '=', '=', '=', '=', '=', '=', ' ', ' ', ' ', '='],
		['=', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '='],
		['=', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '='],
		['=', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '='],
		['=', '=', '=', '=', '=', '=', '=', '=', '=', '=', '=', '=', '=', '=', '=', '=', '=', '=', '=', '='],
	]),
)

const player = new Entity(
	world,
	[
		['#', '#'],
		['#', '#'],
	],
	1, 1,
)

world.entities.push(player)

function render() {
	console.clear()

	const frame = Grid.from(world.grid)

	for (const entity of world.entities) {
		frame.stamp(entity.img, entity.x, entity.y)
	}

	let resStr = ''
	for (let y = 0; y < frame.data.length; y++) {
		if (y > 0) {
			resStr += '\n'
		}

		resStr += frame.data[y].join(' ')
	}

	process.stdout.write(resStr)
}

function tick() {
	// TODO Do something with entities
	for (const entity of world.entities) {
		if (entity === player) {
			continue
		}

		let deltaX
		if (entity.x < player.x + 1) {
			deltaX = 1
		} else if (entity.x > player.x + 1) {
			deltaX = -1
		} else {
			deltaX = 0
		}

		let deltaY
		if (entity.y < player.y + 1) {
			deltaY = 1
		} else if (entity.y > player.y + 1) {
			deltaY = -1
		} else {
			deltaY = 0
		}

		entity.moveBy(deltaX, deltaY)
	}
}

setInterval(tick, 250)
setInterval(render, 250)

setInterval(function () {
	const gData = world.grid.data
	const gWidth = gData[0].length
	const gHeight = gData.length

	let retries = 0
	const maxRetries = 100
	for (let i = 0; i < 10; i++) {
		const x = randomInt(1, gWidth - 2)
		const y = randomInt(1, gHeight - 2)

		const entChar = ['-', '+', '>', '<', '~'][randomInt(0, 4)]

		const newEnt = new Entity(
			world,
			[[entChar]],
			x, y,
		)

		if (newEnt.checkAnyCollisionsAt(x, y)) {
			if (retries < maxRetries) {
				i--
				retries++
			}
			continue
		} else {
			retries = 0
			world.entities.push(newEnt)
		}
	}
}, 1_000)

render()

/**
 * Handles key presses
 * @param {string} key
 */
function keyHandler(key) {
	if (key === '\u0003') {
		process.exit(0)
	}

	const lower = key.toLowerCase()

	/** @type {Entity[]} */
	let collided = []

	switch (lower) {
		case 'w':
			[,, collided] = player.moveBy(0, -1)
			break
		case 'a':
			[,, collided] = player.moveBy(-1, 0)
			break
		case 's':
			[,, collided] = player.moveBy(0, 1)
			break
		case 'd':
			[,, collided] = player.moveBy(1, 0)
			break
	}

	for (const entity of collided) {
		world.entities.splice(world.entities.findIndex(x => x === entity), 1)
	}

	render()
}

process.stdin.on('data', keyHandler)
