# Traveler
 
Traveler is a general-purpose tool for moving your creeps around. Feel free to fork and use in other projects.
- TypeScript is not updated. Please feel free to push it to me.
#### Features:
* Efficient path-caching and CPU-use (you can see how it compares with `creep.moveTo()` [here](https://github.com/bonzaiferroni/bonzAI/wiki/Improving-on-moveTo's-efficiency))
* Ignores creeps in pathing by default which allows for fewer PathFinder calls and [single-lane creep movement](https://github.com/bonzaiferroni/screepswiki/blob/master/gifs/s33-moveTo.gif)
* Can detect hostile rooms and will [path around them once discovered](https://github.com/bonzaiferroni/bonzAI/wiki/Improving-on-moveTo's-efficiency#long-distances-path-length-400). More info on how to enable detection [here](https://github.com/bonzaiferroni/Traveler/wiki/Improving-Traveler:-Important-Changes#hostile-room-avoidance)
* Effective [long-range pathing](https://github.com/bonzaiferroni/bonzAI/wiki/Improving-on-moveTo's-efficiency#very-long-distances-path-length-1200) 
* [Lots of options](https://github.com/bonzaiferroni/Traveler/wiki/Traveler-API)
* [Visuals](https://github.com/bonzaiferroni/Traveler/wiki/Improving-Traveler:-Features#show-your-path)
* [Pushing/Swapping] If a creep is in the way, it will either push that creep towards the target, or swap with it if that creep is a lower priority. Use creep.Move()

## Installation

1. Download [Traveler.ts](https://github.com/bonzaiferroni/Traveler/blob/master/Traveler.ts) or [Traveler.js](https://github.com/bonzaiferroni/Traveler/blob/master/Traveler.js) or just copy/paste the code in [Traveler.js](https://raw.githubusercontent.com/bonzaiferroni/Traveler/master/Traveler.js) into a new file using the screeps console.

2. Add a require statement to `main.js`: 
    * `var Traveler = require('Traveler');`
    * (in the sim or some private servers you might need to use `'Traveler.js'`)
3. Replace situations where you used `moveTo` with `travelTo`
```
    // creep.moveTo(myDestination);
    creep.Move(myDestination, range, priority, opts = {}); (see wiki for more)
```

![Installation animation](http://i.imgur.com/hUu0ozU.gif)

#### Performance considerations
1. `Move` creates a new object in creep memory, `_trav`, which is analogous to the object used by `moveTo()` for caching the creeps path. For this reason, it will save memory to use either `travelTo()` or `moveTo()` with a given creep, but not both.
2. moveOffRoad() should be used only when needed. This function has a cooldown of 20 ticks to avoid spamming CPU.

## WishList

## Documentation

The file itself has comments, and you can also find documentation [in the wiki](https://github.com/crazydubc/Traveler/wiki). I'm also looking for feedback and collaboration to improve Traveler, pull requests welcome!

## Changelog

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
* Added function for moving a creep offroad when working on a target. Use creep.MoveOffRoad(target, distance). WARNING: this is not a CPU friendly task.
* Added PowerCreep support for traveler 
* Other various quality of life functions
* Code cleaned up by MistySenpai. Thanks!