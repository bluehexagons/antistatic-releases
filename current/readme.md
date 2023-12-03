# Setting up from source
Note: Currently, Antistatic's source code is not publicly available.

cd into scripts directory
Run get_dependencies.sh
Run buildvorbisfile.ps1 in VS developer command line
Run install_dependencies.sh
cd back
npm install
npm compile
Make sure that the app/assets/ftl submodule (language files, CC on Github) has been pulled too, because otherwise the game will crash on launch
npm start


# Status
This readme was last updated January 2019, and is outdated with regard to game mechanics.

For a current guide, visit the online guide: https://bluehexagons.com/antistatic/guide.html

# Setup
If playing a standalone build, you may need to install the redistributable dependencies. Steam should install them automatically. These installers can also be downloaded directly from their respective websites:
* OpenAL: https://www.openal.org/downloads/oalinst.zip
* Microsoft Visual C++ 2015-2019 runtime: https://aka.ms/vs/16/release/vc_redist.x64.exe

Run the standalone version using `Antistatic.bat`

Until there's a proper graphics menu, the alt+enter and F11 keyboard shortcuts work to toggle exclusive fullscreen.

# Controllers
Button/key rebinding is planned to come soon, as well as support for additional controllers.

To get the GameCube controller USB adapter to work on Windows, Zadig must be used to install a generic driver; see: https://wiki.dolphin-emu.org/index.php?title=How_to_use_the_Official_GameCube_Controller_Adapter_for_Wii_U_in_Dolphin

If you can already use it in Dolphin, it should work in Antistatic too. In the future, this process might be an option during installation of the game.

# Terminology
* L-canceling = lag-canceling
* (A)(S)DI = (automatic) (shift) directional influence
* Pseudojump = special that jumps, but depletes its recovery the more it's used since touching ground
* Tap move = smash attack; quickly tap the control stick and press the attack button, holding attack will charge it

# Mechanics compared to Smash
## Similar
* Lag-canceling (50% landing lag); costs energy to perform based on move's landing lag
* Wave dashing; air dodges behave like Melee
* Reverse aerial rush possible during initial dash, but not during run
* Moonwalking
* Ledge mechanics, including C-stick options and 100%+ animations
* DI/SDI/ASDI
* Grabs, throws
* Hit stun is similar to Melee
* Teching (wall, ground, ceiling)
* Shields, light shields, shield dropping; free shield tilt with L+R
* Wall jumping
* Powershield and parry (see differences)
* All throws can be buffered with C-stick (not just down throw)
* Shield options can be buffered with C-stick
* V-canceling
* Throws use a set weight
* Crouch canceling (nerfed a fair bit compared to Melee)

## Differences
* Most specials require energy to use, based on the amount of impact they have
* Initial dash can be canceled on first frames
* Holding consumes energy, grabs cannot be mashed out of
* Certain moves that hit upward (up throws, etc) can be DIed further sideways as they become more stale
* Ledge invincibility becomes shorter the more times the ledge is regrabbed
* If two characters grab simultaneously, they will cancel out
* Powershield can be triggered frames 1-2 with a digital press
* Powershield cannot reflect projectiles, still takes heavy stun but removes light stun
* Dropping shield triggers a 5-frame parry window that grants special super armor, but doesn't cause extra lag on attacker or block damage
* If hit during first few frames of a double jump, jump will be refreshed
* Dodge panic: pressing grab (Z) during air dodge will cancel movement into a stall that can grab ledge after a delay
* Command shield drop with B+down

### Shields and Energy
* Powered by energy meter
* More HP
* Regenerate slower
* When shield breaks, character crumples and falls to the ground
* Shield stun has two phases: heavy (full) stun, and light stun
* During light shield stun, character can spot dodge and roll
* Heavy stun lasts a similar amount of time to Melee shield stun
* Light shield stun lasts a similar amount of time to Smash 64 shield stun
* Lag-canceling can be performed regardless of how much energy is available and will consume energy down to 0, but delays energy charging for a several frames
* Specials cannot be used with insufficient available energy
* Holding after a grab consumes energy, and will release when energy reaches 0
* There is a lighter-colored fast-charge zone on the energy meter that gets set to the last used chunk of energy

# Characters
Statuses reflect a general idea of how far along a character's design and identity are implemented, as well as compared to the current standard of polish

If an animation is referred to as missing or non-final, it's functional but may not visually make sense

## Silicon
Status: 90% done

Quick, mobile fastfaller with a lot of combo setups but generally low KO power

Compare to Fox, Sheik, Marth

### Specials
Up
* Always does two jumps
* Jump distance and angle are based on stick tilt; holding stick neutral stays in place
* First jump has a hit, second jump ends in a hit

Side
* Pseudojump
* Can be angled up (bounce)/side/down
* Applies a status that hits several times after a short delay
* If shield is activated during status, all hits trigger instantly and can be powershielded

Down
* Shine, but no reflector
* Frame 1 hit w/ intangibility
* Jump-canceleble on frame 4
* Can turn around during animation

Neutral
* Laser; can be land-canceled, does little damage but causes flinching

### Advice
* Space with fair, lasers can be used to apply pressure
* KO with tipper bair, early nair, forward tap, up tilt, early forward tilt
* Late KO with up air, forward throw, down tap, up tap
* Combo with shine, down tilt, down throw, up throw, jab 1/2, dair, late nair
* Jab sets up for KOs at high percents
* Waveshine semi-reliably combos into grabs and moves

## Carbon
Status: 80% done, still has several placeholder animations

High ground movement speed, powerful aerials and taps

Compare to Falcon, Ganon

### Specials
Up
* Inspired by Marth up-B
* Quick upwards burst
* Reversible
* Can go vertically, or a little diagonally if holding sideways
* If backward is held at the end of the animation, character will turn around

Side
* Bodyslam
* Can grab ledge during very start of fall
* Replenishes double jump

Down
* After hitting two opponents, the next time the attack is used it will trigger a stronger version
* E.g. hit one opponent twice, next use is super; whiffing the super version resets the counter

Neutral
* Hold for multiple hits attacking from top to bottom

### Advice
* Space with bair, nair
* KO with tipper fair, tipper up air, second hit up air, dair, up tap, down tap
* KO late with down tilt, bair,
* Combo with first hit up air, down tilt, forward throw, up throw, forward tilt, reverse hit back air
* Last hit of dair is a spike; can be used as a bounce combo setup, or KO

## Iron
Status: 50%; unpolished, few final animations

Heavy-hitter, sturdy, and somewhat sluggish

Compare to Ganon, Bowser

### Plans
* Down special will be replaced, neutral special may be reworked a bit

### Specials
Up
* Goes up and forward a long distance
* Holding B will cause it to go more straight up, but not as high

Side
* Pseudojump
* Can be angled up/down
* Hurtbubble extends before hitbubble

Down
* Getting replaced
* Just a slow strong hit
* Gives a small amount of horizontal momentum

Neutral
* Will be reworked
* Hold to become a trap, release to attack
* Gives upward boost when attacking
* Can grab ledge

### Advice
* Space with bair, uair, jab, ftilt
* Cross-up with nair
* Poke with up air, side special
* Combo with up air, up tilt, dair, forward throw
* KO with fair, uair, dtilt
* Late KO with nair, forward tap, up tap
* Second-hit up air is semi-spike

## Helium
Status: 50%

High air speed, initial dash is faster than run speed; has multiple air jumps

Compare to Jigglypuff, Pit

### Specials
Up
* Consumes double jumps, can be triggered multiple times
* Reversible
* Slightly better recovery per jump than normal air jumps, but ends in freefall

Side
* May be reworked or replaced
* Pseudojump
* Multi-hit; first hit triggers behind and can be used as a single hit

Down
* Recovery move, inspired by Bouncing Fish
* Bounces back on hit with significantly less lag

Neutral
* Hits where the control stick is pointing when the hitbubble comes out

### Advice
* Nair has an optional second hit if A is pressed at the end of the animation
* Up throw leaves open to counter attacks, but does high damage
* Space with fair, bair
* Combo with dair, up air,
* Back hit of up air always pulls forward, can be used to drag off stage
* KO with bair, nair 2, dtap, gimps, forward tap
* Late KO with utilt, second hit uair
* Charging forward tap will slide forward further
* Utilt has a spike at the end of its animation

# Prototype Characters

## Xenon
Status: 20%, all animations are rough placeholders
Weird, over-complicated character; double jump cancels, lots of mechanics

Compare to Yoshi, Mewtwo, Robin

### Plans
* Might make more straightforward to use

### Specials
Up
* Short, delayed hop with a hitbubble
* Can be ended early by pressing shield, but still ends helpless
* Can grab ledge during animation

Side
* Shoots a slow projectile
* Projectile can be angled up or down
* If projectile is out, using move will teleport to the projectile
* Projectile bounces off of walls and shields
* Currently has bugs with ceilings (gets stuck)

Down
* Builds charges (up to 6) for variant tap moves, adding a charge creates a hitbubble
* Can be canceled with shield
* When there is a charge available for variant taps, all taps get replaced with slightly different moves and consume a charge

Neutral
* When uncharged, gives short burst (4 frames) of strong armor (other notes are for charged version)
* If used while any charges are available, it will consume all of them for its charged version
* Maintains strong armor for 4 seconds
* Can be canceled into side-special (projectile or teleport), shield, jumps, or ended with shield hard press in air

### Advice
* Poke with fair, bair, dtilt
* Approach with nair
* Combo with up air, dair, bair, up tilt, normal up tap, tipper fair (low percents), up throw, first hit nair
* KO with tipper fair, tipper ftilt, super forward tap, last charge hit of down special
* KO late with sourspot fair, variant down tap, variant up tap, variant forward tap, up air, forward tilt, normal down tap, up air
* Down tilt is a set-knockback semi-spike
* Up special hitbubble is also a set-knockback semi-spike
* Back air hits in several angles over the course of its animation
* Down throw tech chase

### Double jump
* Can instant land at the start (similar to Yoshi, Peach)
* Loses momentum at the end of the animation, so can gain extra height by using an aerial late (similar to Mewtwo)
* Can grab ledge with initial turnaround (similar to Yoshi)
* Has strong armor for a few frames at the start of the animation

# Stages
## Inspired by Smash games
* Longboat = Final Destination
* Ruins = Battlefield
* Transistor = Yoshi's Story (no cloud or Flyguys)
* Boombox = Dream Land (no wind)
* Scales = Neutral Pokemon Stadium
* Fountain = Fountain of Dreams (no movement)
* Crossing = Smashville

## Original
* Great White - can pass upward through the thin center of the stage
* Eroded - 2-platform stage with a platform similar to cloud, but doesn't move up/down

## Prototypes
* Divided - has a lump in the middle, and two platforms per side
* Plane - low top platform, side platforms stick out a bit

## Misc
* Pillars - Two tall pillars with a center platform
* Satellite - Small main stage, big side platforms with stage piece on outer side
* Debug - Test stage for collision, etc

# Console and debug
The console can be accessed with the `Enter` key.

Underlying the console, there's a basic file system structure, and a simple environment inspired by Linux. The shell and scripting language are inspired by Bash. There's a bunch of nerdy stuff for anyone who wants to poke around with it, though it isn't finished yet.

Useful commands:
* `config`: displays and allows setting of global config options, like audio/music. Settings might appear here before there's a UI for them.
* `tas`: starts recording a replay one frame at a time; `z` on the keyboard advances a frame. Can also use `x` on keyboard to start a TAS. Use `tas` command again to stop. Not guaranteed to be bug-free, as it doesn't restore many things that it really should to make working, consistent replays.
* `replay`: starts recording a replay in real time. Use `replay` command again to stop. Not guaranteed to be bug-free, either.
* `play`: plays last-recorded TAS or replay.
* `pause`: pauses replays currently playing.
* `set-dmg [n]`: sets damage of all characters.
* `sb-dmg [n]`: sets damage of all sandbags.
* `unstale`: unstales all moves.
* `dbg`: check and set debug variables; list all with `dbg`, set with e.g. `dbg controllers on`.
* `ai`: check and set ai variables.
* `constants`: check and set constants, in case you've always wanted to see what 3x knockback looks like. (`constant KNOCKBACK_MOD 3`)
