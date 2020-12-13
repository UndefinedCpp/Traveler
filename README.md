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
* [Pushing/Swapping] If a creep is in the way, it will either push that creep towards the target, or swap with it if that creep is a lower priority. Pass {priority: xx} in options.

## Installation

1. Download [Traveler.ts](https://github.com/bonzaiferroni/Traveler/blob/master/Traveler.ts) or [Traveler.js](https://github.com/bonzaiferroni/Traveler/blob/master/Traveler.js) or just copy/paste the code in [Traveler.js](https://raw.githubusercontent.com/bonzaiferroni/Traveler/master/Traveler.js) into a new file using the screeps console.

2. Add a require statement to `main.js`: 
    * `var Traveler = require('Traveler');`
    * (in the sim or some private servers you might need to use `'Traveler.js'`)
3. Replace situations where you used `moveTo` with `travelTo`
```
    // creep.moveTo(myDestination);
    creep.travelTo(myDestination);
```

![Installation animation](http://i.imgur.com/hUu0ozU.gif)

#### Performance considerations
1. `travelTo` creates a new object in creep memory, `_trav`, which is analogous to the object used by `moveTo()` for caching the creeps path. For this reason, it will save memory to use either `travelTo()` or `moveTo()` with a given creep, but not both.
2. As with any algorithm where creeps aren't a consideration for pathing by default, you'll have best results when their path has a low chance of including immobile creeps. My creeps rarely reach the "stuck threshold" because I take extra considerations to keep the roads clear.

## WishList
* Optimization for recursive push. Currently creeps will only push towards a target and not another open space near the target. Working on balancing this aspect with CPU usage

## Documentation

The file itself has comments, and you can also find documentation [in the wiki](https://github.com/bonzaiferroni/Traveler/wiki/Traveler-API). I'm also looking for feedback and collaboration to improve Traveler, pull requests welcome!

## Changelog

2020-12-13
* Recursive push added. Creeps will send a 'push' option to one another to force a move.
* CPU optimization in push logic. Travel will now wait 1 tick prior to push and use significantly less CPU.
* Traveler will now automatically look at a creeps body composition and determine if it can ignore roads and use swamps without fatigue.

2020-12-12
* Initial build of this fork
* Added swapping and pushing of creeps in the way. Pass {priority: number} to traveler (default is 1) to utilize swapping. If a creep is a higher priority, it will swap with the creep in the movement direction.
* Traveler keeps track of when the last move was. This is used for the above logic.
* Added function for moving a creep offroad when working on a target. Use creep.MoveOffRoad(target, distance). WARNING: this is not a CPU friendly task.
* Added PowerCreep support for traveler 
* Other various quality of life functions
* Code cleaned up by MistySenpai. Thanks!