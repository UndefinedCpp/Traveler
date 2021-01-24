# Traveler
 
Traveler is a general-purpose tool for moving your creeps around. This version is forked from bonzaiferroni. Feel free to fork and use in other projects.
- TypeScript is not updated. Please feel free to push it to me.
#### Features:
* Efficient path-caching and CPU-use (you can see how it compares with `creep.moveTo()` [here](https://github.com/bonzaiferroni/bonzAI/wiki/Improving-on-moveTo's-efficiency))
* Ignores creeps in pathing by default which allows for fewer PathFinder calls and [single-lane creep movement](https://github.com/bonzaiferroni/screepswiki/blob/master/gifs/s33-moveTo.gif)
* Can detect hostile rooms and will [path around them once discovered](https://github.com/bonzaiferroni/bonzAI/wiki/Improving-on-moveTo's-efficiency#long-distances-path-length-400).
* Effective [long-range pathing](https://github.com/bonzaiferroni/bonzAI/wiki/Improving-on-moveTo's-efficiency#very-long-distances-path-length-1200) 
* [Lots of options](https://github.com/bonzaiferroni/Traveler/wiki/Traveler-API)
* [Visuals](https://github.com/bonzaiferroni/Traveler/wiki/Improving-Traveler:-Features#show-your-path)
* [Intershard travel] Finds nearby portals and moves to the optimal position to get to the next shard. The more portals you find, the shorter the path across shards.
* [Save on road maintenance] Creeps will path off of roads if they have enough move parts to transverse plains and swamps without losing time.
* [Pushing/Swapping] If a creep is in the way, it will either push that creep towards the target, or swap with it if that creep is a lower priority. Use creep.Move()

![Push/Swap animation](https://i.imgur.com/w050niD.gif)

## Installation

1. Download Traveler.js into a new file using the screeps console.

2. Add a require statement to `main.js`: 
    * `const Traveler = require('Traveler');`
    * (in the sim or some private servers you might need to use `'Traveler.js'`)
3. Replace situations where you used `moveTo` with `Move(target, range, priority, options)`.
```
    creep.Move(myDestination, range, priority, opts = {}); (see wiki for more)
```

![Installation animation](http://i.imgur.com/hUu0ozU.gif)

#### Performance considerations
1. `Move` creates a new object in creep memory, `_trav`, which is analogous to the object used by `moveTo()` for caching the creeps path. For this reason, it will save memory to use either `Move()` or `moveTo()` with a given creep, but not both.
2. moveOffRoad() should be used only when needed. This function has a cooldown of 20 ticks to avoid spamming CPU.

## WishList
- Intergrated quad/squad movement logic. This is being debated as to whether it should be allowed. Please send me your feedback.
- Intergrated retreat logic.

## Documentation

The file itself has comments, and you can also find documentation [in the wiki](https://github.com/crazydubc/Traveler/wiki). I'm also looking for feedback and collaboration to improve Traveler, pull requests welcome!

## Changelog

2021-01-24
* BUG FIX: Creeps would sometimes take a longer path to stay off roads when there was a shorter viable path. Fixed. Creeps will now always take the shortest path and only path off roads if it will cost no extra moves.

2021-01-15
* BUG FIX: fixed a bug calculating creep move efficiency.
* OPTIMIZATION: InterShard portal logic will now get, store, and use ALL shard portals when moving between shards. No need to scout them out!
* OPTIMIZATION: Creeps will now attempt to stay off of roads if they have enough body parts to out fatigue plains/swamps. Due to restrictions in the built in path finder this is not 100%. This optimization saves on road wear and tear.
* OPTIMIZATION: If a creep needs to push past a fat slow moving creep, the faster creep will swap with the slow one in order to pass instead of repathing.

2020-12-28
* OPTIMIZATIONS: Traveler now gets all shard portals. This wont be commanded unless you are doing intershard movement. Working CPU optimizations on this and usage of room portals soon.

2020-12-25
* Happy Holidays!
* NEW: Alpha testing of creep/powerCreep.MoveToShard. See wiki for usage.
* OPTIMIZATIONS: Traveler will now use Memory.Traveler to store all data except creep pathing. Traveler will store room information and portal locations here for users to reference. Makes it easier to uninstall if you decide not to use it at a later time.

2020-12-21
* BUG FIX: Fixed two edge cases. One of which will set the range to 0 if the target is an exit tile to protect the user from themselves.

2020-12-17
* BUG FIX: Changed a bit of logic around that could cause creeps to repath instead of passing each other. Thanks Misty for testing it.

2020-12-16
* OPTIMIZATION/BUG FIX: Several changes to the push/swap logic. Now more effecient and a few edge cases eliminated thanks to MistySenpai's testing and reporting.

2020-12-14
* OPTIMIZATION: Major optimizations in moveOffRoad. CPU usage reduced to an average of 0.25 from 0.7.
* NEW: creep.Move() is the new standard and creep.travelTo is depreciated. Please see the wiki for usage.
* FIX: Creeps will now push to other adjacent spots to that target and the creep when being pushed.
* OTHER: minor bug fixes and quality of life improvements on the backend.
* REMOVED: creep.MoveToRange() has been removed and merged into creep.Move()

2020-12-13
* Recursive push added. Creeps will send a 'push' option to one another to force a move.
* CPU optimization in push logic. Travel will now wait 1 tick prior to push and use significantly less CPU.
* Traveler will now automatically look at a creeps body composition and determine if it can ignore roads and use swamps without fatigue.
* Bug fix from u.283 involving power creeps. Thanks! If we are ever in prison together, I will watch your back in the shower.

2020-12-12
* Initial build of this fork
* Added swapping and pushing of creeps in the way. Pass {priority: number} to traveler (default is 1) to utilize swapping. If a creep is a higher priority, it will swap with the creep in the movement direction.
* Traveler keeps track of when the last move was. This is used for the above logic.
* Added function for moving a creep offroad when working on a target.
* Added PowerCreep support for traveler 
* Other various quality of life functions
* Code cleaned up by MistySenpai. Thanks!