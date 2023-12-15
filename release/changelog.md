# 0.7.5 (hotfix) - Jan 26 2021
Fixed a few crashes in versus select.

## Fixes
* Fixed game crashing when starting versus mode
* Fixed game crashing when switching colors in versus select
* Fixed AI crashing versus
* Fixed changing teams not updating start UI

=====================

# 0.7.4 - Jan 23 2021
More handling changes, substantial bug fixes, and animation work.

## Features
* Improved (but still WIP) save/load state - v to save, b to restore on keyboard while offline
* Can now save/restore via controller inputs in Training - d-pad right to save, d-pad left to restore (might work online?)
* Xenon, Carbon, and Rhodium now have icons/text by stock displays to indicate charge/states
* Air handling was reworked again

## Characters
* Still working on balance with changes to knockback curves/etc
* Lots of new animations and fine-tuning, particularly for walk/stride/run
* Lots of small physics-related tweaks

## Misc
* Some new visual effects
* Changed camera anchoring on most stages to tweak how it zooms in/out
* Tweaks to bounce knockback

## Fixes
* Fixed AI not being able to use its controller - couldn't recover, couldn't shield
* Updated some dependencies
* Fixed some places in UI where online/non-online was not properly respected
* Disabled some keyboard shortcuts while online (cause desyncs)
* Finally fixed frame step (x to stop, z to advance, only while offline)
* Fixed bug that caused air friction to apply asymmetrically
* Found and fixed bug causing subtly asymmetric knockback angles, which also caused all knockback angles to be too high

=====================

# 0.7.3 - Jan 3 2021
Picking back up on bug fixes/quality of life improvements, which will be the priority for the rest of 0.7.

## Features
* Put a thin layer of polish on old UI code: sound effects, hover states
* Hovering over stages in versus select now previews the stage behind the menu

## Tweaks
* The tech input window now extends slightly into a missed tech animation instead of only testing on land
* Removed slopes from Transistor's ledges - collision bugs can make it unplayable, this is easier than fixing now
* Air handling got changed a little again
* A little more balancing

## Fixes
* Attempted fix for some of the weird ground -> air animation canceling bugs and other related things
* Improved some logic that should clean up a few subtle, inconsistent misbehaviors
* Fixed bug preventing forward/back jumps from being used out of moves that allow jumping and similar scenario
* Fixed stats not tracking in some scenarios
* Respawn and hit stun effects no longer have ugly orbs
* Fixed controller input not reading properly in frame-by-frame mode (also groundwork for replays)
* A lot of various systems here and there are now a bit more stable

=====================

# 0.7.2 - Dec 30 2020
Another rework of knockback and stun, character handling tweaks, and balance changes.

## Tweaks
* All characters have had their dodge rolls, tech rolls, and floor rolls tuned to be longer
* All characters have had movement/handling tweaked
* Hax dashing should work now
* Shield knockback has been entirely redone, and also applies knockback to a grounded attacker

## Characters
* Lots of balance changes, but not worth listing until knockback/etc changes settle down
* Iron has a very new up-B trajectory pattern
* Xenon's orb warp now has a short delay

## Misc
* Updated Node

=====================

# 0.7.1 - Dec 26 2020
Minor balance patch.

## Tweaks
* Can now jump and grab out of the start of dash attack animations
* Lag-canceling energy regen delay is now based on move's landing lag, and lower

## Characters

### Carbon
* Several tweaks and buffs

### Helium
* New up-tilt (well, the animation's the same, but it hits differently)
* Several tweaks and buffs

## Misc
* Improved controller display
* Fix crash on restore state if an entity was removed
* Cleaned up Helium's animation data
* Misc cleanup

=====================

# 0.7.0 - Dec 20 2020
New controller polling code, new netplay code, tons of netplay improvements, a lot of code cleanup, more visual improvements, new knockback curves.

## Features
* Controller polling is handled more reliably now
* A big portion of the netcode stack has been rewritten or overhauled, and should be much more stable
* Netcode now consumes even less bandwith
* First phase of new SFX work, plus new SFX encoding pipeline
* Lots of visual improvements

## Balance
* New knockback curves, with a lot of move adjustments that aren't directly comparable anymore
* Big balance pass, accounting for knockback/stun changes
* Xenon and Helium have been resized to be larger
* Can no longer tilt shield while in shield stun
* Parry window reduced to two frames
* Disabled stale DI system for now, to test without it and because it got broken and this is easier than fixing
* Bounce knockback curves reworked - now bounce higher
* Iron has a new up-tap
* Shield can now trigger during iasa frames
* Can no longer buffer actions out of dropping shield
* Lag-cancel window tweaked: active for 10 frames, but can input again after 7

## Fixes
* Fixed some ledge options with control stick not working as intended
* Fixed parry audio being too loud
* Fixed shield knockback
* Tons of code cleanup and automatic linting, which caught a few obscure bugs
* Fixed damage displays rising further and further away from characters based on damage
* Bandaided Xenon bot's recovery
* Fixed sound effects being pretty quiet
* Fixed being able to change spawn facing at the start of a game by holding a direction
* Frame-perfect reverse forward-tap now correctly uses the pivot version of the animation
* Fixed hot reloading of characters not working right if there is more than one of that character in game

## Misc
* Tuned thresholds for tilts
* Improved ftilt vs utilt input
* Tuned out of shield control options
* Menu fits the screen better
* Remapping menu is spaced better
* Updated TypeScript, Node, FreeType, and other dependencies
* New logo
* itch.io client support (released as a hotfix on itch a few months ago)
* Improved controller debug display
* Cleaned up installation a bit (removed unused files + fixed some of the build process)

=====================

# 0.6.2 - May 15 2020
Some small tweaks to the graphics engine, plus improvements to hitbubbles and some random other things.

## Features
* All wavedashes/airdodges have been adjusted, and some dashes
* Hitbubbles can have initial smearing now
* Charge moves now transition between 0 and 75%, then flatten out until 100%
* Added Video settings menu

## Characters
* All characters have some kind of balance change, mostly thanks to new hitbubble tech being applied to everyone

### Xenon
* All old-bone animations have now been tweaked for new bone structure

## Fixes
* FXAA optimized a bit
* Possibly improved noise consistency
* When grabbing a character, no longer teleports them immediately into position
* Fixed inverted shadow bug when using low shadow quality

## Misc
* Removed some unused animations
* Add link to the Guide at https://bluehexagons.com/antistatic/guide on the main menu

=====================

# 0.6.1 - May 7 2020
Another Canary-exclusive release, with more work on the graphics engine.

## Changes
* Stage colors tweaked a lot
* Lighting model revamped again
* Added rim glow to help things stand out better
* Added bounce lighting to the AO model
* Added FXAA
* First two frames of jump squat can no longer be grabbed

## Fixes
* Fixed two boxes on Crossing's ground floating
* Optimized some stuff to reduce cache misses/performance losses in very high resolutions (i.e. 4K)

=====================

# 0.6.0 - May 3 2020
Starting out on the Canary branch, 0.6.0 brings a lot of major changes and upgrades. The 0.6.x line will focus on bug fixes, with just a handful of features. 0.7.0 will mark the transition into beta.

## Features
* Characters are now fully-modeled, some may get further refinement
* Stages all feature unique colors and background
* Implemented screen-space ambient occlusion
* New particle effects
* Positional audio - SFX should sound more correct based on location
* Improved character handling
* Lighting is now more physically-based, improved
* Now 100% more DPI aware on Windows
* Menus are now finally centered horizontally
* Recovery moves that go in a direction now have a bar pointing with the control stick
* Hits during a combo change pitch based on damage and number of hits

## Fixes
* Fixed multiple long-standing collision bugs that would cause characters to clip through the stage
* Lag-canceling and teching can now be performed on the frame of impact
* Improved several strange things with sliding off of edges
* A lot of random fixes for various animation states
* Fixed some throw animations that were particularly janky
* Objects (projectiles) no longer push/get pushed by characters if grounded
* Fixed stun carrying after land-canceling it - inflated combo meter, had no other effect

## Characters
* After another handling pass, all characters have adjusted dash/run/moon walk/etc speeds.
* Moon walk speed is now capped, but behaves more consistently

### Carbon
* Dair: adjusted animation
* Down-B: backswing time increased

### Iron
* Jab knockback growth increased slightly
* Uair late hit knockback rescaled

### Rhodium
* Side-B can no longer accelerate to insane speeds with edge cancels and SD instantly

### Xenon
* Fixed some major orb crash bugs
* A lot of tweaks to fair

## Misc Fixes
* Fixed several rare replay crash bugs
* Fixed some potential crashes with grabs that couldn't be observed in normal gameplay
* Fixed numerous lighting, graphical bugs and quirks
* Optimized stage rendering
* Fixed shaders trying to run in glsl 4.30 instead of 4.00
* Fixed particles sometimes behaving strangely when stages are swapped in training
* Fixed random numbers being less random than desired
* A lot of fixes for the UI framework

## Misc
* More info in `dbg animations`
* Added `dbg drawTerminal`
* `dbg drawUI` no longer hides the terminal
* Character file live reloading is now disabled by default: to enable, add a file named `debug` to the Antistatic directory
* Updated Node
* Updated SDL
* Updated libUSB

=====================

# 0.5.0 - Jan 23 2020
Groundwork for per-character models. Helium's body is finished, but others mostly only have heads. WIP.

## Features
* Per-character models

## Characters
* Landing friction changed

### Helium
* Up-B no longer has a sweetspot
* Dair momentum changed a bit, early auto cancel window widened

### Iron
* Up-B is now flexible; previously locked to cardinal directions
* Neutral-B works more consistently

## Misc
* `dbg animations` now includes slide momentum in velocity values
* Node.js upgraded to 13.7.0

=====================

# 0.4.8 - Jan 12 2020
A handful of changes, improved hit response, plus some netplay fixes before the 0.5.0 release.

## Features
* A lot of changes to how hit response works; grounded hits are particularly improved
* Light shielding is now disallowed in 19XX

## Characters
* A lot of animation improvements for Silicon, Carbon
* Energy recharge delay +10 frames

### Carbon
* A lot of animation polish
* Increased ledge grab range
* Increased bair range
* Reduced dtilt startup
* Up-B sweet spot improved, safer

### Rhodium
* Buffed up-tilt, up-tap, forward-tap

### Silicon
* Animation polish
* Up-B tweaked slightly

## Fixes
* Fixed some weirdness with tap inputs
* Spot dodge is properly disallowed in 19XX again
* Fixed IK not really working right
* A ton of fixes for netplay, but still not ideal

## Misc
* `dbg animations` shows more stuff, more cleanly
* Upgraded Node to 13.6.0

=====================

# 0.4.6 - Nov 16 2019
Unicode support is finalized. Machine translations now included for Japanese, Simplified Chinese, Traditional Chinese, and Korean. More UI is now translated, including stage names. Text looks nicer, too.

## Features
* Full Unicode code point support - note, doesn't include any fancy Unicode features, only the ability to show any character. Also, many languages outside of normal ranges are rendered with a very small font to save on file size.
* Text measurement actually works now
* Text antialiasing is enabled again
* More UI is translated (start menu, some other things)

## Characters
* Xenon's teleport now causes a burst effect
* Rhodium's shield placement fixed

## Fixes
* Fixed character spawns starting one spot late
* Characters no longer flash if they don't charge a tap attack
* Fixed a bug that would cause character style not to save between matches
* Now waits until leaving the settings menu to update the UI language
* Fixed AI counters in versus select having the + button to the left and - to the right

## Misc
* Some behind-the-scenes cleanup
* A bit of optimization work
* Parts of stage file format cleaned up
* Upgraded to Node.js 13.1.0
* Updated dependencies

=====================

# 0.4.5 - Oct 27 2019
New character: Rhodium.

## Balance
### Rhodium
* New character

### Xenon
* Dtilt buffed

## Fixes
* Fixed some bugs with animation redirects
* Fixed potential bugs from not re-initializing characters on respawn

## Misc
* Replaced a few placeholder miscellaneous animations for all characters
* Updated to Node 13.0.1
* Updated to SDL 2.0.10
* Updated to FreeType 2.10.1

=====================

# 0.4.4 - Sep 29 2019
Working prototype for a control rebinding menu with bad keyboard support, plus small changes while busy with life.

To contribute to translations, join the [Antistatic Discord](discord.gg) or send a pull request/comment on GitHub: https://github.com/bluehexagons/antistatic-translations

## Features
* Functional control rebinding menu; very rough and keyboard support doesn't allow adding/removing keys yet
* Can now toggle tap-jump mid-game by holding down taunt (d-pad down by default) and pressing jump
* D-pad can now be used to navigate new menus

## Balance
### Carbon
* Bair knockback rescaled
* Down-tap knockback increased

### Helium
* Reduced startup/backswing of side-B
* Drastically reduced landing lag of down-B 2 (after hit)
* Reduced nair startup, duration, backswing
* Reduced dair duration, backswing
* Side-B now drains energy over time as held

## Fixes
* Fixed controls menu not always populating
* Fixed a few things that prevented building on Linux (distributable coming later)
* Fixed multibyte symbols being measured incorrectly (Russian language fix)

## Misc
* Updated to Node 12.11.0

=====================

# 0.4.3 - Aug 19 2019
Mostly internationalization work. Most UI now goes through the translation system, so the game should largely be understandable (depending on machine translation quality). The next step is better Unicode support, to allow for CJK translations.

To contribute to translations, join the [Antistatic Discord](discord.gg) or send a pull request/comment on GitHub: https://github.com/bluehexagons/antistatic-translations

## Features
* Old UI now gets run through translation infrastructure
* Language cycle added to options menu
* Audio settings moved onto a separate screen
* Text now squishes if it's too long for its box
* UI updates immediately when changing languages
* Facing arrow is now much more pronounced

## Fixes
* Fixed some custom startup scripts not being run correctly - inconsequential except for tinkerers

## Balance
### Carbon
* Dair slightly tweaked

## Misc
* Updated to Node 12.8.1

=====================

# 0.4.2 - Aug 11 2019
Internationalization prototype for the main menu, powered by Fluent! Tries to guess proper language, change with `config locale [en/es/de/ru/it]`; reads from `app/assets/ftl` directory. Right now, it's just temporary machine translations. Let me know if anything's particularly funny.

To contribute to translations, join the [Antistatic Discord](discord.gg) or send a pull request/comment on GitHub: https://github.com/bluehexagons/antistatic-translations

Unicode support was improved dramatically, but still not good enough for CJK character sets. Soon?

Also fixed a really annoying bug when connecting for netplay.

## Features
* Internationalization prototype, via `config locale`; VERY work-in-progress
* Better Unicode support
* Very-slightly-improved netplay menu

## Fixes
* Fixed a bug that caused connections to randomly, and often, time out
* Some general stability improvements to netplay
* Fixed error when setting config settings with strings
* Fixed rare crash when fonts are loading
* Fixed characters rendering being glitched out on the first frame

## Misc
* Updated to Node 12.8.0

=====================

# 0.4.1 - Jun 19 2019
Some random additions making progress to 0.5.

## Features
* Controls menu: no rebinding implemented yet, but should help to see keyboard controls
* Random character button/sandbags
* Pressing Special on menus now goes back when applicable
* Volume sliders v1 (mouse interaction isn't perfect)
* Lots of backend UI features
* Save/restore states work with more properties
* Console now breaks lines at 100 characters

## Fixes
* Fixed using space bar to trigger buttons causing crashes

## Misc
* The enter key no longer opens the console, now activates buttons

=====================

# 0.4.0 - Jun 8 2019
New UI infrastructure, used for the new main menu. Lots of random changes.

## Features
* Start of shiny new UI infrastructure, used by main menu and settings
* Moved settings from versus select to settings screen
* Added SFX to UI interaction (only on new infrastructure)
* Throws now scale their speed by the target's weight
* Cursors move faster while angling the right stick
* AI now shakes out of tumble
* Brand new audio loader - much faster, slightly buggier, more portable
* Blastzones render again when approaching them

## Netplay
* Clunky in-game chat using the `say`, `me`, and `nick` commands
* Netplay UI now shows more errors
* Can now cancel join and host
* Disconnects happen more nicely
* Fixed some of the bugs with the netplay UI
* Disabled most non-controller menu navigation while connected for netplay, since they currently cause desyncs

## Balance
* Wall jumps grant brief intangibility
* 19XX now disables shaking out of tumble
* Every aerial has landing lag reduced by about 25%
* Lag-canceling reduces landing lag by 25% (roughtly the same lag as before), controlled by LAG_CANCEL_MUL constant
* Ledge dropping caps intangibility to 2/3 of maximum
* Boombox blastzones shrunk slightly

### Silicon
* Fair and bair adjusted
* Forward-tap rescaled

## Training
* Added heatmap overlay
* Added AUTO_LAG_CANCEL game constant

## Fixes
* Fixed some frame-dependent input weirdness
* Ignore some keys when connecting a keyboard controller
* Fixed a typo in the default keyboard layout
* Fixed a bug that caused keyboard controllers to not respond if a button was highlighted
* Disabled some buggy behavior in old UI (used in versus select, training menu)
* Character models are now drawn slightly offset to reduce z-fighting
* Fixed Several keyboard controller bugs
* Audio now gets stopped when actually makes sense, instead of every scene change
* Same as previous, but for music starting
* Text rendering looks a little less awful on cursors/droppers
* Fixed micro symbols not rendering
* Fixed some bugs with shields
* Fixed some bugs with netplay connecting
* Fixed blank results screen if quitting happened during a pause
* Fixed other weirdness with results screens and quitting
* Fixed `math` command not writing a newline
* MathVM now supports percents, but modulus is disabled for now

## Misc
* Updated Node.js to 12.4.0
* Animations can now play at non-integer speeds (used for some of the other changes)
* Characters can now be scaled to different sizes using the skeletonScale and bubbleScale properties
* Characters can now have all animations sped up or slowed down using the animationSpeed property
* Rectangle borders are more rectangular
* Some improvements to old UI components
* Internationalization packages are now bundled, for future use
* `dbg network` makes more sense to use
* No longer remembers last mode played, but starts in the `startMode` config setting
* Shields look a bit nicer
* TypeScript now targets ESNext instead of ES2017

=====================

# 0.3.5 - Apr 5 2019
Bug fixes and quality of life improvements.

## Netplay
* Fixed some more possible desync conditions
* Fixed pings not pinging correctly
* Fixed cases where network controllers could activate things they shouldn't be able to

## Features
* Hitbubbles are now also colored based on sound effect and damage type
* Training mode now has an Overlays dropdown to toggle various `dbg` settings

## Balance
* Default blast zone ceiling is now lower (applies to several, but not all, stages)

### Carbon
* Down-B non-super knockback nerfed

### Iron
* Up air now has DI staling on first hit (can be DIed further the more stale it is)
* All throws adjusted
* Forward-tap knockback increased

### Silicon
* Dash attack no longer weirdly clings to the stage

### Xenon
* Bottom hitbubble of up air shrunk a bit

## Fixes
* Fixed crash with dropdowns
* Fixed some crashes when reloading modified character files on Windows
* Fixed case where some ways to trigger scene changes could happen at different timings
* Cursors no longer show under tap jump buttons
* Hits are now processed at the correct time, fixing several odd bugs
* Fixed a case where post screen wouldn't happen depending on how a game ended
* Disabled UI elements can be incorrectly triggered less often
* Fixed the wrong hit audio being used in a few places

## Misc
* Changed Demo to Training for clarity
* Buttons can now be activated and triggered with the Enter key
* Dropdowns are a bit more reliable and work better with keyboard

=====================

# 0.3.4 - Mar 29 2019
Quality of life update more than anything.

## Netplay
* Controllers reset on connect, which should resolve a few desyncs
* Connecting over netplay now automatically connects a controller if none is connected
* Even more buttons are now disallowed over network (exit, fullscreen, etc)

## Features
* Recovering under Great White and Crossing is now a little less harrowing
* Console-based control rebinding using the `mapping` command
* Versus select screen is slightly less shocking on startup (temporary solution for now)

## Balance
### Xenon
* Up-B now kind of works as a recovery

## Fixes
* Fixed a bug that caused legs to squish on the floor when landing
* Controllers reset predictably when changing scenes, which should fix some odd inconsistencies
* Keyboard-controlled analog sticks no longer get corrupted and break
* Fixed keyboard d-pad not working (bound to 1, 2, 3, 4)
* Fixed tap jump buttons not rearranging after controller disconnects
* Fixed visual bug where stock displays would fade in with prior character damage text

## Misc
* Updated Node to 11.13.0
* Some minor code cleanup which probably saves a few CPU cycles
* Debug-rendered stages are now slightly greyed out to indicate they're different from other misc stages

=====================

# 0.3.3 - Mar 22 2019
Took some time away for IRL things, so this update isn't as packed as normal.

## Features
* Player list on versus select screen looks a bit nicer
* Tap jump toggle is now present on VSS
* Xenon has a new model, but not many animations have been changed for it
* Netplay now tries to correct for frame drifting
* Basic game state is now synced when starting netplay

## Fixes
* Improved performance when there's too much text to render
* Check for basic errors when playing audio and don't crash when something bad happens
* Fixed AI using unsynchronized RNG
* Fixed some cases where game code could run outside of frames (caused desyncs)
* Fixed cursors sometimes appearing in weird places
* Fixed pressing attack to pick up the character selection puck not deselecting the character
* Addressed various issues with frame pacing not accounting for TAS and other pauses
* Fixed several potential buffer overflows
* Segfaults are now actually handled in a useful way for debugging
* Fixed overflowing the command buffer when too many sounds are played or too much text is rendered in one frame
* Fixed some broken code that could cause segfaults in very rare and random conditions

## Misc
* Updated Node to 11.12.0
* Netplay UI slightly improved
* Demo mode now shows a instruction to press start to enter the menu
* Text rendering optimized a bit, also allowing for more text to be rendered per frame
* No longer draw `dbg controllers` displays for AI
* New keyboard input system for UI

=====================

# 0.3.2 - Mar 13 2019
Most time has been spent on marketing, but here's an assortment of random changes and fixes. Also, lots of animation work on Iron.

## Features
* Switch from OpenGL 4.3 to OpenGL 4.0 to improve hardware support
* AI now techs on the wall/ceiling 90% of the time

## Balance
* Most aerials now have lower landing lag
* Most aerials now have more generous early autocancel windows
* Grab break knockback threshold increased, and moved into constants

### Carbon
* Dtilt: backswing reduced by 7 frames
* Ftilt: startup reduced by 1 frame
* Ftilt: range increased
* Utilt: startup reduced by 4 frames
* Utilt: range increased
* Utilt: final hit knockback increased
* Utilt: backswing reduced by 6 frames
* Dair: range increased
* Dair: removed one of the hits from the middle of the move
* Dair: increased delay between first and second hits (combined with previous, makes duration same)
* Down-B (non-bash): reduced damage

### Helium
* Fair: reduced size of hitbubbles, moved down
* Bair: slightly more range
* Uair: first hit moved backwards slightly

### Iron
* New up-B mechanics: five different arcs, based on control stick direction (neutral/up/right/down/left); no longer considers holding special button
* Down-B and Down-tap animations swapped, tweaked for new roles
* A LOT of animation work; may have slight balance implications
* Side-B gains more height

## Fixes
* Fixed a crash when initializing netplay
* Added more informative error messages when crashing early
* Netplay now checks to see if version numbers are the same (can still break in canary builds)
* Fixed all landing lag being 1 frame too long
* Turnaround specials behave more reliably/consistently
* Landing animations force feet to floor as a solution to some weird-looking cases
* Fixed a typo in an error message
* Tries harder to disable vsync
* Fixed weird movement and facing direction when wall/ceiling teching
* Fixed wall/ceiling teching being silent

## Misc
* Updated Node to 11.11.0
* Updated SDL2 to 2.0.9
* Updated SDL2 Image to 2.0.4
* Added `defaultStage` option to `asconfig` to control default Demo stage

=====================

# 0.3.1 - Mar 4 2019
Netplay prototype hotfix.

## Balance
* 19XX: reduced ledge retention percentage from 0.75 (default) to 0.25

## Fixes
* Fixed netplay UI not returning to the right state after leaving and coming back
* Fixed RNG desync with character cursors
* Fixed potential desync with character cursor selectors

=====================

# 0.3.0 - Mar 4 2019
Launching the netplay prototype.

## Features
* Quick touch-up on versus select screen

### Netplay Prototype
First release of the netplay prototype: a lot of features are missing, problems are going to happen. But at a basic level, it works.

There are two netplay buttons on the Versus Select screen: host, and join from clipboard. Either player can host, and doing so will copy the lobby code to the clipboard. Share the code, and the

Limitations:

* Only two clients allowed in a lobby, but multiple controllers per game should work.
* Cannot connect or disconnect controllers after joining a lobby. Doing so will trigger a disconnect.
* Don't do anything while a connection is being established. Bad things will probably happen.
* Some computers will drift apart in frame timing. There is no correcting for this yet, but can be worked around by disconnecting/reconnecting every now and then.
* Game cannot resynchronize.
* There are probably router configurations that will fail to connect. Please report them.

Known bugs:

* There are probably things that cause the games to desynchronize. There is no automatic checking for this yet.
* Clicking on buttons will not trigger the action on both players. This will probably cause a desync.
* Stages with moving platforms will sometimes cause desyncs.
* Controller settings aren't synced. Tap-jump, for example, will cause desyncs if it's changed from the default before joining the lobby.

## Balance
### Iron
* Jab startup -1f, backswing -1f
* Utilt less disjointed
* Up-tap animation adjusted:
* * has hitbox in startup again
* * sweep lasts longer
* * reduced backswing by 5 frames

### Xenon
* Slightly lighter (1.03 -> 1.07 knockback scale)

## Fixes
* Fixed error audio not playing when unable to start a game
* Fixed console text not fading out like it did before moving to SDL

## Misc
* Updated to Node.js v11.10.1
* Renamed Trashville to Crossing
* Console text made larger
* Results screen text made larger

=====================

# 0.2.16 - Mar 1 2019
Mostly just the netplay prototype. It's not quite ready yet, but it's playable.

## Features
* Console now supports paste (ctrl+v or shift+insert)

### Netplay
Netplay exists, but has some drift/stability/etc issues and isn't user-friendly to use yet. Currently, only two players can be in one lobby.

Console commands can be used when all players are on the versus select screen:
`host [port, default is 45860]` - Hosts an open connection. Useful when the UDP port is forwarded or the computer is accessible over the internet.
`tunnel [ip:port]` - Hosts an open connection on the default port, but also tries to connect to IP:port. This can get through most routers.
`connect [ip:port]` - Connects to the specified ip:port.

Full example: host is located at `1.1.1.1` and peer is at `0.0.0.0`.
Host doesn't have a port forwarded, so enters `tunnel 0.0.0.0` and peer enters `connect 1.1.1.1` at roughly the same time. If all goes well, they are now in a lobby together.

## Balance
### Iron
* Ftilt knockback increased
* Jab knockback increased
* Dtilt no longer sticks to the stage
* Utilt reworked

### Helium
* Fair rebalanced
* Dtilt retuned

### Silicon
* Reworked hitbubbles on up-B

## Misc
* Text fits in buttons a little more nicely

=====================

# 0.2.15 - Feb 21 2019
Stability improvements and beginning the trek toward working netplay.

## Features
* Rendering now cap at 60fps, since there weren't many animations that ran at unlocked frame rates; may revisit later
* More reliably tie other logic to frame rates
* Fullscreen toggle button finally added to UI
* Proof-of-concept VERY unstable netplay via `host [port, optional]` and `connect IP[:port, optional]` commands
* Reworked controller polling logic, which will hopefully reduce input lag and improve consistency

## Fixes
* Fixed potential game logic errors that could happen with skipped frames; unsure if some observed bugs may have stemmed from this or not

### Misc
* Upgraded to Node 11.10.0

=====================

# 0.2.14 - Feb 14 2019
Some mechanics changes, some balance changes, netplay still being developed and not ready for testing yet.

## Features
* Non-weak moves now trade with grabs
* The frames before and after leaving ground from a jump can now be canceled with all specials
* Side-B vs up-B detection improved when grounded
* Changes to carried momentum when wavedashing/wavelanding off of a platform or stage

### New grab holding mechanic
When holding someone, energy is drained over time. The rate is based on:
* How long the hold has lasted, ramping up over just under 2 seconds
* The number of pummels
* Energy of the character being held (higher energy means more energy required to hold them)

There is no mashing out of grabs, the grab releases when the grabber runs out of energy.

## Balance
### Carbon
* Side-B forward trajectory now influenced by control stick
* Dair landing lag 17 -> 19 frames

### Silicon
* Can now fall through platforms after up-B
* Second jump of up-B no longer lands, guaranteeing the end hitbox
* Up-B can now glide along the ground
* Knockback increased for: tipper forward-tap, nair, fair, and bair

## Fixes
* Improvements to how grabs and throws are registered by the combo counter
* Fixed minor cosmetic bug when starting a versus game
* Landing logic was improved
* Improved stage collision logic
* Many animations that set as airborne no longer repeatedly land if against the ground (held animations, some specials)
* Fixed most issues with sliding off of moving platforms
* Fixed changing stages in Demo mode not dropping sandbags
* Minor fix to initial fall speed

=====================

# 0.2.13 - Feb 8 2019
Knockback curves and mechanics have been changed by a fair amount. As a result, a lot of moves are probably no longer in the right place balance-wise, so there will need to be another balance iteration.

## Balance
* Knockback and stun are calculated a bit differently, so every move will work slightly differently now
* Airjump recovery window reduced by 2 frames (the time right after double jumping that being hit will replenish the jump)

### Carbon
* Nair cancel 15 -> 12 frames
* Can now fall through platforms after using up-B
* Fair base knockback reduced

### Iron
* Neural-B release hitbox is no longer frame 1
* Grounded up-B starts 2 frames later, hitbubbles changed
* Forward-tap reworked a little bit
* Down-tap startup -2 frames, knockback rescaled
* Nair hitbubbles adjusted drastically
* Nair cancel -2 frames
* Nair IASA improved by 3 frames
* Fair has a new sourspot hitbubble on body
* Bair autocancel and IASA both improved to 6 frames
* Bair range increased slightly

## Fixes
* Reduced volume of clank SFX
* Addressed several bugs with music

## Misc
* `preloadMusic` config option can enabled to load music before game starts, instead of as needed; works around the current long music loading time issue until it's properly fixed
* Characters now flash when parrying
* Added some networking infrastructure that is currently unused by the game, but will be used for online play

=====================

# 0.2.12b - Feb 2 2019
Quick hotfix to fix some bugs.

## Fixes
* Fixed a freeze glitch when a move with bonus lag clanks with a move without bonus lag in a specific port order
* Fixed a cosmetic regression when entering commands in the terminal

=====================

# 0.2.12 - Feb 1 2019
Small side update while working on netplay.

## Fixes
* Added hints that may or may not keep laptops from running Antistatic on integrated graphics when a dedicated card is available
* Fixed console lockup problems with commands that have inadequate error checking

## Misc
* Updated Node to 11.9.0

=====================

# 0.2.11b - Jan 25 2019
Trying out a potential fix for the text rendering bug on Intel integrated graphics. Also, moved readme/etc to root directory.

=====================

# 0.2.11 - Jan 24 2019
Primarily a bug fix patch, but also adds a bit of refinement to several of Carbon and Iron's animations.

## Fixes
* Characters always face inward after being thrown
* Fixed crash that could be caused when editing character files in demo mode
* Redid how character facing and hit angles are calculated to make them more reliable, fixing a handful of random issues

## Misc
* Updated readme a bit

=====================

# 0.2.10
Patch made after first bracket, most notably fixing a major bug with grabs/throws.

## Balance
### Carbon
* Ftap range increased
* Utap strong hit extended by 1 frame
* Dtap late hit hits at higher angle
* Nair second hit range increased
* Bair hitbubbles reworked

### Helium
* Ftilt sped up, less backswing
* Utap backswing increased by 10 frames
* Nair/nair2 ranges improved
* Nair2 less powerful to compensate for improved range
* Dair hitbubbles adjusted
* Fair hitbubbles improved
* Fair has less delay between hits
* Uair hitbubbles improved

### Iron
* Reduced size of ftilt hitbubble

### Silicon
* Dash attack improved slightly
* Ftilt tweaked: early hit (close) now a late KO move
* Tipper bair damage 12 -> 13
* Tipper bair late hit angle 30 -> 50
* Dair hitbubbles improved
* Last hit dair comes out one frame later

## Fixes
* Pummels can no longer be buffered - fixes infinite pummel bug and wasn't really necessary anyway
* Fixed case where throw hitbox wouldn't cause knockdown
* Fixed various weird grab/throw bugs that would completely break them
* Fixed a bug that would cause a character to shoot downward when trying to wavedash near the edge of a platform
* Fixed some cases where throw hits could hypothetically miss

=====================

# 0.2.9
The only major change this mid-week patch is moving from node-usb to directly using libusb from the C side of the engine. This should provide lower input latencies for the native GCN controller adapter support. For future updates, it also allows for easier access to hotplugging APIs and the potential to support more than one adapter.

## Balance
* Hitlag per damage increased by 33%

## Fixes
* Fixed a case where ground animations could be buffered while dropping through a platform

=====================

# 0.2.8
Another quality of life patch, this time mostly driven by the Steam review process, while I work on online play.

## Features
* Pause works again!
* Disconnecting no longer resets port numbers, letting every controller stay where it's at
* Connecting a new controller now takes the lowest available port number
* Disconnecting a controller during a match will automatically pause the game, and no longer removes its character from the battle
* When paused, controller ports can now be changed using the D-pad in an on-screen menu; controllers can drop in and out, as well as cycle through characters without attached controllers, including AI-controlled ones

## Fixes
* Fixed buggy respawn behavior, though respawn effect is now broken
* Rearranged the processing of some things; this might cause bugs in the short term, but it improves internal consistency
* Fixed one of the teleport bugs
* Fixed a possible case of hitlag misbehaving
* Fixed dbg.animations being off by one frame
* Buffering actions no longer delays them by one frame more than necessary
* Fixed potential, though unobserved, errors when accessing port numbers; now only used for display
* Fixed particles potentially persisting after switching screens
* Sandbags no longer spawn before players
* Some text is now centered, instead of being placed awkwardly

## Terminal
* Added `$RANDOM` builtin
* Added `sleep [N/Nms]` command

## Misc
* Updated Node.js to 11.7.0
* Updated TypeScript to 3.2.4

=====================

# 0.2.7
A midweek hotfix update to address some bugs.

## Balance
### Silicon
* Utilt landing lag reduced

## Fixes
* Shows an error dialog if OpenGL 4.3 support is not found before it inevitably crashes
* Point lights should be a bit more efficient, glow radius reduced on some particles
* Optimized diamond rendering (used for the particle system)
* Fixed several crash bugs and other errors when connecting/disconnecting/reconnecting controllers
* Fixed gamepads connecting with the slightest axis movement
* Fixed controller ports that haven't selected a character affecting team colors
* Fixed bugs relating to team colors when selecting characters and connecting controllers
* Now boots characters from battle if their controller disconnects, since there isn't a way to regain control of them yet
* Fixed port numbers getting weird in versus select when disconnecting/connecting controllers

=====================

# 0.2.6
Smaller update this week due to Early Access planning logistics, focusing on bug fixes and quality of life.

## Features
* Audio mute settings now have visual indicators
* 19XX toggle switched to mode dropdown
* 19XX: can grab enemies while they're knocked down
* Keyboard can be connected by pressing any bound key (e.g. the space key)
* Can now exit using a button in-game instead of just by closing the window

## Balance
* A lot of ground movement tweaks
* Overall, characters accelerate faster during dash

### Carbon
* Adjusted dair hitbubbles
* Adjusted dash attack hitbubbles
* Slight nerf to jab
* Dtap has better end hitbubbles
* Utap hitbubbles improved
* Ftilt improved

### Silicon
* Uair improved to link more reliably
* Utilt improved to link more reliably
* Nair animation length reduced, late hit made more useful

## Fixes
* Fixed case where beating Xenon's projectile in a trade would freeze both entities
* Fixed common bug that would cause FFA/Teams to toggle when going from Demo to Versus mode
* Fixed most common cause of TAS mode failing
* Fixed rare case where a character would be warped into Infinity during certain pseudojumps
* Characters can no longer grap while releasing shield
* Addressed mismatch between cursor numbers and player numbers in versus select
* Fixed some cases where powershields would happen when they shouldn't
* Unplugging a controller in Menu now removes all traces of the player

## Misc
* Close button added to Demo mode menu

=====================

# 0.2.5
Big feature for 0.2.5: Regular Gamepads return. That aside, this was largely a cleanup pass, fixing many persistent bugs and increasing consistency.

## Features
* XInput controllers are now supported using a default button mapping - press a button or control stick to connect
* Shields visibly differ more when in lag/stun states
* Tap inputs should feel a bit better now

## Balance
* Dash step window increased by 1 frame
* Parry and power shields now completely nullify hits from objects (projectiles)
* Crouching while undergoing special momentum (knockback, wavedashing) will slow it
* Hits that leave the target grounded have reduced knockback
* Sliding off of platforms after hits no longer leads into tumble

### Carbon
* Tweaked d-tilt

### Iron
* Fixed incorrect early autocancel window

### Silicon
* Fixed Silicon's back throw only working sometimes

## Fixes
* F-tap correctly reverses when buffered
* Fixed dash grabs sometimes working in 19XX mode
* Miscellaneous optimizations relating to dead code
* Fixed knockback not scaling in 19XX mode
* Fixed parries not always working right
* Fixed frame 1 of shield not power shielding
* Fixed very rare case where a character can flatten horizontally
* Fixed cases where hit animations could be teched and cause knockdown
* Fixed bouncing happening at weird times (hit must now have a downard trajectory)
* Fixed swapping stages in Demo mode causing characters to float on platforms that are no longer there
* Fixed entering Demo menu with start causing every character with an associated menu cursor to freeze
* Fixed hits set as strong hits to instead be considered as weak hits (e.g. most throws)

## Misc
* Changes to lighting transparent objects
* Changes to point lighting algorithm - should also reduce performance impact a bit
* SDL event polling happens earlier in the frame - keyboard input should have 1 less frame of lag
* Debug mode renamed to Demo mode
* Brief flash added when fastfalling
* Dimmed hitbubbles a bit
* Hitbubbles now emit light while active
* Parries have a little particle effect
* Ledge option ledge occupancy times now consider IASA frames
* Game now launches even if there are shader compilation errors - looking into weird bug (random prodding at fixing it included)
* When launching, game catches errors spawning the process

## Debug
* AI can now be set to shield all of the time, or shield when an entity gets nearby
* Ledge occupancy constant added: `LEDGE_OCCUPANCY_PERCENT` - e.g. for no ledge animation occupancy, set to 0
* Constant object numeric properties can now be set using hexadecimal (0xabcd) and binary (0b10101) strings
* `dbg performance` now accepts a number or bitmask: for basic performance info, try `dbg performance 0b111`; for everything, use (for example) `dbg performance 0xffff`

=====================

# 0.2.4
## Features
* Characters now flash and emit some sparks when hitstun ends while airborne

## Balance
* Slightly increased hit lag
* Power shielding is now a 2-frame window
* Can drop shield without waiting for shieldup to finish
* Added 5-frame heavy armor window to start of shield drop animation (light parry)
* Quickened all shield drop animations by 2 frames
* Strong knockback threshold reduced to 11 from 15
* Fastfall can be triggered slightly sooner in jump arcs

### Carbon
* New f-tilt
* New down-B: after hitting two enemies, the next attack is more powerful
* Dash attack buffed
* Jab hits 2 frames sooner
* Some miscellaneous animation improvements/changes

### Helium
* Faster fast/fall speeds
* Short hop shortened

### Iron
* Faster fast/fall speeds

### Silicon
* Reduced landing lag of aerials
* Short hop shortened
* Fixed inconsistent double jump heights

## Fixes
* Some things that happened inconsistently on frame 1 should generally work correctly now, but other things could be broken
* Fixed intangibility being 1 frame shorter than it should have been in some cases
* Fixed fastfall speed being reduced in default mode, instead of only 19XX

## Misc
* Reduced dash input buffer window from 4 frames to 2 frames
* Adjusted some stuff related to turnaround/charliewalking

## Debug
* `dbg listhibubbles` shows more data
* `dbg animations` has more room for animation name

=====================

# 0.2.3
## Features
* New fast energy charge mechanic: highlighted area of energy meter after energy is used now regenerates at 2x speed
* Air movement (horizontal and vertical) is changed a bit; jump speeds might need further tweaks to compensate

## Balance
* Shield mechanics changed slightly; attacks now do more damage to shields

### Helium
* Tweaked up-tap

### Xenon
* New up-B: has a delayed jump, aerial version can be canceled early with shield
* Removed up-B charge mechanic to make character less bizarre: no more super double jump, neutral-B now consumes all down-B charges on use instead of having separate charge
* Forward-tap and super forward-tap animations swapped and changed a fair bit
* New super up-tap

## Fixes
* Removed long reverb tail on some SFX

## Misc
* Upgraded Node to 11.5.0
* Various energy settings added to constants

## Debug
* `dbg controllers` now shows button letters, and buttons flash on frame of press

=====================

# 0.2.2
## Features
* Change log and readme now bundles in assets folder
* Entity push happens at the start of frame, and is more consistent (the force that pushes characters apart when they're next to each other; was previously port-dependent in rare circumstances)
* Added SU-style shield tilt (hold both shield buttons to tilt freely)
* Added timer for grabbing ledges after being hit, regardless of animation state

## Fixes
* Stage collision at corners should be reliable now
* Fixed projectiles colliding with the stage causing some very bizarre things most of the time
* Improved consistency of object (projectiles, etc) hitbubbles turning things around
* TAS works sometimes again
* Fixed several stuttery weirdnesses
* Fixed a bug that caused Xenon's alternate animations to not work
* Shield input is now read more reliably, fixing a few weird things with digital/combinations of left/right
* Fixed listHitbubbles being enabled by default
* Fixed some text background alignment issues on right debug column
* Fixed several bugs in `nano` tool
* Xenon's orb now bounces better, except against ceilings

## Misc
* Readme got minor updates
* Animator works again
* Added a v8 flag that might make it play a little nicer
* Tons of code cleanup

## Debug
* New WIP `readme [changelog]` command
* New `camera [freeze | unfreeze | x y z]` command for camera reading/panning
* Disabled debug logging console in production builds
* `dbg drawECB` now draws more useful information
* Added `set-prop` command; e.g. `set-prop dx 10` to set everything to move to the right 10 units/frame, or `set-prop 0 dx 10` to do the same just for entity 0
* Added new constants: `SPECIAL_ENERGY_SCALE` (scales energy cost of special moves), `LEDGE_GRAB_HIT_DELAY` (frames after being hit before being able to grab ledge)

=====================

# 0.2.1
## New Keyboard Controller Layout
Connect with F1.
* WASD - (up/left/down/right) movement
* RFCG - (up/left/down/right) left stick tilt
* J/M - attack/special
* OKL; - (up/left/down/right) c-stick
* H/E - grab
* Shift - hard shield
* 1234 - (up/left/down/right) d-pad
* Backspace - start
* I/P/Space - jump
* Q/' - light shield

Old keyboard controller layout (ESDF) can be used by connecting with F2. Rebindable controls will come in a future release.

## Features
* Changes to dash and fastfall physics in 19XX mode
* Changes to hitstun and hitlag in 19XX mode
* Can toggle the user interface with `dbg drawUI`
* Keyboard controller support added back in, plus new layout

## Fixes
* Fixed crash with certain sound effects (caused a crash sometimes going into Versus)
* Improved stock areas
* Fixed exit code not running on exit; this had caused settings to not save properly between sessions
* Keyboard controller works again (F1/F2 to pick layout)
* Miscellaneous bug fixes

## Misc
* Writes to console when toggling 19XX mode
* Camera zooms out a bit more when there aren't any characters

=====================

# 0.2.0
## Moved to Node+SDL2 from Electron
This is the main marker of this version. Features that formerly relied on Electron had to be written in C:
* A new sound engine, still in progress, using OpenAL-Soft
* The window and keyboard/mouse input are now managed using SDL2
* The graphics engine was rewritten in C and OpenGL 4.3

Non-GCN game controllers have not been ported yet: **the Wii U USB adapter is the only input method supported by this release.** This will be a priority moving forward.

The Linux builds need to pause momentarily, because of time restraints. This is a lower priority, but I hope to bring Linux support back before too long.

Over 10% of the codebase is now C, so this is has been a substantial undertaking for just a few months. Hopefully there aren't many bugs that I have yet to discover, and the transition away from Electron can be smooth.

**Antistatic's official Early Access launch date is currently set to January 24th, 2019**. If it worries you that it's so soon, I agree.

## Features
* Exclusive fullscreen using adaptive vsync (if available): toggle with alt+enter or F11. Significantly reduces input lag in my testing
* Electron has been replaced by Node + SDL2 (via napi).

## Balance
* Tweaks to ground movement, again (particularly improves fox-trotting)

### Silicon
* Up-B distance in both jumps is tied to tilt distance, ledge grab rules changed (snaps less)
* Shine now has intangibility instead of invincibility
* Up-tap hitbubbles modified
* Nair hitbubbles adjusted
* Uair land cancel changed slightly

## Fixes
* Removed jitteriness caused by a slight sub-frame desync between the gameplay and graphics engine was fixed

## Misc
* Several changes to colors/styles
* Various graphical adjustments
* No longer uses asconfig.json

=====================

# 0.1.0
## Features
* Trying a new controller polling timing that may reduce input lag on some setups
* Charlie walking is now a viable mode of transport
* Rewrote a lot of dash/run/related code to improve handling and fix some buggy behavior
* Faster fallers get hit more upward when hit horizontally
* Huge redesign of damage/stocks area
* Point lighting added, being used a little for particle effects
* Animations can now use non-linear easing
* Camera movement improved a bit
* Lots and lots of general improvements to particles and particle physics
* Several new particle effects
* KO particles are now physical particle vomit
* Lots of rendering optimizations
* Improved anti-snapback a bit
* Training display added (`dbg training` details below)

## Balance
* Base hit lag reduced
* Tweaks to hit stun calculation

### Everyone
* Improvements to air speed
* Changes to shield sizes

### Silicon
* Nair buffed
* Bair now hits at 50 degree angle

### Carbon
* General animation polish
* Utilt early hits widened
* Fair: buffed
* Bair buffed
* Uair buffed
* Dair buffed, and first hit now hits inward
* New two-hit nair
* New WIP down-B
* New WIP neutral-B
* New dash attack

### Iron
* Uair buffed
* Dair reworked
* Reduced arc speed (knockback fall speed) to be closer to regular fall speed

### Helium
* New dash attack, with usable DACUS input
* Nair2 buffed
* Bair BKB 4 -> 2
* Fair links better
* Reduced arc speed to be closer to fall speed

## Fixes
* Reduced some input lag via Chromium flag changes, especially on some Linux setups
* Fixed some peter panning on shadows
* 0 BKB bubbles properly draw angles
* Heartbeats bug out less
* Sandbags now DI all of the time like they should, instead of maybe sometimes
* Fixes to SDI/ASDI/hit nudge

## Misc
* Keyboard controls: `w` now light shields
* Animator removed from normal build
* Lots of animator improvements
* Moved to Electron 3.0.0-beta.8
* Down-tap triggers slightly more easily

## Debug/Console Features
* FPS/frame timings hidden by default; `dbg performance` now shows them and much more detailed performance metrics
* Performance metrics will sometimes use microseconds when number of nanoseconds is very small
* `set-stocks [n]` command added
* `/home/startup` runs on game launch
* `/home/[debug|versus|battle]_start` run when entering debug, versus select, and battle (a match), respectively
* No longer clobbers a bunch of random files on filesystem version change
* `dbg freezePhysicsParticles` will freeze all physics particles
* Rough snapshot save/restore using `v` and `b` keys respectively
* `dbg training` command added for lots of training stats: knockback curves, combo counter, combo timing info (late/early frame numbers), hitbubble info, and some other stuff; will add more to this later
* Tip: to always enable training mode when in debug mode, include `dbg training on` in `/home/debug_start`

=====================

# 0.0.5
## Features
* Major movement overhaul; momentum carries way more, tons of other changes
* Dash acceleration is delayed, making for more consistent moonwalking
* Blinn-Phong-style shading added
* Update to Electron 3.0.0 beta-3
* Configuration/FS now stored in a more normal config location
* Versus screen has audio settings now
* Increased momentum control for all jumps/airjumps

## Balance
Pretty big animation patch. Following are changes of particular interest.

### Silicon
* Down-tap buffed

### Carbon
* Horizontal up-B travels further forward

### Helium
* Faster fall speed
* Aerials rebalanced quite a bit

## Fixes
* Sandbags can use up-B again
* Sandbags jump a little (not much, really) smarter
* Can no longer ride moving platforms through walls by using a move that prevents slipping
* Game can now start with sandbags and one player
* Horizontal and vertical taps are a bit different
* Fixed some characters not being able to input an aerial on first frame after leaving ground from a jump
* No longer crashes on Windows when adapter was already in use, and logs to console if there were problems
* Music volume decreased a bit

## Debug Features
* `dbg drawBuffers` can be used to show gbuffer
* Electron flags can now be set dynamically via `asconfig`
* `gfx [setting] [value]` command added to manage graphics settings (only vsync and framerate limit for now)
* Can set default debug mode character with `defaultCharacter` setting

=====================

# 0.0.4
## Features
* New graphics engine, built more reasonably and with the foundation and flexibility for more visual effects later
* New, much more flexible color style system using a custom scripting language which is overkill for this purpose
* Dash inputs now have 4 frame window
* L-canceling takes much less energy, but has longer delay before energy can charge again
* Ruins model changed a bit
* Shield grabbing is slower by 3-5 frames depending on character (will trigger after shield up animation, which is 6 frames)
* Can start directly into animation tool with `animator` flag (probably doesn't work in non-dev build right now)
* Moved to Electron 3.0 beta

## Balance
### Silicon
* Up-air first hit auto-cancels (6 frames of lag) and can be used as a combo tool
* Up-tap tipper requires less surgical precision
* Start of new side/up/down-B animations
* Up-B jump hitbubble nerfed significantly
* Changes to jump animations
* New bair
* Nair range extended
* Dair rebalanced

### Carbon
* Slower fall speed
* New dair
* Bair tweaked

### Xenon
* May have overbuffed aerials
* No longer accidentally has machinegun grab
* Turnaround jump deadzone widened somewhat

### Helium
* Turnaround jump deadzone widened somewhat
* Quick animation pass to reduce hideousness
* Bair and fair have longer startup
* Down-B nerfed

### Iron
* Bair sped up
* Dair retains spike hitbubble
* Uair hitbubble improved
* Down-B rebalanced
* Up-B has a hitbubble gap between start and movement

## Fixes
* Gamecube analog input fixed to not be half range
* Fixed down-tap on fallthroughable platforms needing frame-perfect precision
* Free camera is less prone to not doing what you want it to
* Fixed a bug where characters could get stuck against walls after being hit
* Fixed characters slamming into walls when they aren't suffering from knockback
* Fixed several bugs relating to A/SDI
* Can now jump cancel grab with shield+attack (L/R+A) instead of only using grab (Z)
* Silicon's up-B moves better on the ground, and possibly any other similar moves

=====================

# 0.0.1 -> 0.0.3
## Features
* Lots of console changes, and debug console info is now in the readme
* Color system backend changed out to be much more flexible
* Start of work on character styles (more features coming to this next build)
* Characters flip on the Z-axis when turning, instead of just mirroring left/right
* Shields are somewhat prettier
* Hitbubbles are subjectively prettier
* Hit sparks are a little less intense
* Particle trails during hit stun behave more like a trail
* Some Chromium flags are now being used to try to improve stability on some platforms.
* Misc. backend improvements

## Fixes
* Fixed dash behaving weird after dashpivot is unceremoniously interrupted
* Fixed potential bug that could cause music to double up
* Fixed weird bug where u/d tilt could turn one way when holding straight up/down depending on controller calibration
* Fixed bug where physics particles would appear and get stuck in the middle of the stage

=====================

# 0.0.0 -> 0.0.1
## Features
* Toggle fullscreen with F11 or Alt+Enter
* Reload game with F5
* Open developer tools with F12
* `on` can be used as boolean text in console

## Balance
* Many moves have less backswing (time after hitbubble ends)
* Fixed being unable to reverse utilt without turning first
* Dash and run stop lag reduced across the board
